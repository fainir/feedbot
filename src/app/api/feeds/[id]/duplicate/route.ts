import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Duplicate a feed — creates a copy with the same query
export async function POST(
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

    // Get original feed
    const { data: original } = await supabase
      .from("feeds")
      .select("name, query_text, description")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!original) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    // Create duplicate
    const { data: newFeed, error } = await supabase
      .from("feeds")
      .insert({
        user_id: user.id,
        name: `${original.name} (copy)`,
        query_text: original.query_text,
        description: original.description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to duplicate feed" }, { status: 500 });
    }

    return NextResponse.json({ feed: newFeed });
  } catch (err) {
    console.error("Duplicate error:", err);
    return NextResponse.json({ error: "Failed to duplicate feed" }, { status: 500 });
  }
}
