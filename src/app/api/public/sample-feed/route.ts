import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://hnrss.org/newest?count=5", {
      headers: { "User-Agent": "FeedBot/1.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json({ items: fallback() });

    const text = await res.text();
    const items = [...text.matchAll(/<item>[\s\S]*?<\/item>/g)]
      .slice(0, 5)
      .map((m) => {
        const xml = m[0];
        const title = xml.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || xml.match(/<title>(.*?)<\/title>/)?.[1] || "Untitled";
        const link = xml.match(/<link>(.*?)<\/link>/)?.[1] || "";
        const desc = xml.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1]?.replace(/<[^>]*>/g, "").slice(0, 120) || "";
        return { title, url: link, summary: desc, source: "Hacker News" };
      });

    return NextResponse.json({ items: items.length > 0 ? items : fallback() });
  } catch {
    return NextResponse.json({ items: fallback() });
  }
}

function fallback() {
  return [
    { title: "AI Agents Handle Complex Enterprise Workflows", url: "#", summary: "New frameworks enable autonomous AI agents", source: "Tech News" },
    { title: "Next.js 16 Brings Major Performance Improvements", url: "#", summary: "Turbopack default, 40% faster builds", source: "Dev Weekly" },
    { title: "Open Source LLMs Close Gap with GPT-5", url: "#", summary: "Open models achieving 95% of proprietary performance", source: "AI Research" },
  ];
}
