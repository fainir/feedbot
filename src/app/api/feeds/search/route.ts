import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

/** Sanitize user input for safe use in PostgREST filter expressions.
 * Escapes characters that have special meaning in PostgREST syntax. */
function sanitizeFilterValue(value: string): string {
  return value.replace(/[,%.()"\\]/g, "");
}

// Search across all user's feed items
export async function GET(request: Request) {
  const rl = rateLimit(`search:${getClientKey(request)}`, { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const source = url.searchParams.get("source");
  const since = url.searchParams.get("since"); // ISO date
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), 100);

  if (!q && !source && !since) {
    return NextResponse.json({ error: "Provide at least one filter: q, source, or since" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's feed IDs
    const { data: feeds } = await supabase
      .from("feeds")
      .select("id")
      .eq("user_id", user.id);

    if (!feeds || feeds.length === 0) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const feedIds = feeds.map((f) => f.id);

    let query = supabase
      .from("feed_items")
      .select("id, title, summary, url, source, published_at, feed_id", { count: "exact" })
      .in("feed_id", feedIds)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (q) {
      const safeQ = sanitizeFilterValue(q);
      query = query.or(`title.ilike.%${safeQ}%,summary.ilike.%${safeQ}%`);
    }
    if (source) {
      const safeSource = sanitizeFilterValue(source);
      query = query.ilike("source", `%${safeSource}%`);
    }
    if (since) {
      query = query.gte("published_at", since);
    }

    const { data: items, count } = await query;

    return NextResponse.json({
      items: (items || []).map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        publishedAt: item.published_at,
        feedId: item.feed_id,
      })),
      total: count || 0,
    });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
