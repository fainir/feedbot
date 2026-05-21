/**
 * Cache warming — called from the scan-and-match cron after new articles
 * are classified. We pre-populate Redis (and the route-handler L1) for the
 * 14 system feeds + the top-followed community feeds so the first real
 * visitor in the next 60s window gets a HIT instead of paying the
 * Supabase round-trip.
 *
 * Implementation: just `fetch()` each public feed URL with a tiny query
 * string. The route handler does the heavy work and writes to cache as a
 * side effect of serving the response — we don't reach into the cache
 * directly, which keeps the warmer agnostic to the cache backend.
 */

import { getServiceClient } from "@/lib/supabase";

// Same list as src/app/[feed]/layout.tsx TABS keys. Keeping the data
// source-of-truth out here would mean importing the layout module from
// a worker context — not worth it. If you add a new system feed, add
// it here too.
const SYSTEM_FEED_QUERIES: Array<{ id: string; q: string }> = [
  { id: "ai", q: "AI & ML" },
  { id: "tech", q: "Tech News" },
  { id: "startups", q: "Startups" },
  { id: "dev", q: "Dev" },
  { id: "science", q: "Science" },
  { id: "crypto", q: "Crypto" },
  { id: "design", q: "Design" },
  { id: "security", q: "Security" },
  { id: "gaming", q: "Gaming" },
  { id: "business", q: "Business" },
  { id: "space", q: "Space" },
  { id: "health", q: "Health" },
  { id: "open-source", q: "Open Source" },
  { id: "robotics", q: "Robotics" },
  { id: "energy", q: "Energy" },
];

const TOP_COMMUNITY_LIMIT = 20;

function getBaseUrl(): string {
  // Loopback to ourselves — same Railway container handles the cron tick and
  // the warm fetch, so we avoid DNS / TLS / public-edge overhead by hitting
  // 127.0.0.1 directly. Saves ~50-150ms per URL warmed.
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

async function warmOne(url: string): Promise<{ url: string; status: number; xcache: string }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return {
      url: url.replace(/^https?:\/\/[^/]+/, ""),
      status: res.status,
      xcache: res.headers.get("x-cache") || "?",
    };
  } catch (e) {
    return { url, status: 0, xcache: `error: ${(e as Error).message}` };
  }
}

export async function warmFeedCache(): Promise<{
  warmed: number;
  hits: number;
  results: Array<{ url: string; status: number; xcache: string }>;
}> {
  const base = getBaseUrl();

  // System feeds
  const systemUrls = SYSTEM_FEED_QUERIES.map(
    (f) => `${base}/api/public/feeds?q=${encodeURIComponent(f.q)}&limit=50`,
  );

  // "All" / For You blend
  const allUrl = `${base}/api/public/feeds?q=all&limit=50`;

  // Top community feeds by view count
  const supabase = getServiceClient();
  const { data: communityFeeds } = await supabase
    .from("feeds")
    .select("slug, views")
    .eq("is_public", true)
    .eq("is_active", true)
    .not("slug", "is", null)
    .order("views", { ascending: false })
    .limit(TOP_COMMUNITY_LIMIT);

  const communityUrls = (communityFeeds || [])
    .filter((f) => !!f.slug)
    .map((f) => `${base}/api/public/feed-by-slug?slug=${encodeURIComponent(f.slug!)}&limit=50`);

  const urls = [allUrl, ...systemUrls, ...communityUrls];

  // Run all in parallel; bounded by Next.js fetch pool but ~35 URLs is fine.
  const results = await Promise.all(urls.map(warmOne));
  const hits = results.filter((r) => r.xcache.startsWith("HIT")).length;
  return { warmed: results.length, hits, results };
}
