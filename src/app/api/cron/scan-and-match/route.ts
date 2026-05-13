import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase";
import { scanGlobal, scanBrave, scanBraveVideos, scanGoogleNews } from "@/lib/global-scanner";
import { classifyAndInsert } from "@/lib/classify";

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

async function classify(supabase: SupabaseClient) {
  const { data: feeds } = await supabase
    .from("feeds")
    .select("id, name, query_text")
    .eq("is_active", true);

  if (!feeds || feeds.length === 0) return { error: "No active feeds" };

  const lastClassified = await getScanState(supabase, "last_classified_at");
  const cutoff = lastClassified || new Date(Date.now() - 24 * 3600_000).toISOString();

  const { data: articles } = await supabase
    .from("article_pool")
    .select("id, title, summary, source, url, image_url, published_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!articles || articles.length === 0) {
    await setScanState(supabase, "last_classified_at", new Date().toISOString());
    return { articles: 0, matches: 0, inserted: 0 };
  }

  // Skip articles already matched to any feed
  const articleIds = articles.map(a => a.id);
  const { data: alreadyMatched } = await supabase
    .from("feed_items")
    .select("article_pool_id")
    .in("article_pool_id", articleIds.slice(0, 200));
  const matchedSet = new Set((alreadyMatched || []).map((r: { article_pool_id: string }) => r.article_pool_id));
  const newArticles = articles.filter(a => !matchedSet.has(a.id));

  if (newArticles.length === 0) {
    await setScanState(supabase, "last_classified_at", new Date().toISOString());
    return { articles: articles.length, skipped: articles.length, matches: 0, inserted: 0 };
  }

  const result = await classifyAndInsert(newArticles, feeds, supabase);

  // Update last_refreshed_at for feeds that got new items — best effort
  const now = new Date().toISOString();
  await setScanState(supabase, "last_classified_at", now);

  return { articles: articles.length, newArticles: newArticles.length, skipped: articles.length - newArticles.length, ...result };
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
    const classifyResult = await classify(supabase);
    return NextResponse.json({ classify: classifyResult });
  }

  // phase=all: scan then classify
  const scanResult = await scan(supabase);
  if (typeof global !== "undefined" && (global as { gc?: () => void }).gc) {
    (global as { gc: () => void }).gc();
  }
  const classifyResult = await classify(supabase);
  return NextResponse.json({ scan: scanResult, classify: classifyResult });
}
