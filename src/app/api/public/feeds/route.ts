import { NextRequest, NextResponse } from "next/server";
import { discoverFeeds } from "@/lib/feed-engine";

// In-memory cache: same query → cached for 30 min
// 100 users requesting "tech news" = 1 RSS fetch, not 100
const cache = new Map<string, { items: unknown[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ error: "q required" }, { status: 400 });

  const key = query.toLowerCase().trim();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ items: cached.items, cached: true });
  }

  try {
    const items = await discoverFeeds(query);
    const mapped = items.slice(0, 25).map((item, i) => ({
      id: String(i),
      title: item.title,
      summary: item.summary,
      source: item.source,
      url: item.url,
      publishedAt: item.published_at,
    }));

    cache.set(key, { items: mapped, timestamp: Date.now() });

    // Evict stale entries
    for (const [k, v] of cache) {
      if (Date.now() - v.timestamp > CACHE_TTL * 2) cache.delete(k);
    }

    return NextResponse.json({ items: mapped, cached: false });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
