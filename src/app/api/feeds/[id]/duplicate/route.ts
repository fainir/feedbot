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

    // Generate a unique slug from the duplicated name (matches POST /api/feeds).
    const baseName = `${original.name} (copy)`;
    let baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "feed";
    // De-collide against existing slugs.
    const { data: existing } = await supabase
      .from("feeds")
      .select("slug")
      .ilike("slug", `${baseSlug}%`);
    const used = new Set((existing || []).map((f) => f.slug).filter(Boolean));
    let slug = baseSlug;
    for (let n = 2; used.has(slug); n++) slug = `${baseSlug}-${n}`;

    // Create duplicate with slug. search_plan stays null on purpose — the
    // refresh that runs next will rebuild it from the (potentially edited)
    // query_text, so we don't carry stale plan data forward.
    const { data: newFeed, error } = await supabase
      .from("feeds")
      .insert({
        user_id: user.id,
        name: baseName,
        query_text: original.query_text,
        description: original.description,
        slug,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to duplicate feed" }, { status: 500 });
    }

    return NextResponse.json({ feed: newFeed });
  } catch (err) {
    // Error logged server-side only via Vercel runtime logs
    return NextResponse.json({ error: "Failed to duplicate feed" }, { status: 500 });
  }
}
