import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// System user owns the default public feeds
const SYSTEM_USER = "9c313e5c-1468-467b-a797-6ceb9bd7d09b";

// Map tab names to feed names in DB
const TAB_MAP: Record<string, string> = {
  "technology news": "Tech News",
  "artificial intelligence machine learning": "AI & ML",
  "startup funding venture capital": "Startups",
  "software engineering programming": "Dev",
  "science research discoveries": "Science",
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Serve articles from DB — content accumulated by background scanner
// No live RSS fetching — instant response
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ error: "q required" }, { status: 400 });

  const supabase = getSupabase();
  const feedName = TAB_MAP[query.toLowerCase().trim()];

  if (!feedName) {
    // Custom query — try to find matching feed or return empty
    return NextResponse.json({ items: [], message: "Sign in to create custom feeds" });
  }

  // Find the system feed
  const { data: feed } = await supabase
    .from("feeds")
    .select("id")
    .eq("user_id", SYSTEM_USER)
    .eq("name", feedName)
    .single();

  if (!feed) return NextResponse.json({ items: [] });

  // Get articles from DB, newest first
  const { data: items } = await supabase
    .from("feed_items")
    .select("id, title, url, summary, source, image_url, published_at")
    .eq("feed_id", feed.id)
    .order("published_at", { ascending: false })
    .limit(30);

  return NextResponse.json({
    items: (items || []).map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      source: item.source,
      url: item.url,
      image_url: item.image_url,
      publishedAt: item.published_at,
    })),
  });
}
