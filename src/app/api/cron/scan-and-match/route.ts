import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "@/lib/supabase";
import { scanGlobal, scanBrave, scanBraveVideos } from "@/lib/global-scanner";

// ── Auth ──

function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const expected = `Bearer ${cronSecret}`;
  if (!secret || secret.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Anthropic client (lazy getter — safe for build time) ──

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const AI_MODEL = "claude-haiku-4-5-20251001";
const AI_TIMEOUT = 30_000; // 30s per call

// ── Category system ──

const CATEGORIES: Record<string, string> = {
  tech: "Technology, software, hardware, apps, internet, AI, programming, DevOps, databases, cloud",
  science: "Science, physics, biology, chemistry, space, health, medicine, neuroscience, climate, energy",
  business: "Business, startups, finance, marketing, economics, VC, SaaS, ecommerce, career, freelancing",
  creative: "Design, gaming, music, film, photography, writing, animation, art, podcasting",
  lifestyle: "Productivity, fitness, nutrition, cooking, travel, parenting, pets, gardening, DIY, mental health",
  world: "World news, politics, geopolitics, economics, regional news, policy, governance",
  niche: "Crypto, web3, robotics, EVs, biotech, longevity, legal tech, fashion tech, food tech, insur tech",
};

// Keyword map for instant feed-to-category classification (no AI needed)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  tech: [
    "technology", "software", "hardware", "app", "internet", "ai", "artificial intelligence",
    "programming", "devops", "database", "cloud", "cybersecurity", "machine learning",
    "deep learning", "web development", "mobile", "api", "saas", "developer", "coding",
    "javascript", "python", "rust", "typescript", "react", "node", "frontend", "backend",
    "llm", "gpt", "computer", "data science", "algorithm", "automation",
  ],
  science: [
    "science", "physics", "biology", "chemistry", "space", "health", "medicine",
    "neuroscience", "climate", "energy", "research", "quantum", "nasa", "astronomy",
    "genome", "evolution", "ecology", "geology", "paleontology", "vaccine", "pharma",
  ],
  business: [
    "business", "startup", "finance", "marketing", "economics", "venture capital", "vc",
    "saas", "ecommerce", "career", "freelancing", "entrepreneur", "investment", "stock",
    "market", "revenue", "growth", "funding", "ceo", "leadership", "management",
  ],
  creative: [
    "design", "gaming", "game", "music", "film", "photography", "writing", "animation",
    "art", "podcast", "ux", "ui", "creative", "illustration", "video", "cinema",
    "esports", "indie game", "graphic",
  ],
  lifestyle: [
    "productivity", "fitness", "nutrition", "cooking", "travel", "parenting", "pets",
    "gardening", "diy", "mental health", "wellness", "meditation", "yoga", "recipe",
    "home", "self improvement", "habit",
  ],
  world: [
    "world news", "politics", "geopolitics", "policy", "governance", "election",
    "diplomacy", "war", "conflict", "united nations", "democracy", "government",
    "legislation", "regulation",
  ],
  niche: [
    "crypto", "cryptocurrency", "web3", "blockchain", "robotics", "ev", "electric vehicle",
    "biotech", "longevity", "legal tech", "fashion tech", "food tech", "insur tech",
    "nft", "defi", "autonomous", "drone", "3d printing",
  ],
};

/**
 * Map a feed's query_text to 1-2 categories using keyword matching.
 * Fast, deterministic, no AI cost.
 */
function getFeedCategories(queryText: string): string[] {
  const text = queryText.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > 0) scores[cat] = score;
  }

  // Sort by score descending, take top 2
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    // Fallback: assign to tech + niche if no keywords match
    return ["tech", "niche"];
  }
  if (sorted.length === 1) return [sorted[0][0]];
  return [sorted[0][0], sorted[1][0]];
}

// ── Scan state helpers (uses existing scan_state table: category PK, last_scanned_at) ──

type SupabaseClient = ReturnType<typeof getServiceClient>;

async function getScanState(supabase: SupabaseClient, key: string): Promise<string | null> {
  const { data } = await supabase
    .from("scan_state")
    .select("last_scanned_at")
    .eq("category", key)
    .single();
  return data?.last_scanned_at ?? null;
}

async function setScanState(supabase: SupabaseClient, key: string, value: string): Promise<void> {
  await supabase
    .from("scan_state")
    .upsert({ category: key, last_scanned_at: value }, { onConflict: "category" });
}

// ── AI helpers ──

interface CategorizedArticle {
  i: number;
  c: string[];
}

interface MatchResult {
  a: number;   // article index
  f: string;   // feed UUID
  s: number;   // relevance score
}

/**
 * Try to parse JSON from AI response. If the response has extra text around the JSON,
 * extract the JSON portion.
 */
function safeParseJson<T>(text: string): T | null {
  // Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to extract JSON array from surrounding text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Pass 1: Categorize a batch of articles into categories.
 * One call per ~50 articles. Returns category assignments.
 */
async function categorizeArticleBatch(
  articles: { id: string; title: string; source: string; summary: string }[],
  startIndex: number
): Promise<CategorizedArticle[]> {
  const client = getClient();
  if (!client) return [];

  const categoryDesc = Object.entries(CATEGORIES)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join("\n");

  const articleList = articles
    .map((a, i) => {
      const summary = (a.summary || "").slice(0, 150);
      return summary
        ? `${startIndex + i}|${a.title}|${a.source}|${summary}`
        : `${startIndex + i}|${a.title}|${a.source}`;
    })
    .join("\n");

  const prompt = `Categorize each article into one or more categories.

Categories:
${categoryDesc}

Articles:
${articleList}

Return JSON array: [{"i":0,"c":["tech","science"]},{"i":1,"c":["business"]}]
Only return the JSON, nothing else.`;

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    console.log(`[Pass1] Raw response (${text.length} chars):`, text.slice(0, 200));
    const parsed = safeParseJson<CategorizedArticle[]>(text);
    if (!parsed || !Array.isArray(parsed)) {
      console.error("[Pass1] Failed to parse JSON from:", text.slice(0, 300));
      return [];
    }

    const validated = parsed.filter(
      (entry) =>
        typeof entry.i === "number" &&
        Array.isArray(entry.c) &&
        entry.c.every((c: string) => c in CATEGORIES)
    );
    console.log(`[Pass1] Parsed ${parsed.length} entries, ${validated.length} valid`);
    return validated;
  } catch (err) {
    console.error("Pass 1 categorization failed:", err);
    return [];
  }
}

/**
 * Pass 2: Score articles against feeds within a category.
 * One call per category. Returns article-feed matches with score >= 70.
 */
async function matchArticlesToFeeds(
  categoryKey: string,
  articles: { idx: number; id: string; title: string; source: string; summary: string }[],
  feeds: { id: string; query_text: string }[]
): Promise<MatchResult[]> {
  const client = getClient();
  if (!client || articles.length === 0 || feeds.length === 0) return [];

  const feedList = feeds
    .map((f, i) => `F${i}|${f.id}|${(f.query_text || "").slice(0, 80)}`)
    .join("\n");

  const articleList = articles
    .map((a, i) => {
      const summary = (a.summary || "").slice(0, 120);
      return `A${i}|${a.title}|${a.source}|${summary}`;
    })
    .join("\n");

  const prompt = `Score how relevant each article is to each feed (0-100). Only return pairs scoring 70+.

Feeds:
${feedList}

Articles:
${articleList}

Return JSON: [{"a":0,"f":"feed-uuid","s":85},{"a":0,"f":"other-uuid","s":72}]
Only return matches with score >= 70. An article can match 0-10 feeds.
Only return the JSON, nothing else.`;

  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = safeParseJson<MatchResult[]>(text);
    if (!parsed || !Array.isArray(parsed)) return [];

    // Map A-indices back to article pool IDs and validate
    const validFeedIds = new Set(feeds.map((f) => f.id));
    return parsed
      .filter(
        (m) =>
          typeof m.a === "number" &&
          typeof m.f === "string" &&
          typeof m.s === "number" &&
          m.s >= 70 &&
          m.a >= 0 &&
          m.a < articles.length &&
          validFeedIds.has(m.f)
      )
      .map((m) => ({
        a: m.a,
        f: m.f,
        s: Math.min(100, Math.max(70, m.s)),
      }));
  } catch (err) {
    console.error(`Pass 2 matching failed for category ${categoryKey}:`, err);
    return [];
  }
}

// ── Main pipeline ──

/**
 * Two-pass AI classification pipeline:
 *
 * Phase 1: SCAN — RSS global sources + Brave rotation into article_pool
 * Phase 2: CLASSIFY — Pass 1 categorizes articles, Pass 2 matches to feeds
 * Phase 3: INSERT — high-quality matches (score >= 70) into feed_items
 *
 * Cost per run: ~11 AI calls (6 categorize + 5 match) using Sonnet 4.6
 * Scales with articles, NOT with number of feeds.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const results = {
    phase1_scan: {
      global: { scanned: 0, added: 0 },
      brave: { scanned: 0, added: 0 },
      videos: { scanned: 0, added: 0 },
    },
    phase2_classify: {
      articles_processed: 0,
      pass1_calls: 0,
      pass2_calls: 0,
      categories_used: [] as string[],
    },
    phase3_insert: {
      matches_found: 0,
      articles_inserted: 0,
      feeds_updated: 0,
    },
  };

  // ════════════════════════════════════════════════════════════════
  // PHASE 1: SCAN — collect articles into the pool
  // ════════════════════════════════════════════════════════════════

  // 1A: Global RSS scan (always runs, covers 80% of topics)
  try {
    const globalResult = await scanGlobal();
    results.phase1_scan.global = globalResult;
  } catch (err) {
    console.error("Global scan failed:", err);
  }

  // Get all active feeds for Brave query rotation and classification
  const { data: allFeeds } = await supabase
    .from("feeds")
    .select("id, name, query_text, last_refreshed_at")
    .eq("is_active", true);

  if (!allFeeds || allFeeds.length === 0) {
    return NextResponse.json(results);
  }

  // 1B: Brave web search — scan ALL feeds, cap at 20 queries per cycle
  // Pick the 20 feeds least recently refreshed for maximum coverage
  try {
    // Sort feeds by last_refreshed_at ascending (least recent first, nulls first)
    const sortedFeeds = [...allFeeds].sort((a, b) => {
      const aTime = (a as Record<string, unknown>).last_refreshed_at as string | null;
      const bTime = (b as Record<string, unknown>).last_refreshed_at as string | null;
      if (!aTime && !bTime) return 0;
      if (!aTime) return -1;
      if (!bTime) return 1;
      return aTime.localeCompare(bTime);
    });

    const braveQueries = sortedFeeds
      .map((f) => f.query_text)
      .filter(Boolean)
      .slice(0, 20);

    if (braveQueries.length > 0) {
      const braveResult = await scanBrave(braveQueries);
      results.phase1_scan.brave = braveResult;
    }
  } catch (err) {
    console.error("Brave scan failed:", err);
  }

  // 1C: Brave video search — always search 10 diverse topics (no rotation)
  try {
    const videoResult = await scanBraveVideos();
    results.phase1_scan.videos = videoResult;
  } catch (err) {
    console.error("Brave video scan failed:", err);
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE 2: TWO-PASS AI CLASSIFICATION
  // ════════════════════════════════════════════════════════════════

  if (!getClient()) {
    console.warn("No Anthropic API key — skipping AI classification");
    return NextResponse.json({ ...results, warning: "No AI key, scan-only mode" });
  }

  // Get new articles since last classification (fallback: last 24h)
  const lastClassifiedAt = await getScanState(supabase, "last_classified_at");
  const cutoff = lastClassifiedAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: newArticles } = await supabase
    .from("article_pool")
    .select("id, title, summary, source, url")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(300);

  if (!newArticles || newArticles.length === 0) {
    // No new articles to classify — update timestamp and return
    await setScanState(supabase, "last_classified_at", new Date().toISOString());
    return NextResponse.json({ ...results, note: "No new articles to classify" });
  }

  results.phase2_classify.articles_processed = newArticles.length;

  // Map each feed to its categories (instant, keyword-based)
  const feedCategoryMap = new Map<string, string[]>();
  for (const feed of allFeeds) {
    feedCategoryMap.set(feed.id, getFeedCategories(feed.query_text || ""));
  }

  // Build reverse map: category -> feeds in that category
  const categoryFeeds = new Map<string, { id: string; query_text: string }[]>();
  for (const feed of allFeeds) {
    const cats = feedCategoryMap.get(feed.id) || [];
    for (const cat of cats) {
      if (!categoryFeeds.has(cat)) categoryFeeds.set(cat, []);
      categoryFeeds.get(cat)!.push({ id: feed.id, query_text: feed.query_text });
    }
  }

  // ── Pass 1: Categorize articles in batches of 50 ──

  const BATCH_SIZE = 50;
  // articleCategories[i] = list of categories for newArticles[i]
  const articleCategories: string[][] = new Array(newArticles.length).fill(null).map(() => []);

  for (let i = 0; i < newArticles.length; i += BATCH_SIZE) {
    const batch = newArticles.slice(i, i + BATCH_SIZE);
    let categorized: CategorizedArticle[] = [];

    // Try with 1 retry
    for (let attempt = 0; attempt < 2; attempt++) {
      categorized = await categorizeArticleBatch(batch, i);
      if (categorized.length > 0) break;
      if (attempt === 0) console.warn(`Pass 1 retry for batch starting at ${i}`);
    }

    results.phase2_classify.pass1_calls++;

    for (const entry of categorized) {
      if (entry.i >= 0 && entry.i < newArticles.length) {
        articleCategories[entry.i] = entry.c;
      }
    }
  }

  // ── Pass 2: Match articles to feeds per category ──

  // Build category -> articles map
  const categoryArticles = new Map<
    string,
    { idx: number; id: string; title: string; source: string; summary: string }[]
  >();

  for (let i = 0; i < newArticles.length; i++) {
    const cats = articleCategories[i];
    if (!cats || cats.length === 0) continue;

    for (const cat of cats) {
      if (!categoryArticles.has(cat)) categoryArticles.set(cat, []);
      categoryArticles.get(cat)!.push({
        idx: i,
        id: newArticles[i].id,
        title: newArticles[i].title,
        source: newArticles[i].source,
        summary: newArticles[i].summary,
      });
    }
  }

  // Collect all matches: { articlePoolId, feedId, score }
  const allMatches: { articlePoolId: string; feedId: string; score: number }[] = [];
  const categoriesUsed: string[] = [];

  for (const [cat, articles] of categoryArticles.entries()) {
    const feeds = categoryFeeds.get(cat);
    if (!feeds || feeds.length === 0) continue;

    // Cap at 50 articles per category call
    const cappedArticles = articles.slice(0, 50);
    categoriesUsed.push(cat);

    let matches: MatchResult[] = [];

    // Try with 1 retry
    for (let attempt = 0; attempt < 2; attempt++) {
      matches = await matchArticlesToFeeds(cat, cappedArticles, feeds);
      if (matches.length > 0 || attempt > 0) break;
      console.warn(`Pass 2 retry for category ${cat}`);
    }

    results.phase2_classify.pass2_calls++;

    for (const m of matches) {
      if (m.a >= 0 && m.a < cappedArticles.length) {
        allMatches.push({
          articlePoolId: cappedArticles[m.a].id,
          feedId: m.f,
          score: m.s,
        });
      }
    }
  }

  results.phase2_classify.categories_used = categoriesUsed;
  results.phase3_insert.matches_found = allMatches.length;

  // ════════════════════════════════════════════════════════════════
  // PHASE 3: INSERT matches into feed_items
  // ════════════════════════════════════════════════════════════════

  if (allMatches.length === 0) {
    await setScanState(supabase, "last_classified_at", new Date().toISOString());
    return NextResponse.json(results);
  }

  // Deduplicate: keep highest score per article-feed pair
  const dedupKey = (articlePoolId: string, feedId: string) => `${articlePoolId}::${feedId}`;
  const bestMatches = new Map<string, { articlePoolId: string; feedId: string; score: number }>();
  for (const m of allMatches) {
    const key = dedupKey(m.articlePoolId, m.feedId);
    const existing = bestMatches.get(key);
    if (!existing || m.score > existing.score) {
      bestMatches.set(key, m);
    }
  }

  // Check which article-feed pairs already exist
  const matchedArticleIds = [...new Set([...bestMatches.values()].map((m) => m.articlePoolId))];
  const matchedFeedIds = [...new Set([...bestMatches.values()].map((m) => m.feedId))];

  const { data: existingItems } = await supabase
    .from("feed_items")
    .select("article_pool_id, feed_id")
    .in("article_pool_id", matchedArticleIds)
    .in("feed_id", matchedFeedIds);

  const existingPairs = new Set(
    (existingItems || []).map(
      (e: { article_pool_id: string; feed_id: string }) => dedupKey(e.article_pool_id, e.feed_id)
    )
  );

  // Filter to only new pairs
  const newMatches = [...bestMatches.values()].filter(
    (m) => !existingPairs.has(dedupKey(m.articlePoolId, m.feedId))
  );

  if (newMatches.length === 0) {
    await setScanState(supabase, "last_classified_at", new Date().toISOString());
    return NextResponse.json(results);
  }

  // Fetch full article data for the matched articles
  const articleIdsToFetch = [...new Set(newMatches.map((m) => m.articlePoolId))];
  const { data: fullArticles } = await supabase
    .from("article_pool")
    .select("id, url, image_url, published_at, title, summary, source")
    .in("id", articleIdsToFetch);

  if (!fullArticles || fullArticles.length === 0) {
    await setScanState(supabase, "last_classified_at", new Date().toISOString());
    return NextResponse.json(results);
  }

  const articleMap = new Map(fullArticles.map((a) => [a.id, a]));
  const feedsUpdated = new Set<string>();

  // Build insert rows
  const toInsert = newMatches
    .map((m) => {
      const article = articleMap.get(m.articlePoolId);
      if (!article) return null;
      feedsUpdated.add(m.feedId);
      return {
        feed_id: m.feedId,
        article_pool_id: m.articlePoolId,
        title: article.title,
        url: article.url,
        summary: article.summary,
        source: article.source,
        image_url: article.image_url,
        relevance_score: m.score,
        published_at: article.published_at,
      };
    })
    .filter(Boolean);

  // Insert in batches of 100
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { error } = await supabase.from("feed_items").insert(chunk);
    if (error) {
      console.error(`Insert batch failed at offset ${i}:`, error);
    } else {
      results.phase3_insert.articles_inserted += chunk.length;
    }
  }

  // Update last_refreshed_at for feeds that got new items
  const now = new Date().toISOString();
  for (const feedId of feedsUpdated) {
    await supabase
      .from("feeds")
      .update({ last_refreshed_at: now })
      .eq("id", feedId);
  }
  results.phase3_insert.feeds_updated = feedsUpdated.size;

  // Update classification timestamp
  await setScanState(supabase, "last_classified_at", now);

  return NextResponse.json(results);
}
