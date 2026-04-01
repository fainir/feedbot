import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Get user's aggregate statistics
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Feed count
    const { count: feedCount } = await supabase
      .from("feeds")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Total items across all feeds
    const { data: feeds } = await supabase
      .from("feeds")
      .select("id")
      .eq("user_id", user.id);

    let totalItems = 0;
    if (feeds && feeds.length > 0) {
      const { count } = await supabase
        .from("feed_items")
        .select("id", { count: "exact", head: true })
        .in("feed_id", feeds.map((f) => f.id));
      totalItems = count || 0;
    }

    // Account age
    const createdAt = user.created_at;
    const accountAgeDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt,
        accountAgeDays,
      },
      stats: {
        feeds: feedCount || 0,
        totalItems,
        itemsPerFeed: feedCount ? Math.round(totalItems / feedCount) : 0,
      },
    });
  } catch (err) {
    // Error logged server-side only via Vercel runtime logs
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
