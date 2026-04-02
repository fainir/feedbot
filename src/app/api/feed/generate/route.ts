import { NextResponse } from "next/server";
import { discoverFeeds } from "@/lib/feed-engine";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

// Generate feed items from real RSS sources (Google News, Reddit, HN, Medium, Dev.to)
// Zero LLM tokens — pure RSS parsing
// Rate limited to prevent abuse
export async function POST(req: Request) {
  try {
    const rl = rateLimit(`generate:${getClientKey(req)}`, { limit: 20, windowSeconds: 60 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    // Fetch real articles from 5 RSS sources in parallel
    const items = await discoverFeeds(prompt);

    return NextResponse.json({
      items: items.map((item, i) => ({
        id: `rss-${i}-${Date.now()}`,
        title: item.title,
        summary: item.summary,
        source: item.source,
        url: item.url,
        image_url: item.image_url,
        publishedAt: item.published_at,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate feed" }, { status: 500 });
  }
}
