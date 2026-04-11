import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_USER = "9c313e5c-1468-467b-a797-6ceb9bd7d09b";

// Map tab queries to system feed names in DB
// Keys are the start of the query text (matched with startsWith)
// Legacy TAB_MAP for backward compat with old query formats
const TAB_MAP: Record<string, string> = {
  "tech industry": "Tech News",
  "artificial intelligence": "AI & ML",
  "startup funding": "Startups",
  "software engineering": "Dev",
  "scientific discoveries": "Science",
  "technology news": "Tech News",
  "artificial intelligence machine learning": "AI & ML",
  "open source projects": "Open Source",
  "video games": "Gaming",
  "cybersecurity": "Security",
  "spacex launches": "Space",
  "health research": "Health",
  "business strategy": "Business",
  "ui ux design": "Design",
  "cryptocurrency bitcoin": "Crypto",
  "energy technology": "Energy",
  "humanoid robots": "Robotics",
  "cloud infrastructure": "DevOps",
  "data science": "Data",
  "mobile app": "Mobile",
  "digital marketing": "Marketing",
  "climate change": "Climate",
  "fintech news": "Fintech",
};

function normalizeSource(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("medium")) return "medium";
  if (s.includes("dev community") || s.includes("dev.to")) return "devto";
  if (s.includes("reddit")) return "reddit";
  if (s.includes("hacker news") || s.includes("hnrss")) return "hackernews";
  if (s.includes("google")) return "google-news";
  if (s.includes("nature")) return "nature";
  if (s.includes("phys.org")) return "physorg";
  return s.replace(/[^a-z]/g, "").slice(0, 20);
}

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

  // Special case: "all" returns mixed articles from all system feeds
  const isAll = queryLower === "all";

  let feedIds: string[] = [];

  if (isAll) {
    const { data: feeds } = await supabase
      .from("feeds")
      .select("id")
      .eq("user_id", SYSTEM_USER)
      .eq("is_active", true);
    feedIds = (feeds || []).map((f: { id: string }) => f.id);
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
  }

  // Smart feed matching: try multiple strategies to find the best system feed
  if (!isAll && feedIds.length === 0) {
    // Strategy 1: Direct TAB_MAP lookup (exact or prefix)
    let feedName = TAB_MAP[queryLower];
    if (!feedName) {
      for (const [prefix, name] of Object.entries(TAB_MAP)) {
        if (queryLower.startsWith(prefix)) { feedName = name; break; }
      }
    }
    if (feedName) {
      const { data: feed } = await supabase.from("feeds").select("id").eq("user_id", SYSTEM_USER).eq("name", feedName).single();
      if (feed) feedIds = [feed.id];
    }
  }

  // Strategy 2: Score all system feeds by keyword overlap with the query
  if (!isAll && feedIds.length === 0) {
    const { data: allFeeds } = await supabase
      .from("feeds")
      .select("id, name, query_text")
      .eq("user_id", SYSTEM_USER)
      .eq("is_active", true);

    if (allFeeds && allFeeds.length > 0) {
      const queryWords = queryLower.split(/[\s,]+/).filter((w: string) => w.length > 2);
      let bestFeed: { id: string; score: number } | null = null;

      for (const feed of allFeeds) {
        const feedText = `${feed.name} ${feed.query_text || ""}`.toLowerCase();
        const matchCount = queryWords.filter((w: string) => feedText.includes(w)).length;
        const score = matchCount / Math.max(queryWords.length, 1);
        // Require at least 30% keyword overlap and at least 2 matches
        if (matchCount >= 2 && score >= 0.3 && (!bestFeed || score > bestFeed.score)) {
          bestFeed = { id: feed.id, score };
        }
      }

      if (bestFeed) feedIds = [bestFeed.id];
    }
  }

  // Strategy 3: ilike search on query_text (partial match)
  if (!isAll && feedIds.length === 0) {
    const firstPhrase = queryLower.split(",")[0].trim().slice(0, 40);
    const { data: matchByQuery } = await supabase
      .from("feeds")
      .select("id")
      .eq("user_id", SYSTEM_USER)
      .ilike("query_text", `%${firstPhrase}%`)
      .limit(1)
      .single();
    if (matchByQuery) feedIds = [matchByQuery.id];
  }

  // Last resort: search article_pool directly by keywords
  let results: { id: string; title: string; url: string; summary: string; source: string; image_url: string | null; published_at: string; relevance_score: number }[] = [];

  if (!isAll && feedIds.length === 0) {
    // Stop words that match too broadly — never use as search keywords
    const STOP_WORDS = new Set(["this","that","with","from","have","been","will","they","their","about","what","when","which","these","those","would","could","should","here","there","your","more","just","into","also","some","than","other","each","most","only","very","over","such","after","much","many","make","like","back","well","even","want","give","good","best","does","were","them","then","know","come","take","need","find","tell","help","work","part","look","made","down","used","through","where","before","between","under","along","while","really","using","being","going","still","every","first","last","next","step","guide","complete","learn","build","start","data","time","high","full","great","simple","easy","real","world","people","without","around","another","within","because","different","thought","however","getting","making","working","little","something","same","during","long","right","both","ways","things"]);
    const keywords = queryLower
      .split(/[,\s]+/)
      .filter((w: string) => w.length > 3 && !STOP_WORDS.has(w))
      .slice(0, 8);
    if (keywords.length === 0) return NextResponse.json({ items: [], hasMore: false });

    // Use the most specific keywords (longest words) for the DB query
    const sortedByLength = [...keywords].sort((a, b) => b.length - a.length);
    const dbKeywords = sortedByLength.slice(0, 4); // Top 4 most specific
    const orFilter = dbKeywords.map((k: string) => `title.ilike.%${k}%`).join(",");
    let poolQuery = supabase.from("article_pool").select("id, title, url, summary, source, image_url, published_at").or(orFilter).order("published_at", { ascending: false }).limit(limit * 5);
    if (cursor) poolQuery = poolQuery.lt("published_at", cursor);
    const { data: poolItems } = await poolQuery;

    // Score by how many keywords match — require 2+ matches for multi-keyword queries
    const minMatches = keywords.length >= 3 ? 2 : 1;
    results = (poolItems || []).map((item: { id: string; title: string; url: string; summary: string; source: string; image_url: string | null; published_at: string }) => {
      const text = `${item.title} ${item.summary || ""}`.toLowerCase();
      const matchCount = keywords.filter((k: string) => text.includes(k)).length;
      // Bonus for title-only matches (stronger signal than summary matches)
      const titleText = (item.title || "").toLowerCase();
      const titleMatches = keywords.filter((k: string) => titleText.includes(k)).length;
      const score = matchCount * 15 + titleMatches * 10;
      return { ...item, relevance_score: score };
    }).filter((item: { relevance_score: number }, _i: number, _arr: { relevance_score: number }[]) => {
      // For multi-keyword queries, require matching multiple keywords
      const text = `${(item as { title: string }).title} ${(item as { summary: string }).summary || ""}`.toLowerCase();
      const matchCount = keywords.filter((k: string) => text.includes(k)).length;
      return matchCount >= minMatches && item.relevance_score >= 30;
    });
  } else {
    if (feedIds.length === 0) return NextResponse.json({ items: [], hasMore: false });
    let queryBuilder = supabase.from("feed_items").select("id, title, url, summary, source, image_url, published_at, relevance_score").in("feed_id", feedIds).order("published_at", { ascending: false }).limit(limit * 3);
    if (cursor) queryBuilder = queryBuilder.lt("published_at", cursor);
    const { data: items } = await queryBuilder;
    results = items || [];
  }

  // Deduplicate by normalized URL + title similarity + filter low-quality content
  const seenUrls = new Set<string>();
  const seenTitles = new Map<string, boolean>();
  const deduped = results.filter((item) => {
    const normalized = item.url.split("?")[0].split("#")[0].replace(/\/+$/, "");
    if (seenUrls.has(normalized)) return false;
    seenUrls.add(normalized);
    // Title dedup: normalize title, check for near-duplicates
    const normTitle = (item.title || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    const titleKey = normTitle.split(" ").slice(0, 8).join(" "); // first 8 words
    if (seenTitles.has(titleKey)) return false;
    seenTitles.set(titleKey, true);
    // Filter garbage titles
    const title = (item.title || "").trim();
    if (title.length < 15) return false;
    // Filter Wikipedia generic pages (not news)
    if (/- Wikipedia$/i.test(title)) return false;
    // Filter non-Latin script titles (Bengali, Chinese, Arabic, etc.)
    const nonLatinScript = /[\u0980-\u09FF\u4E00-\u9FFF\u3400-\u4DBF\u0600-\u06FF\u0400-\u04FF\u0E00-\u0E7F\u0900-\u097F\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
    if (nonLatinScript.test(title)) {
      const latinChars = (title.match(/[a-zA-Z]/g) || []).length;
      if (latinChars / title.length < 0.8) return false; // Stricter: must be 80% Latin if any non-Latin present
    }
    // Detect if prompt is Latin-script — if so, filter non-Latin titles
    const promptIsLatin = /^[a-zA-Z]/.test(queryLower);
    if (promptIsLatin) {
      const latinRatio = (title.match(/[a-zA-Z0-9\s.,!?'"\-—:;()\[\]@#$%&*+=/\\|<>{}~`^_]/g) || []).length / title.length;
      if (latinRatio < 0.5) return false;
    }
    // Filter French/Spanish/German titles at API level — word matching + accent detection
    const foreignArticles = (title.match(/\b(la|le|el|los|las|del|les|des|une|sur|avec|dans|der|die|das|den|ein|eine|gli|dei|alla|und|est|sont|mais|pour|qui|que|von|wie|du|au|aux|nous|vous|ses|ces|cette|notre|leur|pourquoi|degli|dello|nella|como|por|para|mais|seu|sua|pode|pelo|das|dem|wird|sich|oder|nicht|aber)\b/gi) || []).length;
    if (foreignArticles >= 3) return false;
    // Detect French/Spanish/Portuguese via accented characters (é, è, ê, à, ç, ñ, ü, ö, ã, õ)
    const accentedChars = (title.match(/[éèêëàâçñüöäãõîôûù]/gi) || []).length;
    if (accentedChars >= 2) return false;
    // Detect Turkish/other non-English via specific characters
    if (/[ğışçöüĞİŞÇÖÜ]/.test(title) && (title.match(/[ğışçöüĞİŞÇÖÜ]/g) || []).length >= 2) return false;
    // API-level spam + low-quality filter for articles already in DB
    if (/Fidelity Capital Investment|cost me \$\d|that'?s why we'?re building|something bigger than just|top .{0,20}designer in|APK.*download|APK.*guide|you need to know about .{0,10}(fitness|gym)|how to start a cryptocurrency exchange/i.test(title)) return false;
    // Filter learning diary posts ("Day 1:", "Day 21:", etc.) — personal logs, not curated content
    if (/^Day \d+\s*[:\-–—]/i.test(title)) return false;
    // Filter "Soul in Motion" style personal journal DEV posts
    if (/^Soul in Motion|A Day of Becoming/i.test(title)) return false;
    // Filter off-topic source/content mismatches
    const itemSource = (item.source || "").toLowerCase();
    // Block entertainment/cooking/DIY sources from appearing in non-matching feeds
    if (!isAll) {
      const offTopicSources = /r\/(cooking|recipes|DIY|crafts|movies|television|anime|books|comics|gardening|askreddit|pics|funny|memes|sports|nfl|nba|soccer)/i;
      if (offTopicSources.test(itemSource)) {
        // Only allow these in their matching feeds
        const allowedInQuery = /cook|recipe|food|diy|maker|movie|film|anime|book|comic|garden|sport|game/i;
        if (!allowedInQuery.test(queryLower)) return false;
      }
      // Block ESPN from non-sports feeds
      if (itemSource.includes("espn") && !/sport|game|athlet/i.test(queryLower)) return false;
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

  // ── Freshness decay: boost recent articles, penalize old ones ──
  const now = Date.now();
  const scored = deduped.map((item) => {
    const ageHours = (now - new Date(item.published_at).getTime()) / 3_600_000;
    // Steeper decay: articles lose 50% score in 12h, floor at 0.2
    const freshness = Math.max(0.2, 1 - ageHours / 24);
    const baseScore = item.relevance_score || 70;

    // Penalize stub/empty summaries (low content quality signal)
    const summary = (item.summary || "").trim();
    const summaryPenalty = (!summary || summary.length < 20) ? 0.8 : 1;

    // Penalize low-effort DEV.to posts (no summary = likely low quality)
    const src = normalizeSource(item.source);
    const devPenalty = (src === "devto" && (!summary || summary.length < 40)) ? 0.7 : 1;
    // Penalize DEV posts with spammy title patterns (star counts, numbered lists, excessive emoji)
    const devSpamPenalty = (src === "devto" && /(\d+K?\s*Stars?⭐|^\d+\s+(Things|Ways|Tips|Hacks|Secrets)|^Day \d+:)/i.test(item.title)) ? 0.6 : 1;

    // Penalize Medium posts where summary is just author attribution
    const mediumBylinePenalty = (src === "medium" && summary.length < 40 && /^By:\s/i.test(summary)) ? 0.5 : 1;

    return { ...item, _finalScore: baseScore * freshness * summaryPenalty * devPenalty * devSpamPenalty * mediumBylinePenalty };
  });

  // ── Story clustering: group similar titles, keep best per cluster ──
  const clusters: typeof scored = [];
  const clusterKeys = new Map<string, number>(); // key → index in clusters
  for (const item of scored) {
    // Extract 4-5 significant words as cluster key
    const words = (item.title || "").toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !["this","that","with","from","have","been","will","they","their","about","what","when","which","these","those","would","could","should","here","there"].includes(w))
      .slice(0, 5);
    const key = words.join(" ");

    if (key.length < 8) {
      clusters.push(item); // too short to cluster
      continue;
    }

    // Check for overlap with existing cluster keys
    let matched = false;
    for (const [existingKey, idx] of clusterKeys) {
      const existingWords = existingKey.split(" ");
      const overlap = words.filter((w: string) => existingWords.includes(w)).length;
      if (overlap >= 3) {
        // Same story — keep the higher-scored one
        if (item._finalScore > clusters[idx]._finalScore) {
          clusters[idx] = item;
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      clusterKeys.set(key, clusters.length);
      clusters.push(item);
    }
  }

  // ── Source diversity: cap any single source ──
  const diversityCap = isAll ? 0.15 : 0.15;
  const maxPerSource = Math.max(3, Math.ceil(limit * diversityCap));
  const sourceCounts = new Map<string, number>();
  const diverse = clusters
    .sort((a, b) => b._finalScore - a._finalScore)
    .filter((item) => {
      const src = normalizeSource(item.source);
      const count = sourceCounts.get(src) || 0;
      if (count >= maxPerSource) return false;
      sourceCounts.set(src, count + 1);
      return true;
    });

  const hasMore = diverse.length > limit;
  const page = hasMore ? diverse.slice(0, limit) : diverse;

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
