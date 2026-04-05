import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/public/feed-by-slug?slug=ai-safety — get items from a public feed by slug
 * Used for myfeed.space/<slug> URLs
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const supabase = getSupabase();

  // Find feed by slug — must be public and active
  const { data: feed } = await supabase
    .from("feeds")
    .select("id, name, query_text, description, slug, is_public, user_id, profiles!inner(name, email)")
    .eq("slug", slug)
    .eq("is_public", true)
    .eq("is_active", true)
    .single();

  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 100);
  const cursor = req.nextUrl.searchParams.get("cursor");

  let query = supabase
    .from("feed_items")
    .select("id, title, url, summary, source, image_url, published_at, relevance_score")
    .eq("feed_id", feed.id)
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

  const profile = feed.profiles as unknown as { name: string | null; email: string } | null;

  return NextResponse.json({
    feed: {
      id: feed.id,
      name: feed.name,
      description: feed.description || feed.query_text,
      creator: profile?.name || profile?.email?.split("@")[0] || "Anonymous",
      followers: 0,
    },
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
