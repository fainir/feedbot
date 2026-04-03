import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

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

  const { feed_item_id, reaction } = body as {
    feed_item_id?: string;
    reaction?: string;
  };

  if (!feed_item_id || !reaction) {
    return NextResponse.json({ error: "feed_item_id and reaction are required" }, { status: 400 });
  }

  if (reaction !== "like" && reaction !== "dislike") {
    return NextResponse.json({ error: "reaction must be 'like' or 'dislike'" }, { status: 400 });
  }

  // Check if user already has a reaction on this item
  const { data: existing } = await supabase
    .from("reactions")
    .select("id, reaction")
    .eq("user_id", user.id)
    .eq("feed_item_id", feed_item_id)
    .single();

  if (existing) {
    if (existing.reaction === reaction) {
      // Same reaction — remove it (toggle off)
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: "Failed to remove reaction" }, { status: 500 });
      }

      return NextResponse.json({ action: "removed", reaction: null });
    }

    // Different reaction — update it
    const { error } = await supabase
      .from("reactions")
      .update({ reaction })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
    }

    return NextResponse.json({ action: "updated", reaction });
  }

  // No existing reaction — create new
  const { error } = await supabase
    .from("reactions")
    .insert({
      user_id: user.id,
      feed_item_id,
      reaction,
    });

  if (error) {
    return NextResponse.json({ error: "Failed to save reaction" }, { status: 500 });
  }

  return NextResponse.json({ action: "created", reaction }, { status: 201 });
}
