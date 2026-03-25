import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Group by source and extract key themes
    const sourceGroups: Record<string, string[]> = {};
    for (const item of items.slice(0, 40)) {
      const source = item.source || "Unknown";
      if (!sourceGroups[source]) sourceGroups[source] = [];
      sourceGroups[source].push(item.title);
    }

    // Build a concise digest
    const sections: string[] = [];

    // Overview
    const sourceCount = Object.keys(sourceGroups).length;
    sections.push(
      `You have ${items.length} unread articles from ${sourceCount} source${sourceCount !== 1 ? "s" : ""}. Here's what you missed:`
    );

    // Group summaries
    for (const [source, titles] of Object.entries(sourceGroups).slice(0, 8)) {
      const titleList = titles.slice(0, 4).map((t: string) => `• ${t}`).join("\n");
      sections.push(`**${source}** (${titles.length} article${titles.length !== 1 ? "s" : ""})\n${titleList}`);
    }

    // Extract trending keywords
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set(["the", "a", "an", "is", "are", "to", "of", "in", "for", "on", "with", "and", "or", "but", "not", "it", "its", "that", "this", "how", "what", "why", "new", "has", "have", "can", "will", "from", "by", "as"]);
    for (const item of items) {
      const words = (item.title || "").toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
      for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }
    const trending = Object.entries(wordFreq)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    if (trending.length > 0) {
      sections.push(`**Trending Topics:** ${trending.join(", ")}`);
    }

    const digest = sections.join("\n\n");

    return NextResponse.json({ digest });
  } catch {
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}
