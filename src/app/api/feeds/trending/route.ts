import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// Public endpoint — returns trending items (title + source only, no user-specific data)
// Used for the landing page social proof and discover features.
// Uses the service client so the response doesn't get filtered to nothing by
// RLS for anonymous callers (the previous cookie-scoped client returned []).
export async function GET() {
  try {
    const supabase = getServiceClient();

    // Get recent items from feeds (last 24 hours) — only public metadata
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: items } = await supabase
      .from("feed_items")
      .select("id, title, url, source, published_at")
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
  } catch {
    return NextResponse.json({ items: [], count: 0 });
  }
}
