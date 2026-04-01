import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get feed info
    const { data: feed } = await supabase
      .from("feeds")
      .select("id, name, query_text, created_at, last_refreshed_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    // Get item count and date range
    const { data: items, count } = await supabase
      .from("feed_items")
      .select("id, published_at, source, created_at", { count: "exact" })
      .eq("feed_id", id);

    const itemCount = count || 0;

    // Calculate source breakdown
    const sourceCounts: Record<string, number> = {};
    let newestItem: string | null = null;
    let oldestItem: string | null = null;

    if (items) {
      for (const item of items) {
        const source = item.source || "unknown";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        const date = item.published_at || item.created_at;
        if (date) {
          if (!newestItem || date > newestItem) newestItem = date;
          if (!oldestItem || date < oldestItem) oldestItem = date;
        }
      }
    }

    // Calculate items per day
    let itemsPerDay = 0;
    if (newestItem && oldestItem && itemCount > 1) {
      const days = Math.max(1, (new Date(newestItem).getTime() - new Date(oldestItem).getTime()) / 86400000);
      itemsPerDay = Math.round((itemCount / days) * 10) / 10;
    }

    // Top sources
    const topSources = Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));

    return NextResponse.json({
      feed: {
        id: feed.id,
        name: feed.name,
        query: feed.query_text,
        createdAt: feed.created_at,
        lastRefresh: feed.last_refreshed_at,
      },
      stats: {
        totalItems: itemCount,
        itemsPerDay,
        newestItem,
        oldestItem,
        uniqueSources: Object.keys(sourceCounts).length,
        topSources,
      },
    });
  } catch (err) {
    // Error logged server-side only via Vercel runtime logs
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
