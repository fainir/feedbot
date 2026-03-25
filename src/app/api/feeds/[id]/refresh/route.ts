import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";
import { refreshFeed } from "@/lib/feed-engine";
import type { Feed } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const { data: feed, error: feedError } = await supabase
    .from("feeds")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (feedError || !feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  let newItems: Awaited<ReturnType<typeof refreshFeed>>;
  try {
    newItems = await refreshFeed(feed as Feed);
  } catch (err) {
    console.error("Feed refresh failed:", err);
    return NextResponse.json(
      { error: "Failed to refresh feed" },
      { status: 502 }
    );
  }

  if (newItems.length > 0) {
    const existingUrls = new Set<string>();

    const { data: existingItems } = await supabase
      .from("feed_items")
      .select("url")
      .eq("feed_id", id);

    if (existingItems) {
      for (const item of existingItems) {
        existingUrls.add(item.url);
      }
    }

    const uniqueNewItems = newItems.filter(
      (item) => !existingUrls.has(item.url)
    );

    if (uniqueNewItems.length > 0) {
      const rows = uniqueNewItems.map((item) => ({
        feed_id: id,
        title: item.title,
        url: item.url,
        summary: item.summary,
        source: item.source,
        image_url: item.image_url,
        published_at: item.published_at,
      }));

      const { error: insertError } = await getServiceClient()
        .from("feed_items")
        .insert(rows);

      if (insertError) {
        console.error("Failed to insert feed items:", insertError);
        return NextResponse.json(
          { error: "Failed to store new items" },
          { status: 500 }
        );
      }
    }

    await supabase
      .from("feeds")
      .update({ last_refreshed_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({
      refreshed: true,
      new_items_count: uniqueNewItems.length,
      items: uniqueNewItems,
    });
  }

  await supabase
    .from("feeds")
    .update({ last_refreshed_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({
    refreshed: true,
    new_items_count: 0,
    items: [],
  });
}
