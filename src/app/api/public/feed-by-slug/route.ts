import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cacheGet, cachePut } from "@/lib/cache";
import { isLowQualityItem, sanitizeSummary, sourceKey } from "@/lib/content-quality";
import { extractTitleSource } from "@/lib/source-info";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Two-tier cache: L1 in-memory + L2 Redis. See src/lib/cache.ts.
// Server-side TTL is 40min — longer than the 30min cron interval so the
// next cron warm always overwrites the existing entry before it expires.
const TTL_MS = 2_400_000;
const CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

function cacheKey(req: NextRequest): string {
  const p = req.nextUrl.searchParams;
  return "slug:" + [p.get("slug") ?? "", p.get("cursor") ?? "", p.get("limit") ?? ""].join("|");
}

/**
 * GET /api/public/feed-by-slug?slug=ai-safety — get items from a public feed by slug
 * Used for myfeed.space/<slug> URLs
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const key = cacheKey(req);
  const cached = await cacheGet(key);
  if (cached) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: { ...CACHE_HEADERS, "X-Cache": `HIT-${cached.tier}` },
    });
  }

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
    // Over-fetch so the junk filter + diversity cap below still leave a full page.
    .limit(Math.min(limit * 3, 150));

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

  // Community/custom feeds skipped the cron quality gate for rows already in
  // feed_items — enforce junk/scam filtering + per-source diversity here so
  // one platform (e.g. *.medium.com) can't dominate the page.
  const cleaned = deduped.filter((item) => !isLowQualityItem(item.title, item.source || "", item.url));

  // ── Story clustering: group similar titles, keep best + track related ──
  type ClusteredItem = (typeof cleaned)[number] & {
    _related?: { title: string; url: string; source: string; publishedAt: string }[];
  };
  const clusters: ClusteredItem[] = [];
  const clusterKeys = new Map<string, number>();
  const CLUSTER_STOPS = new Set(["this","that","with","from","have","been","will","they","their","about","what","when","which","these","those","would","could","should","here","there"]);
  for (const item of cleaned) {
    const words = (item.title || "").toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !CLUSTER_STOPS.has(w))
      .slice(0, 5);
    const key = words.join(" ");
    if (key.length < 8) { clusters.push(item); continue; }
    let matched = false;
    for (const [existingKey, idx] of clusterKeys) {
      const existingWords = existingKey.split(" ");
      const overlap = words.filter((w: string) => existingWords.includes(w)).length;
      if (overlap >= 3) {
        const score = (item.relevance_score || 0);
        const existingScore = (clusters[idx].relevance_score || 0);
        const winner = score > existingScore ? item : clusters[idx];
        const loser = score > existingScore ? clusters[idx] : item;
        const existing = clusters[idx]._related || [];
        existing.push({ title: loser.title, url: loser.url, source: loser.source || "", publishedAt: loser.published_at });
        clusters[idx] = { ...winner, _related: existing };
        matched = true;
        break;
      }
    }
    if (!matched) { clusterKeys.set(key, clusters.length); clusters.push(item); }
  }

  const maxPerSource = Math.max(3, Math.ceil(limit * 0.2));
  const srcCounts = new Map<string, number>();
  const diversified = clusters.filter((item) => {
    // Key off the real publisher (top-up rows store the query as `source`).
    const k = sourceKey(extractTitleSource(item.title) || item.source || "");
    const c = srcCounts.get(k) || 0;
    if (c >= maxPerSource) return false;
    srcCounts.set(k, c + 1);
    return true;
  });

  const hasMore = diversified.length > limit;
  const page = hasMore ? diversified.slice(0, limit) : diversified;

  const profile = feed.profiles as unknown as { name: string | null; email: string } | null;

  const body = JSON.stringify({
    feed: {
      id: feed.id,
      name: feed.name,
      description: feed.description || feed.query_text,
      creator: profile?.name || profile?.email?.split("@")[0] || "Anonymous",
      followers: 0,
    },
    items: page.map((item) => {
      const out: Record<string, unknown> = {
        id: item.id,
        title: item.title,
        summary: sanitizeSummary(item.summary),
        source: item.source,
        url: item.url,
        image_url: item.image_url,
        publishedAt: item.published_at,
      };
      if (item._related && item._related.length > 0) {
        out.relatedCount = item._related.length;
        out.related = item._related.slice(0, 5);
      }
      return out;
    }),
    hasMore,
    nextCursor: hasMore ? page[page.length - 1].published_at : null,
  });

  void cachePut(key, body, TTL_MS);
  return new NextResponse(body, {
    status: 200,
    headers: { ...CACHE_HEADERS, "X-Cache": "MISS" },
  });
}
