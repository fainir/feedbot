import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Public endpoint — returns trending items across all public feeds
// Used for the landing page social proof and discover features
export async function GET() {
  try {
    const supabase = await createClient();

    // Get recent items from feeds (last 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: items } = await supabase
      .from("feed_items")
      .select("id, title, summary, url, source, published_at")
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(20);

    // Deduplicate by similar titles
    const seen: string[] = [];
    const unique = (items || []).filter((item) => {
      const words = new Set(item.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w: string) => w.length > 2));
      for (const prev of seen) {
        const prevWords = new Set(prev.split(/\s+/));
        const overlap = [...words].filter((w) => prevWords.has(w as string)).length;
        if (overlap / Math.max(words.size, prevWords.size) > 0.6) return false;
      }
      seen.push([...words].join(" "));
      return true;
    });

    return NextResponse.json({
      items: unique.slice(0, 10).map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary?.slice(0, 200),
        url: item.url,
        source: item.source,
        publishedAt: item.published_at,
      })),
      count: unique.length,
    }, {
      headers: {
        "Cache-Control": "public, max-age=600", // 10 min cache
      },
    });
  } catch (err) {
    console.error("Trending error:", err);
    return NextResponse.json({ items: [], count: 0 });
  }
}
