import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Verify feed exists and is public
  const { data: feed } = await supabase
    .from("feeds")
    .select("id, is_public")
    .eq("id", id)
    .single();

  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  if (!feed.is_public) {
    return NextResponse.json({ error: "Feed is not public" }, { status: 403 });
  }

  // Follow (upsert to handle duplicate)
  const { error } = await supabase
    .from("feed_followers")
    .upsert({ user_id: user.id, feed_id: id }, { onConflict: "user_id,feed_id" });

  if (error) {
    return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
  }

  return NextResponse.json({ followed: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  await supabase
    .from("feed_followers")
    .delete()
    .eq("user_id", user.id)
    .eq("feed_id", id);

  return NextResponse.json({ unfollowed: true });
}
