import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Public embed endpoint — returns feed items as JSON for iframe embedding
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Get feed (no auth required for embeds — feed owner opted in)
    const { data: feed } = await supabase
      .from("feeds")
      .select("id, name, query_text")
      .eq("id", id)
      .single();

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    // Get latest items
    const { data: items } = await supabase
      .from("feed_items")
      .select("id, title, summary, url, source, published_at, image_url")
      .eq("feed_id", id)
      .order("published_at", { ascending: false })
      .limit(10);

    // CORS headers for embedding
    const response = NextResponse.json({
      feed: {
        id: feed.id,
        name: feed.name,
        description: feed.query_text,
      },
      items: (items || []).map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        publishedAt: item.published_at,
        image: item.image_url,
      })),
    });

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET");
    response.headers.set("Cache-Control", "public, max-age=300"); // 5 min cache

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to load embed" }, { status: 500 });
  }
}
