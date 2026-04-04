import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_USER = "9c313e5c-1468-467b-a797-6ceb9bd7d09b";

// Map tab queries to system feed names in DB
// Keys are the start of the query text (matched with startsWith)
const TAB_MAP: Record<string, string> = {
  "tech industry": "Tech News",
  "artificial intelligence": "AI & ML",
  "startup funding": "Startups",
  "startups": "Startups",
  "crypto": "Crypto",
  "cryptocurrency": "Crypto",
  "design": "Design",
  "ui ux": "Design",
  "security": "Security",
  "cybersecurity": "Security",
  "gaming": "Gaming",
  "video games": "Gaming",
  "business": "Business",
  "business strategy": "Business",
  "space": "Space",
  "spacex": "Space",
  "health": "Health",
  "health research": "Health",
  "climate": "Climate",
  "climate change": "Climate",
  "fintech": "Fintech",
  "fintech news": "Fintech",
  "devops": "DevOps",
  "data": "Data",
  "data science": "Data",
  "mobile": "Mobile",
  "mobile app": "Mobile",
  "marketing": "Marketing",
  "digital marketing": "Marketing",
  "software engineering": "Dev",
  "scientific discoveries": "Science",
  // Legacy mappings
  "technology news": "Tech News",
  "startup funding venture capital": "Startups",
  "software engineering programming": "Dev",
  "science research discoveries": "Science",
  "artificial intelligence machine learning": "AI & ML",
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
  const queryLower = query.toLowerCase().trim();
  let feedName = TAB_MAP[queryLower];
  if (!feedName) {
    // Try prefix matching for longer prompts
    for (const [prefix, name] of Object.entries(TAB_MAP)) {
      if (queryLower.startsWith(prefix)) {
        feedName = name;
        break;
      }
    }
  }

  // Special case: "all" returns mixed articles from all system feeds
  const isAll = queryLower === "all";

  if (!isAll && !feedName) {
    return NextResponse.json({ items: [], hasMore: false });
  }

  let feedIds: string[] = [];

  if (isAll) {
    // Get all system feeds
    const { data: feeds } = await supabase
      .from("feeds")
      .select("id")
      .eq("user_id", SYSTEM_USER)
      .eq("is_active", true);
    feedIds = (feeds || []).map((f: { id: string }) => f.id);
    // Optional: filter by specific feed names from "feeds" param
    const feedsParam = req.nextUrl.searchParams.get("feeds");
    if (feedsParam) {
      const wantedNames = feedsParam.split(",").map((s) => s.trim());
      const { data: filtered } = await supabase
        .from("feeds")
        .select("id, name")
        .eq("user_id", SYSTEM_USER)
        .in("name", wantedNames);
      if (filtered && filtered.length > 0) {
        feedIds = filtered.map((f: { id: string }) => f.id);
      }
    }
  } else {
    const { data: feed } = await supabase
      .from("feeds")
      .select("id")
      .eq("user_id", SYSTEM_USER)
      .eq("name", feedName)
      .single();
    if (!feed) return NextResponse.json({ items: [], hasMore: false });
    feedIds = [feed.id];
  }

  if (feedIds.length === 0) return NextResponse.json({ items: [], hasMore: false });

  // Get articles — paginated by cursor (published_at), newest first
  let queryBuilder = supabase
    .from("feed_items")
    .select("id, title, url, summary, source, image_url, published_at, relevance_score")
    .in("feed_id", feedIds)
    .order("published_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    queryBuilder = queryBuilder.lt("published_at", cursor);
  }

  const { data: items } = await queryBuilder;
  const results = items || [];

  // Deduplicate by normalized URL + filter low-quality content
  const seenUrls = new Set<string>();
  const deduped = results.filter((item) => {
    const normalized = item.url.split("?")[0].split("#")[0].replace(/\/+$/, "");
    if (seenUrls.has(normalized)) return false;
    seenUrls.add(normalized);
    // Filter garbage titles
    const title = (item.title || "").trim();
    if (title.length < 15) return false;
    // Detect if prompt is Latin-script — if so, filter non-Latin titles
    const promptIsLatin = /^[a-zA-Z]/.test(queryLower);
    if (promptIsLatin) {
      const latinRatio = (title.match(/[a-zA-Z0-9\s.,!?'"\-—:;()\[\]@#$%&*+=/\\|<>{}~`^_]/g) || []).length / title.length;
      if (latinRatio < 0.5) return false;
    }
    // Filter garbage patterns: excessive special chars
    const specialRatio = (title.match(/[><={}|^~`]/g) || []).length / title.length;
    if (specialRatio > 0.03) return false;
    // Filter titles that are mostly uppercase with random casing (spam/noise)
    const upperCount = (title.match(/[A-Z]/g) || []).length;
    const letterCount = (title.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 10 && upperCount / letterCount > 0.6) return false;
    // Filter mid-word uppercase (aLtErNaTiNg CaSe spam)
    const midWordUpper = (title.match(/[a-z][A-Z]/g) || []).length;
    if (midWordUpper > 3) return false;
    // Filter raw CVE/GHSA vulnerability dumps
    if (/^(GHSA-|CVE-\d{4})/i.test(title)) return false;
    return true;
  });

  const hasMore = deduped.length > limit;
  const page = hasMore ? deduped.slice(0, limit) : deduped;

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
