import RssParser from "rss-parser";
import type { Feed, FeedItem } from "@/types/database";

const rssParser = new RssParser({
  timeout: 10_000,
  headers: {
    "User-Agent": "FeedBot/1.0 (RSS Aggregator)",
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
  const query = terms.slice(0, 3).join("+");

  return [
    `https://www.reddit.com/search.rss?q=${query}&sort=new`,
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

export async function discoverFeeds(
  query: string
): Promise<DiscoveredItem[]> {
  const terms = queryToSearchTerms(query);
  const googleNewsUrl = buildGoogleNewsUrl(terms.join(" "));
  const commonUrls = buildCommonRssUrls(terms);

  const allUrls = [googleNewsUrl, ...commonUrls];

  const results = await Promise.allSettled(
    allUrls.map((url) => fetchRssItems(url))
  );

  const items: DiscoveredItem[] = [];
  const seenUrls = new Set<string>();

  for (const result of results) {
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
  const googleNewsUrl = buildGoogleNewsUrl(terms.join(" "));
  const commonUrls = buildCommonRssUrls(terms);

  const allUrls = [googleNewsUrl, ...commonUrls];

  const results = await Promise.allSettled(
    allUrls.map((url) => fetchRssItems(url))
  );

  const items: DiscoveredItem[] = [];
  const seenUrls = new Set<string>();

  for (const result of results) {
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
