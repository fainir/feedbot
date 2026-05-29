import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cacheGet, cachePut } from "@/lib/cache";

const SYSTEM_USER = "9c313e5c-1468-467b-a797-6ceb9bd7d09b";

// Two-tier cache: L1 in-memory + L2 Redis (shared across instances, survives
// deploys). Both routes share the same helper from @/lib/cache.
// Server-side TTL is 40min — longer than the 30min cron interval so the
// next cron warm always overwrites the existing entry before it expires.
// Cache never falls into a MISS window. Browser/CDN Cache-Control stays
// at 60s so user-facing revalidation is still frequent.
const RESPONSE_TTL_MS = 2_400_000;
const CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

function responseCacheKey(req: NextRequest): string {
  // Bump prefix when we need to invalidate all cached entries. Last
  // bumps: v2 (cache-poison guard), v3 (empty responses cached during
  // the bulk-prune window), v4 (umbrella-feed backfill — surface the
  // newly-populated AI & ML items immediately instead of waiting for
  // the 40min TTL / next cron warm).
  const p = req.nextUrl.searchParams;
  return "feeds:v4:" + [
    p.get("q") ?? "",
    p.get("cursor") ?? "",
    p.get("limit") ?? "",
    p.get("feeds") ?? "",
  ].join("|");
}

// ── TF-IDF Feed Matcher ──
// Builds a weighted keyword→feed index from all system feed query_texts.
// Keywords rare across feeds score higher (IDF), so "django" → Dev is strong
// while "web" → many feeds is weak. This replaces the old TAB_MAP + naive overlap.
const MATCH_STOP_WORDS = new Set([
  "and","the","for","with","from","that","this","into","about","also","more",
  "most","just","some","very","over","such","like","each","make","good","best",
  "new","all","how","what","when","your","will","been","have","does","than",
  "other","every","between","through","their","which","these","those","where",
  "could","would","should","only","still","while","after","before","under",
  "using","based","real","high","full","great","latest","news","feed","trends",
  "tips","tools","guide","today","world","industry","company","companies",
]);

interface FeedIndex {
  feeds: { id: string; name: string; keywords: string[] }[];
  idf: Map<string, number>; // keyword → IDF weight
}

let _feedIndex: FeedIndex | null = null;
let _feedIndexTime = 0;

async function getFeedIndex(supabase: ReturnType<typeof getSupabase>): Promise<FeedIndex> {
  // Cache for 5 minutes
  if (_feedIndex && Date.now() - _feedIndexTime < 300_000) return _feedIndex;

  const { data: allFeeds } = await supabase
    .from("feeds")
    .select("id, name, query_text")
    .eq("user_id", SYSTEM_USER)
    .eq("is_active", true);

  if (!allFeeds || allFeeds.length === 0) {
    _feedIndex = { feeds: [], idf: new Map() };
    _feedIndexTime = Date.now();
    return _feedIndex;
  }

  // Extract keywords from each feed's name + query_text
  const feeds = allFeeds.map(f => {
    const text = `${f.name} ${f.query_text || ""}`.toLowerCase();
    const keywords = text
      .split(/[\s,]+/)
      .map(w => w.replace(/[^a-z0-9]/g, ""))
      .filter(w => w.length > 2 && !MATCH_STOP_WORDS.has(w));
    return { id: f.id, name: f.name, keywords: [...new Set(keywords)] };
  });

  // Build IDF: weight = 1 / (number of feeds containing this keyword)
  const docFreq = new Map<string, number>();
  for (const feed of feeds) {
    for (const kw of feed.keywords) {
      docFreq.set(kw, (docFreq.get(kw) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  const totalFeeds = feeds.length;
  for (const [kw, freq] of docFreq) {
    idf.set(kw, Math.log(totalFeeds / freq)); // classic IDF
  }

  _feedIndex = { feeds, idf };
  _feedIndexTime = Date.now();
  return _feedIndex;
}

function matchFeeds(queryLower: string, index: FeedIndex, maxFeeds: number = 2): { id: string; score: number }[] {
  const queryWords = queryLower
    .split(/[\s,]+/)
    .map(w => w.replace(/[^a-z0-9]/g, ""))
    .filter(w => w.length > 2 && !MATCH_STOP_WORDS.has(w));

  if (queryWords.length === 0) return [];

  const feedScores: { id: string; name: string; score: number; matchCount: number }[] = [];

  for (const feed of index.feeds) {
    let score = 0;
    let matchCount = 0;
    for (const qw of queryWords) {
      // Exact word match — "web" must NOT match "web3"
      // Allow: query "python" matches feed keyword "python"
      // Allow: query "spacex" matches feed keyword "spacex"
      // Block: query "web" matching feed keyword "web3"
      const matched = feed.keywords.some(fk => fk === qw);
      if (matched) {
        const idfWeight = index.idf.get(qw) || 1;
        // Bonus for longer keywords (more specific)
        const lengthBonus = Math.min(qw.length / 5, 2);
        score += idfWeight * lengthBonus;
        matchCount++;
      }
    }
    if (matchCount >= 1) {
      feedScores.push({ id: feed.id, name: feed.name, score, matchCount });
    }
  }

  // Sort by score, require at least 1 match
  feedScores.sort((a, b) => b.score - a.score);

  // Return top N feeds, but only if they have meaningful scores
  const top = feedScores.slice(0, maxFeeds);
  if (top.length === 0) return [];
  // Second feed must have at least 40% of the top score to be included
  return top.filter((f, i) => i === 0 || f.score >= top[0].score * 0.4);
}

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

  // Serve cached response if fresh. L1 (in-process) first, then L2 (Redis).
  const cacheKey = responseCacheKey(req);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: { ...CACHE_HEADERS, "X-Cache": `HIT-${cached.tier}` },
    });
  }

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

  // ── TF-IDF Feed Matching ──
  // Score all 100+ system feeds by IDF-weighted keyword overlap.
  // Returns top 1-2 feeds. "Python Django web" → Dev (high: django is rare)
  // not Web3 (low: "web" is common across many feeds).
  if (!isAll && feedIds.length === 0) {
    const index = await getFeedIndex(supabase);
    const matched = matchFeeds(queryLower, index, 2);
    feedIds = matched.map(f => f.id);
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
    let queryBuilder = supabase.from("feed_items").select("id, title, url, summary, source, image_url, published_at, relevance_score").in("feed_id", feedIds).order("published_at", { ascending: false }).limit(limit * 4);
    if (cursor) queryBuilder = queryBuilder.lt("published_at", cursor);
    const { data: items } = await queryBuilder;
    results = items || [];

    // ── Within-feed relevance re-ranking ──
    // When matched via TF-IDF (not "all"), re-rank articles by how well
    // their title matches the user's query keywords.
    // "React Next.js tutorials" → boost articles with "React" or "Next.js" in title
    if (!isAll && results.length > 0) {
      const queryKeywords = queryLower
        .split(/[\s,]+/)
        .map((w: string) => w.replace(/[^a-z0-9]/g, ""))
        .filter((w: string) => w.length > 3 && !MATCH_STOP_WORDS.has(w));

      if (queryKeywords.length > 0) {
        results = results.map(item => {
          const titleLower = (item.title || "").toLowerCase();
          const summaryLower = (item.summary || "").toLowerCase();
          const titleHits = queryKeywords.filter((k: string) => titleLower.includes(k)).length;
          const summaryHits = queryKeywords.filter((k: string) => summaryLower.includes(k)).length;
          // Boost: each title hit adds 20 points, summary hit adds 5
          const queryBoost = titleHits * 20 + summaryHits * 5;
          return { ...item, relevance_score: (item.relevance_score || 70) + queryBoost };
        });
      }
    }
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
    if (/Fidelity Capital Investment|cost me \$\d|that'?s why we'?re building|something bigger than just|top .{0,20}designer in|APK.*download|APK.*guide|you need to know about .{0,10}(fitness|gym)|how to start a cryptocurrency exchange|TRX Airdrop|claim \d+.*TRX|claim \d+.*tokens|free airdrop|best gym in|best .{0,20}locations for unforgettable|wedding photography in|free download|maximize your sales|email list$|buy chatgpt.*discount|#ULKQ|#Keywords:/i.test(title)) return false;
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
      // Block Billboard/NME from non-music feeds
      if (/billboard|nme\.com/i.test(itemSource) && !/music|song|album|artist|concert/i.test(queryLower)) return false;
      // Block Hollywood Reporter/IndieWire from non-entertainment feeds
      if (/hollywoodreporter|indiewire/i.test(itemSource) && !/movie|film|tv|show|entertain|actor|director/i.test(queryLower)) return false;
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
  const diversityCap = isAll ? 0.15 : 0.20;
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

  const body = JSON.stringify({
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
  // Fire-and-forget cache write so we don't hold the response on Redis.
  // Guard: never cache empty responses. They poison the cache for the
  // full TTL whenever a transient backend issue (prune window, DB blip,
  // mid-deploy state) makes a query temporarily return nothing. A real
  // empty result for a custom feed retries on the next request — that
  // costs one DB roundtrip until items show up, which is fine.
  if (page.length > 0) {
    void cachePut(cacheKey, body, RESPONSE_TTL_MS);
  }
  return new NextResponse(body, {
    status: 200,
    headers: { ...CACHE_HEADERS, "X-Cache": "MISS" },
  });
}
