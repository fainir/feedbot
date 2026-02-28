import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { discoverFeeds } from "@/lib/feed-engine";

function getUserId(request: NextRequest): string | null {
  return request.headers.get("x-user-id");
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data: feeds, error } = await supabase
    .from("feeds")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feeds });
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, query_text, description, schedule, notify_email, notify_push, notify_whatsapp } =
    body as {
      name?: string;
      query_text?: string;
      description?: string;
      schedule?: string;
      notify_email?: boolean;
      notify_push?: boolean;
      notify_whatsapp?: boolean;
    };

  if (!name || !query_text) {
    return NextResponse.json(
      { error: "name and query_text are required" },
      { status: 400 }
    );
  }

  const validSchedules = ["daily", "hourly", "realtime"];
  const feedSchedule = validSchedules.includes(schedule || "")
    ? schedule
    : "daily";

  const supabase = getServiceClient();

  const { data: feed, error } = await supabase
    .from("feeds")
    .insert({
      user_id: userId,
      name,
      description: description || query_text,
      query_text,
      schedule: feedSchedule,
      notify_email: notify_email ?? true,
      notify_push: notify_push ?? false,
      notify_whatsapp: notify_whatsapp ?? false,
      is_active: true,
      last_refreshed_at: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let initialItems: Awaited<ReturnType<typeof discoverFeeds>> = [];
  try {
    initialItems = await discoverFeeds(query_text);

    if (initialItems.length > 0) {
      const rows = initialItems.map((item) => ({
        feed_id: feed.id,
        title: item.title,
        url: item.url,
        summary: item.summary,
        source: item.source,
        image_url: item.image_url,
        published_at: item.published_at,
      }));

      await supabase.from("feed_items").insert(rows);

      await supabase
        .from("feeds")
        .update({ last_refreshed_at: new Date().toISOString() })
        .eq("id", feed.id);
    }
  } catch (err) {
    console.error("Initial feed discovery failed (feed still created):", err);
  }

  return NextResponse.json(
    { feed, initial_items_count: initialItems.length },
    { status: 201 }
  );
}
