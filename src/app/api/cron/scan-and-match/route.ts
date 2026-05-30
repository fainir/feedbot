import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase";
import { scanGlobal, scanBrave, scanBraveVideos, scanGoogleNews } from "@/lib/global-scanner";
import { classifyAndInsert } from "@/lib/classify";
import { fillFeeds } from "@/lib/feed-fill";
import { topUpStarvingFeeds } from "@/lib/feed-engine";
import { warmFeedCache } from "@/lib/cache-warmer";

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

type SupabaseClient = ReturnType<typeof getServiceClient>;

async function getScanState(supabase: SupabaseClient, key: string): Promise<string | null> {
  const { data } = await supabase.from("scan_state").select("last_scanned_at").eq("category", key).single();
  return data?.last_scanned_at ?? null;
}

async function setScanState(supabase: SupabaseClient, key: string, value: string): Promise<void> {
  await supabase.from("scan_state").upsert({ category: key, last_scanned_at: value }, { onConflict: "category" });
}

// ── Lossless classify cursor ──
// A forward keyset position on article_pool (created_at, id). We process
// oldest-unclassified first and only ever advance PAST rows we actually
// fetched, so no article is ever skipped (the old "newest-200 then jump
// cutoff to now()" scheme silently dropped the tail of every >200 burst).
const CLASSIFY_CURSOR_KEY = "classify_cursor";
type ClassifyCursor = { createdAt: string; id: string };

async function getClassifyCursor(supabase: SupabaseClient): Promise<ClassifyCursor | null> {
  const { data } = await supabase
    .from("scan_state")
    .select("last_scanned_at, cursor_id")
    .eq("category", CLASSIFY_CURSOR_KEY)
    .single();
  if (!data?.last_scanned_at || !data?.cursor_id) return null;
  return { createdAt: data.last_scanned_at as string, id: data.cursor_id as string };
}

async function setClassifyCursor(supabase: SupabaseClient, c: ClassifyCursor): Promise<void> {
  await supabase
    .from("scan_state")
    .upsert(
      { category: CLASSIFY_CURSOR_KEY, last_scanned_at: c.createdAt, cursor_id: c.id },
      { onConflict: "category" },
    );
}

// ════════════════════════════════════════════════════════════════
// STEP 1: SCAN — fetch RSS + Brave → article_pool
// ════════════════════════════════════════════════════════════════

async function scan(supabase: SupabaseClient) {
  const results = { global: { scanned: 0, added: 0 }, googleNews: { scanned: 0, added: 0, feeds: 0 }, brave: { scanned: 0, added: 0 }, videos: { scanned: 0, added: 0 } };

  try { results.global = await scanGlobal(); } catch (e) { console.error("Global scan failed:", e); }
  try { results.googleNews = await scanGoogleNews(5); } catch (e) { console.error("Google News scan failed:", e); }

  // Brave and video search: rate-limited to once per hour
  const lastBrave = await getScanState(supabase, "last_brave_scan_at");
  const braveAgeMs = lastBrave ? Date.now() - new Date(lastBrave).getTime() : Infinity;
  const BRAVE_INTERVAL_MS = 60 * 60_000; // 1 hour

  if (braveAgeMs >= BRAVE_INTERVAL_MS) {
    try {
      const { data: feeds } = await supabase.from("feeds").select("id, query_text, last_refreshed_at").eq("is_active", true);
      if (feeds && feeds.length > 0) {
        const sorted = [...feeds].sort((a, b) => {
          const at = (a as Record<string, unknown>).last_refreshed_at as string | null;
          const bt = (b as Record<string, unknown>).last_refreshed_at as string | null;
          if (!at && !bt) return 0; if (!at) return -1; if (!bt) return 1;
          return at.localeCompare(bt);
        });
        const queries = sorted.map(f => f.query_text).filter(Boolean).slice(0, 20);
        if (queries.length > 0) results.brave = await scanBrave(queries);
      }
    } catch (e) { console.error("Brave scan failed:", e); }

    try { results.videos = await scanBraveVideos(); } catch (e) { console.error("Video scan failed:", e); }

    await setScanState(supabase, "last_brave_scan_at", new Date().toISOString());
  } else {
    const minsAgo = Math.round(braveAgeMs / 60_000);
    console.log(`Brave skipped — last ran ${minsAgo}m ago (limit: 60m)`);
  }

  return results;
}

// ════════════════════════════════════════════════════════════════
// STEP 2: CLASSIFY — give AI the articles + feed prompts → matches
// ════════════════════════════════════════════════════════════════

// One page of the keyset scan. 200 keeps each classifyAndInsert pass
// (BATCH=10 → 20 LLM calls) within memory + time bounds.
const CLASSIFY_PAGE = 200;
// Drain up to this many pages per tick so a tick can process 200–1,200
// articles and clear bursts (avg intake ~215/tick). Bounded so a tick
// can't run unbounded.
const CLASSIFY_MAX_PAGES = 6;
// Stay comfortably under the cron's 180s phase abort.
const CLASSIFY_TIME_BUDGET_MS = 150_000;

async function classify(supabase: SupabaseClient) {
  const { data: feeds } = await supabase
    .from("feeds")
    .select("id, name, query_text")
    .eq("is_active", true);

  if (!feeds || feeds.length === 0) return { error: "No active feeds" };

  const startedAt = Date.now();
  const recencyFloor = new Date(Date.now() - 7 * 24 * 3600000).toISOString();

  // First run (no cursor yet): start 24h back so we don't try to drain the
  // entire 7-day pool in one go. Subsequent runs continue from the cursor.
  let cursor = await getClassifyCursor(supabase);
  const bootstrapFloor = cursor ? null : new Date(Date.now() - 24 * 3600_000).toISOString();

  let totalArticles = 0;
  let totalNew = 0;
  let totalSkipped = 0;
  let totalMatches = 0;
  let totalInserted = 0;
  let pages = 0;

  while (pages < CLASSIFY_MAX_PAGES && Date.now() - startedAt < CLASSIFY_TIME_BUDGET_MS) {
    pages++;

    let query = supabase
      .from("article_pool")
      .select("id, title, summary, source, url, image_url, published_at, created_at")
      .gte("published_at", recencyFloor)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(CLASSIFY_PAGE);

    if (cursor) {
      // Strict keyset: rows after (cursor.createdAt, cursor.id). The id
      // tie-break is essential — bulk inserts share created_at via now().
      query = query.or(
        `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`,
      );
    } else if (bootstrapFloor) {
      query = query.gte("created_at", bootstrapFloor);
    }

    const { data: articles } = await query;
    if (!articles || articles.length === 0) break;

    totalArticles += articles.length;

    // Advance the cursor to the LAST fetched row — always, even for rows
    // that match no feed. Otherwise no-match articles would be re-fetched
    // forever at the boundary. Persist after each page so a mid-tick crash
    // resumes cleanly instead of re-classifying.
    const last = articles[articles.length - 1];
    cursor = { createdAt: last.created_at as string, id: last.id };

    // Safety net: skip anything already in feed_items (e.g. classified by a
    // per-feed refresh between ticks).
    const ids = articles.map((a) => a.id);
    const { data: alreadyMatched } = await supabase
      .from("feed_items")
      .select("article_pool_id")
      .in("article_pool_id", ids);
    const matchedSet = new Set(
      (alreadyMatched || []).map((r: { article_pool_id: string }) => r.article_pool_id),
    );
    const newArticles = articles.filter((a) => !matchedSet.has(a.id));
    totalSkipped += articles.length - newArticles.length;
    totalNew += newArticles.length;

    if (newArticles.length > 0) {
      const result = await classifyAndInsert(newArticles, feeds, supabase);
      totalMatches += result.matches;
      totalInserted += result.inserted;
    }

    await setClassifyCursor(supabase, cursor);

    if (typeof global !== "undefined" && (global as { gc?: () => void }).gc) {
      (global as { gc: () => void }).gc();
    }

    // Less than a full page means we've drained everything available.
    if (articles.length < CLASSIFY_PAGE) break;
  }

  return {
    articles: totalArticles,
    newArticles: totalNew,
    skipped: totalSkipped,
    matches: totalMatches,
    inserted: totalInserted,
    pages,
  };
}

// ════════════════════════════════════════════════════════════════
// Route handler
// ════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phase = new URL(request.url).searchParams.get("phase") || "all";
  const supabase = getServiceClient();

  if (phase === "scan") {
    const scanResult = await scan(supabase);
    return NextResponse.json({ scan: scanResult });
  }

  if (phase === "classify") {
    // Legacy push-classify. Superseded by semantic fill (phase=fill) but
    // kept callable for ad-hoc use / the instant new-feed path.
    const classifyResult = await classify(supabase);
    return NextResponse.json({ classify: classifyResult });
  }

  if (phase === "fill") {
    const fillResult = await fillFeeds(supabase);
    return NextResponse.json({ fill: fillResult });
  }

  if (phase === "topup") {
    // Demand-driven targeted search for feeds below the freshness SLO
    // (niche + brand-new). Free Google News + capped Brave.
    const topupResult = await topUpStarvingFeeds(supabase);
    return NextResponse.json({ topup: topupResult });
  }

  // phase=all: scan → classify → warm. Classify (lossless cursor + umbrella)
  // is the default, free-tier-friendly path. Semantic fill is env-gated.
  const scanResult = await scan(supabase);
  if (typeof global !== "undefined" && (global as { gc?: () => void }).gc) {
    (global as { gc: () => void }).gc();
  }
  const classifyResult = process.env.EVO_SEMANTIC === "1"
    ? await fillFeeds(supabase)
    : await classify(supabase);

  // Pre-warm the public feed caches on every cron tick — not just when new
  // items landed. The L1/L2 TTL is shorter than the cron interval, so even
  // when no fresh content arrives, the cached responses can expire between
  // ticks. Warming unconditionally costs ~35 cheap localhost requests and
  // gives a near-100% HIT rate for visitors.
  let warmResult: { warmed: number; hits: number } | undefined;
  try {
    const w = await warmFeedCache();
    warmResult = { warmed: w.warmed, hits: w.hits };
  } catch (e) {
    warmResult = { warmed: 0, hits: 0 };
    console.warn("[cron] cache warm failed:", (e as Error).message);
  }

  return NextResponse.json({ scan: scanResult, classify: classifyResult, warm: warmResult });
}
