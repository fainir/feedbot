import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: bookmarks, error } = await supabase
    .from("bookmarks")
    .select("id, feed_item_id, created_at, feed_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load bookmarks" }, { status: 500 });
  }

  return NextResponse.json({ bookmarks });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { feed_item_id } = body as { feed_item_id?: string };

  if (!feed_item_id) {
    return NextResponse.json({ error: "feed_item_id is required" }, { status: 400 });
  }

  // Check if already bookmarked — toggle
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("feed_item_id", feed_item_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
    }

    return NextResponse.json({ action: "removed", bookmarked: false });
  }

  const { error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: user.id,
      feed_item_id,
    });

  if (error) {
    return NextResponse.json({ error: "Failed to save bookmark" }, { status: 500 });
  }

  return NextResponse.json({ action: "created", bookmarked: true }, { status: 201 });
}
