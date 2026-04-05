import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";
import { refreshFeed } from "@/lib/feed-engine";
import { scoreArticles, preFilterArticles } from "@/lib/ai-matcher";
import { rateLimit, getClientKey } from "@/lib/rate-limit";
import type { Feed } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 10 refreshes per minute per IP (each triggers outbound HTTP)
  const rl = rateLimit(`refresh:${getClientKey(request)}`, { limit: 10, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many refresh requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: feed, error: feedError } = await supabase
    .from("feeds")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (feedError || !feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  let newItems: Awaited<ReturnType<typeof refreshFeed>>;
  try {
    newItems = await refreshFeed(feed as Feed);
  } catch {
    return NextResponse.json(
      { error: "Failed to refresh feed" },
      { status: 502 }
    );
  }

  if (newItems.length > 0) {
    const existingUrls = new Set<string>();

    const { data: existingItems } = await supabase
      .from("feed_items")
      .select("url")
      .eq("feed_id", id);

    if (existingItems) {
      for (const item of existingItems) {
        existingUrls.add(item.url);
      }
    }

    const uniqueNewItems = newItems.filter(
      (item) => !existingUrls.has(item.url)
    );

    if (uniqueNewItems.length > 0) {
      // AI score to filter out irrelevant results
      const poolFormat = uniqueNewItems.map((item, i) => ({
        id: String(i),
        title: item.title,
        summary: item.summary,
        source: item.source,
        url: item.url,
      }));
      const plan = (feed as Record<string, unknown>).search_plan as import("@/lib/prompt-intelligence").SearchPlan | null;
      const preFiltered = preFilterArticles(feed.query_text, poolFormat, plan);
      const scored = await scoreArticles(feed.query_text, preFiltered, plan);
      const relevantIds = new Set(scored.filter((s) => s.score >= 70).map((s) => s.id));
      const scoreMap = new Map(scored.map((s) => [s.id, s.score]));

      const qualityItems = uniqueNewItems.filter((_, i) => relevantIds.has(String(i)));
      const rows = qualityItems.map((item, i) => ({
        feed_id: id,
        title: item.title,
        url: item.url,
        summary: item.summary,
        source: item.source,
        image_url: item.image_url,
        published_at: item.published_at,
        relevance_score: scoreMap.get(String(uniqueNewItems.indexOf(item))) || 70,
      }));

      const { error: insertError } = await getServiceClient()
        .from("feed_items")
        .insert(rows);

      if (insertError) {
        // Insert failed — error details captured by Vercel runtime
        return NextResponse.json(
          { error: "Failed to store new items" },
          { status: 500 }
        );
      }
    }

    await supabase
      .from("feeds")
      .update({ last_refreshed_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({
      refreshed: true,
      new_items_count: uniqueNewItems.length,
      items: uniqueNewItems,
    });
  }

  await supabase
    .from("feeds")
    .update({ last_refreshed_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({
    refreshed: true,
    new_items_count: 0,
    items: [],
  });
}
