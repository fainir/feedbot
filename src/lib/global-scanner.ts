import RssParser from "rss-parser";
import { getServiceClient } from "@/lib/supabase";
import type { SearchPlan } from "@/lib/prompt-intelligence";

const rssParser = new RssParser({
  timeout: 10_000,
  headers: {
    "User-Agent": "MyFeed/1.0 (RSS Aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

interface RawArticle {
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url: string | null;
  category: string;
  published_at: string;
}

// ─── TIER 1: High-quality curated sources (always scanned) ───
// These cover 80% of prompts for tech/business/science audience
const GLOBAL_SOURCES: { url: string; category: string }[] = [
  // Tech — top publications
  { url: "https://hnrss.org/frontpage", category: "technology" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", category: "technology" },
  { url: "https://www.reddit.com/r/technology/top/.rss?t=day", category: "technology" },
  { url: "https://www.theverge.com/rss/index.xml", category: "technology" },

  // AI & ML — focused sources
  { url: "https://www.reddit.com/r/MachineLearning/top/.rss?t=day", category: "ai" },
  { url: "https://www.reddit.com/r/artificial/top/.rss?t=day", category: "ai" },
  { url: "https://medium.com/feed/tag/artificial-intelligence", category: "ai" },
  { url: "https://dev.to/feed/tag/ai", category: "ai" },

  // Startups & Business
  { url: "https://news.google.com/rss/search?q=startup+funding+round&hl=en-US&gl=US&ceid=US:en", category: "startups" },
  { url: "https://www.reddit.com/r/startups/top/.rss?t=day", category: "startups" },
  { url: "https://hnrss.org/newest?q=funding+startup+launch", category: "startups" },

  // Programming & Dev
  { url: "https://www.reddit.com/r/programming/top/.rss?t=day", category: "programming" },
  { url: "https://dev.to/feed", category: "programming" },
  { url: "https://medium.com/feed/tag/programming", category: "programming" },
  { url: "https://hnrss.org/newest?q=programming+developer+tool", category: "programming" },

  // Science
  { url: "https://www.reddit.com/r/science/top/.rss?t=day", category: "science" },
  { url: "https://news.google.com/rss/search?q=scientific+discovery+research+breakthrough&hl=en-US&gl=US&ceid=US:en", category: "science" },
  { url: "https://www.nature.com/nature.rss", category: "science" },
  { url: "https://www.sciencedaily.com/rss/all.xml", category: "science" },
  { url: "https://phys.org/rss-feed/", category: "science" },

  // Business & Finance
  { url: "https://www.reddit.com/r/business/top/.rss?t=day", category: "business" },
  { url: "https://news.google.com/rss/search?q=business+economy+market&hl=en-US&gl=US&ceid=US:en", category: "business" },

  // Crypto
  { url: "https://www.reddit.com/r/CryptoCurrency/top/.rss?t=day", category: "crypto" },
  { url: "https://medium.com/feed/tag/cryptocurrency", category: "crypto" },

  // Design
  { url: "https://www.reddit.com/r/design/top/.rss?t=day", category: "design" },
  { url: "https://medium.com/feed/tag/ux-design", category: "design" },

  // Security
  { url: "https://www.reddit.com/r/netsec/top/.rss?t=day", category: "security" },
  { url: "https://medium.com/feed/tag/cybersecurity", category: "security" },

  // Gaming
  { url: "https://www.reddit.com/r/Games/top/.rss?t=day", category: "gaming" },
  { url: "https://www.reddit.com/r/gamedev/top/.rss?t=day", category: "gaming" },
  { url: "https://news.google.com/rss/search?q=video+game+release+esports+gaming+industry&hl=en-US&gl=US&ceid=US:en", category: "gaming" },

  // Space
  { url: "https://www.reddit.com/r/space/top/.rss?t=day", category: "space" },
  { url: "https://www.nasa.gov/feed/", category: "space" },
  { url: "https://spacenews.com/feed/", category: "space" },
  { url: "https://www.space.com/feeds/all", category: "space" },

  // Health
  { url: "https://www.reddit.com/r/Health/top/.rss?t=day", category: "health" },
  { url: "https://medium.com/feed/tag/health", category: "health" },
  { url: "https://www.statnews.com/feed/", category: "health" },
  { url: "https://news.google.com/rss/search?q=medical+research+health+breakthrough&hl=en-US&gl=US&ceid=US:en", category: "health" },

  // Climate
  { url: "https://www.reddit.com/r/climate/top/.rss?t=day", category: "climate" },
  { url: "https://www.reddit.com/r/RenewableEnergy/top/.rss?t=day", category: "climate" },
  { url: "https://news.google.com/rss/search?q=climate+change+renewable+energy+sustainability&hl=en-US&gl=US&ceid=US:en", category: "climate" },
  { url: "https://www.carbonbrief.org/feed/", category: "climate" },
  { url: "https://www.reddit.com/r/environment/top/.rss?t=day", category: "climate" },
  { url: "https://news.google.com/rss/search?q=solar+wind+energy+carbon+emissions+net+zero&hl=en-US&gl=US&ceid=US:en", category: "climate" },

  // Fintech
  { url: "https://www.reddit.com/r/fintech/top/.rss?t=day", category: "fintech" },
  { url: "https://news.google.com/rss/search?q=fintech+digital+banking+neobank+payment+technology&hl=en-US&gl=US&ceid=US:en", category: "fintech" },
  { url: "https://medium.com/feed/tag/fintech", category: "fintech" },

  // DevOps
  { url: "https://www.reddit.com/r/devops/top/.rss?t=day", category: "devops" },

  // Data Science
  { url: "https://www.reddit.com/r/datascience/top/.rss?t=day", category: "data" },
  { url: "https://medium.com/feed/tag/data-science", category: "data" },

  // Mobile
  { url: "https://www.reddit.com/r/iOSProgramming/top/.rss?t=day", category: "mobile" },
  { url: "https://www.reddit.com/r/androiddev/top/.rss?t=day", category: "mobile" },

  // Marketing
  { url: "https://www.reddit.com/r/digital_marketing/top/.rss?t=day", category: "marketing" },
  { url: "https://medium.com/feed/tag/marketing", category: "marketing" },

  // Software Engineering (broader)
  { url: "https://medium.com/feed/tag/software-engineering", category: "programming" },
  { url: "https://medium.com/feed/tag/web-development", category: "programming" },
  { url: "https://medium.com/feed/tag/python-programming", category: "programming" },
  { url: "https://medium.com/feed/tag/machine-learning", category: "ai" },
];

// ─── Source quality weights ───
// Used to boost/penalize articles from known sources
const SOURCE_QUALITY: Record<string, number> = {
  "news.ycombinator.com": 20,
  "arstechnica.com": 15,
  "theverge.com": 15,
  "wired.com": 15,
  "techcrunch.com": 15,
  "nature.com": 15,
  "sciencedaily.com": 12,
  "phys.org": 12,
  "nasa.gov": 15,
  "spacenews.com": 12,
  "space.com": 10,
  "statnews.com": 15,
  "carbonbrief.org": 12,
  "reddit.com": 10,
  "dev.to": 5,
  "medium.com": 5,
  "news.google.com": 0,
};

export function getSourceBoost(source: string): number {
  const lower = source.toLowerCase();
  for (const [domain, boost] of Object.entries(SOURCE_QUALITY)) {
    if (lower.includes(domain)) return boost;
  }
  return 0;
}

function extractImageUrl(item: RssParser.Item): string | null {
  const raw = item as Record<string, unknown>;

  // media:content
  const mediaContent = raw["media:content"] as
    | { $?: { url?: string; medium?: string } }
    | undefined;
  if (mediaContent?.$?.url) return mediaContent.$.url;

  // media:thumbnail
  const mediaThumbnail = raw["media:thumbnail"] as
    | { $?: { url?: string } }
    | undefined;
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;

  // media:group > media:content (YouTube, etc.)
  const mediaGroup = raw["media:group"] as
    | { "media:thumbnail"?: Array<{ $?: { url?: string } }> }
    | undefined;
  if (mediaGroup?.["media:thumbnail"]?.[0]?.$?.url) return mediaGroup["media:thumbnail"][0].$.url;

  // enclosure with image type
  const enclosure = raw.enclosure as
    | { url?: string; type?: string }
    | undefined;
  if (enclosure?.url && (enclosure.type?.startsWith("image") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(enclosure.url))) return enclosure.url;

  // itunes:image (podcasts)
  const itunesImage = raw["itunes:image"] as
    | { $?: { href?: string } }
    | undefined;
  if (itunesImage?.$?.href) return itunesImage.$.href;

  // Parse from HTML content
  const content = item.content || "";
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch?.[1] && !imgMatch[1].includes("tracking") && !imgMatch[1].includes("pixel")) return imgMatch[1];

  return null;
}

function cleanSourceFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function cleanSourceName(raw: string, articleUrl?: string): string {
  // Reddit feeds: extract subreddit name
  if (/top scoring links|^r\/|\/r\//i.test(raw)) {
    const match = raw.match(/\/r\/(\w+)/i) || raw.match(/^r\/(\w+)/i);
    if (match) return "r/" + match[1];
    // "top scoring links : cybersecurity" → extract topic
    const colonMatch = raw.match(/top scoring links\s*:\s*(.+)/i);
    if (colonMatch) return "r/" + colonMatch[1].trim();
    return "Reddit";
  }

  // Known source mappings
  const KNOWN: Record<string, string> = {
    "Hacker News: Front Page": "Hacker News",
    "Hacker News: Newest": "Hacker News",
    "DEV Community": "DEV Community",
  };
  if (KNOWN[raw]) return KNOWN[raw];

  // Strip after common separators: " - ", " | ", " :: "
  let name = raw.split(/\s+[-–]\s+|\s+\|\s+|\s+::\s+/)[0].trim();

  // Truncate to 30 chars
  if (name.length > 30) name = name.slice(0, 27) + "...";

  // Fallback: if name still contains quotes or looks like a search query, extract domain from URL
  if (articleUrl && (name.includes('"') || name.includes("'") || (name.includes(" ") && !name.includes(".")))) {
    const domain = cleanSourceFromUrl(articleUrl);
    if (domain) return domain;
  }

  return name;
}

function summarize(text: string): string {
  const clean = text.replace(/<[^>]+>/g, "").trim();
  if (clean.length <= 200) return clean;
  const truncated = clean.slice(0, 197);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 150 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

async function fetchRss(url: string, category: string): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL(url);
    return (feed.items || []).map((item) => {
      const itemUrl = item.link || url;
      const source = cleanSourceName(feed.title || new URL(url).hostname, itemUrl);
      return {
        title: item.title || "Untitled",
        url: itemUrl,
        summary: summarize(item.contentSnippet || item.content || item.title || ""),
        source,
        image_url: extractImageUrl(item),
        category,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Strip tracking params (utm_*, source, ref, etc.)
    const stripParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "source", "ref", "gi", "sk"];
    for (const p of stripParams) u.searchParams.delete(p);
    // Normalize Medium URLs: strip ?source= and #--- fragments
    let clean = u.toString().split("#")[0];
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    return clean;
  } catch {
    return url;
  }
}

async function insertToPool(articles: RawArticle[]): Promise<number> {
  if (articles.length === 0) return 0;

  // Deduplicate by normalized URL before inserting
  const seen = new Set<string>();
  articles = articles.filter((a) => {
    const norm = normalizeUrl(a.url);
    if (seen.has(norm)) return false;
    seen.add(norm);
    a.url = norm;
    return true;
  });

  const supabase = getServiceClient();
  const rows = articles.map((a) => ({
    title: a.title,
    url: a.url,
    summary: a.summary,
    source: a.source,
    image_url: a.image_url,
    category: a.category,
    published_at: a.published_at,
  }));

  let totalAdded = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { data, error } = await supabase
      .from("article_pool")
      .upsert(chunk, { onConflict: "url", ignoreDuplicates: true })
      .select("id");
    if (!error && data) totalAdded += data.length;
  }
  return totalAdded;
}

/**
 * PHASE 1A: Scan global high-quality sources into article_pool.
 * Covers 80% of prompts. Runs every 15 min.
 * Cost: $0 (all RSS).
 */
export async function scanGlobal(): Promise<{ scanned: number; added: number }> {
  const results = await Promise.allSettled(
    GLOBAL_SOURCES.map(({ url, category }) => fetchRss(url, category))
  );

  const articles: RawArticle[] = [];
  const seenUrls = new Set<string>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const article of result.value) {
      if (seenUrls.has(article.url)) continue;
      seenUrls.add(article.url);
      articles.push(article);
    }
  }

  const added = await insertToPool(articles);
  return { scanned: articles.length, added };
}

/**
 * PHASE 1B: Scan sources specific to a feed's AI-generated search plan.
 * Covers the other 20% — niche topics, custom interests.
 * Cost: $0 (RSS) — the AI cost was in generating the plan.
 */
export async function scanForPlan(plan: SearchPlan): Promise<{ scanned: number; added: number }> {
  const urls: { url: string; category: string }[] = [];
  const category = "custom";

  // Google News with AI-optimized queries
  for (const q of plan.google_queries.slice(0, 3)) {
    urls.push({
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`,
      category,
    });
  }

  // Subreddits (top of day for quality)
  for (const sub of plan.subreddits.slice(0, 4)) {
    const name = sub.replace(/^r\//, "");
    urls.push({ url: `https://www.reddit.com/r/${name}/top/.rss?t=day`, category });
  }

  // HN search
  for (const q of plan.hn_queries.slice(0, 2)) {
    urls.push({ url: `https://hnrss.org/newest?q=${encodeURIComponent(q)}`, category });
  }

  // Medium tags
  for (const tag of plan.medium_tags.slice(0, 2)) {
    urls.push({ url: `https://medium.com/feed/tag/${tag}`, category });
  }

  // Dev.to tags
  for (const tag of plan.devto_tags.slice(0, 2)) {
    urls.push({ url: `https://dev.to/feed/tag/${tag}`, category });
  }

  const results = await Promise.allSettled(
    urls.map(({ url, category: cat }) => fetchRss(url, cat))
  );

  const articles: RawArticle[] = [];
  const seenUrls = new Set<string>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const article of result.value) {
      if (seenUrls.has(article.url)) continue;
      seenUrls.add(article.url);
      articles.push(article);
    }
  }

  const added = await insertToPool(articles);
  return { scanned: articles.length, added };
}

/**
 * Brave Search scan for maximum coverage. Uses API tokens.
 * Used for custom feeds when RSS doesn't cover the topic well.
 */
export async function scanBrave(queries?: string[]): Promise<{ scanned: number; added: number }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return { scanned: 0, added: 0 };

  const defaultQueries = [
    { q: "technology news today", category: "technology" },
    { q: "artificial intelligence latest", category: "ai" },
    { q: "startup funding news", category: "startups" },
    { q: "software engineering programming", category: "programming" },
    { q: "science discovery research", category: "science" },
  ];

  const searchQueries = queries
    ? queries.map((q) => ({ q, category: "custom" }))
    : defaultQueries;

  let totalScanned = 0;
  let totalAdded = 0;

  for (const { q, category } of searchQueries) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=20&freshness=pd`,
        { headers: { Accept: "application/json", "X-Subscription-Token": apiKey } }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const results = data.web?.results || [];
      totalScanned += results.length;

      const articles: RawArticle[] = results.map((r: { title: string; description: string; url: string }) => ({
        title: r.title,
        url: r.url,
        summary: r.description || "",
        source: new URL(r.url).hostname.replace("www.", ""),
        image_url: null,
        category,
        published_at: new Date().toISOString(),
      }));

      totalAdded += await insertToPool(articles);
    } catch {
      // continue
    }
  }

  return { scanned: totalScanned, added: totalAdded };
}

// Search Brave Videos API for YouTube content
export async function scanBraveVideos(queries?: string[]): Promise<{ scanned: number; added: number }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return { scanned: 0, added: 0 };

  const defaultQueries = [
    "AI technology explained",
    "startup pitch funding",
    "programming tutorial",
    "science documentary",
    "tech review 2026",
    "cybersecurity explained",
    "space exploration news",
    "design process",
    "game development devlog",
    "robotics demo",
  ];

  const searchQueries = queries || defaultQueries;
  let totalScanned = 0;
  let totalAdded = 0;

  for (const q of searchQueries) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/videos/search?q=${encodeURIComponent(q)}&count=10&freshness=pm`,
        { headers: { Accept: "application/json", "X-Subscription-Token": apiKey } }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const results = data.results || [];
      totalScanned += results.length;

      const articles: RawArticle[] = results
        .filter((r: { url: string }) => r.url?.includes("youtube.com") || r.url?.includes("youtu.be"))
        .map((r: { title: string; description: string; url: string; thumbnail?: { src: string } }) => ({
          title: r.title,
          url: r.url,
          summary: r.description || "",
          source: "YouTube",
          image_url: r.thumbnail?.src || null,
          category: "video",
          published_at: new Date().toISOString(),
        }));

      totalAdded += await insertToPool(articles);
    } catch {
      // continue
    }
  }

  return { scanned: totalScanned, added: totalAdded };
}
