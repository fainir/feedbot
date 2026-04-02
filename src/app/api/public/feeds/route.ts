import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_USER = "9c313e5c-1468-467b-a797-6ceb9bd7d09b";

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

// Paginated feed from DB — returns all articles, oldest accumulate
// ?q=query&cursor=ISO_DATE&limit=50
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ error: "q required" }, { status: 400 });

  const cursor = req.nextUrl.searchParams.get("cursor"); // ISO date for pagination
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 100);

  const supabase = getSupabase();
  const feedName = TAB_MAP[query.toLowerCase().trim()];

  if (!feedName) {
    return NextResponse.json({ items: [], hasMore: false });
  }

  const { data: feed } = await supabase
    .from("feeds")
    .select("id")
    .eq("user_id", SYSTEM_USER)
    .eq("name", feedName)
    .single();

  if (!feed) return NextResponse.json({ items: [], hasMore: false });

  // Get articles — paginated by cursor (published_at), newest first
  let queryBuilder = supabase
    .from("feed_items")
    .select("id, title, url, summary, source, image_url, published_at")
    .eq("feed_id", feed.id)
    .order("published_at", { ascending: false })
    .limit(limit + 1); // fetch 1 extra to check hasMore

  if (cursor) {
    queryBuilder = queryBuilder.lt("published_at", cursor);
  }

  const { data: items } = await queryBuilder;
  const results = items || [];
  const hasMore = results.length > limit;
  const page = hasMore ? results.slice(0, limit) : results;

  return NextResponse.json({
    items: page.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      source: item.source,
      url: item.url,
      image_url: item.image_url,
      publishedAt: item.published_at,
    })),
    hasMore,
    nextCursor: hasMore ? page[page.length - 1].published_at : null,
  });
}
