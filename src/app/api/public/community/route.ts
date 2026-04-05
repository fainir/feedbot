import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/public/community — list all public feeds with follower counts
 * Returns feeds that any user has published, plus system feeds.
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const sort = req.nextUrl.searchParams.get("sort") || "followers";

  // Get all public, active feeds with their creator info
  const { data: feeds, error } = await supabase
    .from("feeds")
    .select("id, name, query_text, description, is_public, created_at, user_id, profiles!inner(name, email)")
    .eq("is_public", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !feeds) {
    return NextResponse.json({ feeds: [] });
  }

  // Get follower counts for all public feeds
  const feedIds = feeds.map((f) => f.id);
  const { data: followerData } = await supabase
    .from("feed_followers")
    .select("feed_id")
    .in("feed_id", feedIds);

  const followerCounts = new Map<string, number>();
  for (const f of followerData || []) {
    followerCounts.set(f.feed_id, (followerCounts.get(f.feed_id) || 0) + 1);
  }

  // Get article counts
  const { data: itemCounts } = await supabase
    .rpc("count_feed_items", { feed_ids: feedIds })
    .select("*");

  // Build response — fallback to counting if RPC doesn't exist
  const result = feeds.map((f) => {
    const profile = f.profiles as unknown as { name: string | null; email: string } | null;
    return {
      id: f.id,
      name: f.name,
      description: f.description || f.query_text,
      query_text: f.query_text,
      creator: profile?.name || profile?.email?.split("@")[0] || "Anonymous",
      isSystem: f.user_id === "9c313e5c-1468-467b-a797-6ceb9bd7d09b",
      followers: followerCounts.get(f.id) || 0,
      createdAt: f.created_at,
    };
  });

  // Sort
  if (sort === "followers") {
    result.sort((a, b) => b.followers - a.followers);
  } else if (sort === "newest") {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return NextResponse.json({ feeds: result });
}
