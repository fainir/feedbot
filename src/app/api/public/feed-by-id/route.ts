import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/public/feed-by-id?id=UUID — get items from a public feed
 * Only works for feeds with is_public=true
 */
export async function GET(req: NextRequest) {
  const feedId = req.nextUrl.searchParams.get("id");
  if (!feedId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = getSupabase();

  // Verify feed is public
  const { data: feed } = await supabase
    .from("feeds")
    .select("id, is_public")
    .eq("id", feedId)
    .single();

  if (!feed || !feed.is_public) {
    return NextResponse.json({ error: "Feed not found or not public" }, { status: 404 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 100);
  const cursor = req.nextUrl.searchParams.get("cursor");

  let query = supabase
    .from("feed_items")
    .select("id, title, url, summary, source, image_url, published_at, relevance_score")
    .eq("feed_id", feedId)
    .order("published_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("published_at", cursor);
  }

  const { data: items } = await query;
  const results = items || [];

  // Deduplicate
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped = results.filter((item) => {
    const normUrl = item.url.split("?")[0].split("#")[0].replace(/\/+$/, "");
    if (seenUrls.has(normUrl)) return false;
    seenUrls.add(normUrl);
    const titleKey = (item.title || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).slice(0, 8).join(" ");
    if (seenTitles.has(titleKey)) return false;
    seenTitles.add(titleKey);
    return true;
  });

  const hasMore = deduped.length > limit;
  const page = hasMore ? deduped.slice(0, limit) : deduped;

  return NextResponse.json({
    items: page.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      source: item.source,
      url: item.url,
      image_url: item.image_url,
      publishedAt: item.published_at,
    })),
    hasMore,
    nextCursor: hasMore ? page[page.length - 1].published_at : null,
  });
}
