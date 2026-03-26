import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// Public stats endpoint — no auth required
// Returns aggregate counts for the landing page
export async function GET() {
  try {
    const supabase = getServiceClient();

    const [usersResult, feedsResult, itemsResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("feeds").select("id", { count: "exact", head: true }),
      supabase.from("feed_items").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      users: usersResult.count || 0,
      feeds: feedsResult.count || 0,
      articles: itemsResult.count || 0,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json({ users: 0, feeds: 0, articles: 0 });
  }
}
