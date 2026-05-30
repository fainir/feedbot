import RssParser from "rss-parser";
import type { Feed, FeedItem } from "@/types/database";
import type { getServiceClient } from "@/lib/supabase";
import { preFilterArticles } from "@/lib/ai-matcher";

const rssParser = new RssParser({
  timeout: 10_000,
  headers: {
    "User-Agent": "MyFeed/1.0 (RSS Aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

interface DiscoveredItem {
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url: string | null;
  published_at: string;
}

function queryToSearchTerms(query: string): string[] {
  const base = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "need", "must",
    "i", "me", "my", "we", "our", "you", "your", "about", "latest",
    "recent", "new", "news", "updates", "show", "find", "get",
  ]);

  const terms = base
    .split(" ")
    .filter((w) => w.length > 1 && !stopWords.has(w));

  return terms.length > 0 ? terms : base.split(" ").filter((w) => w.length > 1);
}

function buildGoogleNewsUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
}

function buildCommonRssUrls(terms: string[]): string[] {
  const topic = terms.slice(0, 3).join("-");

  return [
    `https://hnrss.org/newest?q=${terms.join("+")}`,
    `https://medium.com/feed/tag/${topic}`,
    `https://dev.to/feed/tag/${topic}`,
  ];
}

function extractImageUrl(item: RssParser.Item): string | null {
  const mediaContent = (item as Record<string, unknown>)["media:content"] as
    | { $?: { url?: string } }
    | undefined;
  if (mediaContent?.$?.url) return mediaContent.$.url;

  const enclosure = (item as Record<string, unknown>).enclosure as
    | { url?: string; type?: string }
    | undefined;
  if (enclosure?.url && enclosure.type?.startsWith("image")) {
    return enclosure.url;
  }

  const content = item.content || item.contentSnippet || "";
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch?.[1]) return imgMatch[1];

  return null;
}

async function fetchRssItems(url: string): Promise<DiscoveredItem[]> {
  try {
    const feed = await rssParser.parseURL(url);
    const sourceName = feed.title || new URL(url).hostname;

    return (feed.items || []).map((item) => ({
      title: item.title || "Untitled",
      url: item.link || url,
      summary: summarizeItem(
        item.title || "",
        item.contentSnippet || item.content || ""
      ),
      source: sourceName,
      image_url: extractImageUrl(item),
      published_at: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export function summarizeItem(title: string, content: string): string {
  const text = content.replace(/<[^>]+>/g, "").trim();

  if (!text) return title.slice(0, 200);

  if (text.length <= 200) return text;

  const truncated = text.slice(0, 197);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 150 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

async function fetchBraveResults(query: string): Promise<DiscoveredItem[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + " latest news")}&count=15&freshness=pw`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const now = Date.now();
    return (data.web?.results || []).map(
      (r: { title: string; description: string; url: string; age?: string; profile?: { img?: string } }, i: number) => {
        const hostname = new URL(r.url).hostname.replace("www.", "");
        // Brave's `profile.img` is a 32x32 favicon, NOT a hero image. Using
        // it as a card hero image upscales it to a blurry blob. Leave it
        // null so the card renders without a hero — the source pill chip
        // still shows the favicon at its native size.
        return {
          title: r.title,
          url: r.url,
          summary: r.description,
          source: hostname,
          image_url: null,
          published_at: new Date(now - i * 3600000).toISOString(),
        };
      }
    );
  } catch {
    return [];
  }
}

export async function discoverFeeds(
  query: string
): Promise<DiscoveredItem[]> {
  const terms = queryToSearchTerms(query);

  // Try Brave Search first (real web results), RSS as fallback
  const [braveItems, ...rssResults] = await Promise.allSettled([
    fetchBraveResults(query),
    fetchRssItems(buildGoogleNewsUrl(terms.join(" "))),
    ...buildCommonRssUrls(terms).map((url) => fetchRssItems(url)),
  ]);

  const items: DiscoveredItem[] = [];
  const seenUrls = new Set<string>();

  // Brave results first (higher quality)
  if (braveItems.status === "fulfilled") {
    for (const item of braveItems.value) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      items.push(item);
    }
  }

  // Then RSS results
  for (const result of rssResults) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      items.push(item);
    }
  }

  items.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return items.slice(0, 50);
}

export async function refreshFeed(
  feed: Feed
): Promise<DiscoveredItem[]> {
  const terms = queryToSearchTerms(feed.query_text);

  // Try Brave Search first, RSS as fallback
  const [braveItems, ...rssResults] = await Promise.allSettled([
    fetchBraveResults(feed.query_text),
    fetchRssItems(buildGoogleNewsUrl(terms.join(" "))),
    ...buildCommonRssUrls(terms).map((url) => fetchRssItems(url)),
  ]);

  const items: DiscoveredItem[] = [];
  const seenUrls = new Set<string>();

  if (braveItems.status === "fulfilled") {
    for (const item of braveItems.value) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      items.push(item);
    }
  }

  for (const result of rssResults) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);
      items.push(item);
    }
  }

  if (feed.last_refreshed_at) {
    const lastRefresh = new Date(feed.last_refreshed_at).getTime();
    const newItems = items.filter(
      (item) => new Date(item.published_at).getTime() > lastRefresh
    );
    if (newItems.length > 0) {
      newItems.sort(
        (a, b) =>
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime()
      );
      return newItems.slice(0, 50);
    }
  }

  items.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  return items.slice(0, 50);
}

// ════════════════════════════════════════════════════════════════
// Demand-driven top-up — makes EVERY feed (incl. brand-new, niche, and
// arbitrary user prompts) reach a good number of fresh posts.
//
// The shared RSS pool covers mainstream topics well but not niche ones,
// so niche/new feeds starve. The fix is targeted search PER FEED — but
// only for feeds actually below the freshness SLO, so rich feeds cost $0.
//
// Cost model (cost-effective by design):
//   - Primary source: Google News RSS search on the feed's exact prompt —
//     FREE (just outbound HTTP), covers the vast majority of topics.
//   - Supplement: Brave web search — only when a Brave key is configured
//     AND within a per-tick budget, for non-news niches Google News misses.
//   - Relevance gate: preFilterArticles (keyword + spam, no LLM) — free.
// ════════════════════════════════════════════════════════════════

type ServiceClient = ReturnType<typeof getServiceClient>;

export interface TopUpResult {
  checked: number;
  filled: number;
  inserted: number;
  braveUsed: number;
}

export async function topUpStarvingFeeds(
  svc: ServiceClient,
  opts?: { maxFeeds?: number; bravePerTick?: number; minFresh?: number; sinceHours?: number },
): Promise<TopUpResult> {
  const maxFeeds = opts?.maxFeeds ?? 10;
  const minFresh = opts?.minFresh ?? 8;
  const sinceHours = opts?.sinceHours ?? 48;
  // Brave is paid; default to a small per-tick budget. 0 ⇒ free (Google
  // News only). Even with a Brave key, this caps spend.
  let braveBudget = opts?.bravePerTick ?? 3;

  const { data: feeds, error } = await svc.rpc("starving_feeds", {
    p_min_fresh: minFresh,
    p_max: maxFeeds,
    p_since_hours: sinceHours,
  });
  if (error || !feeds || feeds.length === 0) {
    return { checked: 0, filled: 0, inserted: 0, braveUsed: 0 };
  }

  let inserted = 0;
  let filled = 0;
  let braveUsed = 0;

  for (const f of feeds as Array<{ id: string; name: string; query_text: string | null; fresh: number }>) {
    const query = f.query_text || f.name;
    if (!query) continue;
    const terms = queryToSearchTerms(query);

    // Free targeted search (Google News RSS). Add a Brave call only if we
    // still have budget — covers non-news niches.
    const useBrave = braveBudget > 0;
    if (useBrave) braveBudget--;
    const settled = await Promise.allSettled([
      fetchRssItems(buildGoogleNewsUrl(terms.join(" "))),
      ...(useBrave ? [fetchBraveResults(query)] : []),
    ]);
    if (useBrave && settled[1]?.status === "fulfilled" && (settled[1].value as DiscoveredItem[]).length > 0) {
      braveUsed++;
    }

    const found: DiscoveredItem[] = [];
    const seen = new Set<string>();
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const it of r.value as DiscoveredItem[]) {
        const key = it.url.split("?")[0];
        if (seen.has(key)) continue;
        seen.add(key);
        found.push(it);
      }
    }
    if (found.length === 0) continue;

    // Free relevance gate (keyword + spam). Targeted results are mostly
    // on-topic already; if the gate is too strict and drops everything,
    // fall back to the raw targeted results so the feed still fills.
    const poolFmt = found.map((it, i) => ({ id: String(i), title: it.title, summary: it.summary, source: it.source, url: it.url }));
    const passed = preFilterArticles(query, poolFmt);
    const passedUrls = new Set(passed.map((p) => p.url));
    let relevant = found.filter((it) => passedUrls.has(it.url));
    if (relevant.length < 5) relevant = found.slice(0, 15);

    // Dedup vs what the feed already has.
    const { data: existing } = await svc.from("feed_items").select("url").eq("feed_id", f.id).limit(1000);
    const have = new Set((existing || []).map((e: { url: string }) => e.url.split("?")[0]));

    const rows = relevant
      .filter((it) => !have.has(it.url.split("?")[0]))
      .slice(0, 30)
      .map((it) => ({
        feed_id: f.id,
        title: it.title,
        url: it.url,
        summary: it.summary || "",
        source: it.source || "",
        image_url: it.image_url ?? null,
        published_at: it.published_at,
        relevance_score: 72,
      }));

    if (rows.length > 0) {
      const { error: upErr } = await svc.from("feed_items").upsert(rows, { onConflict: "feed_id,url", ignoreDuplicates: true });
      if (!upErr) {
        inserted += rows.length;
        filled++;
      }
    }
    await svc.from("feeds").update({ last_refreshed_at: new Date().toISOString() }).eq("id", f.id);
  }

  return { checked: feeds.length, filled, inserted, braveUsed };
}
