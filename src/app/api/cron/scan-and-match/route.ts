import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase";
import { scanGlobal, scanForPlan, scanBrave } from "@/lib/global-scanner";
import { scoreArticles, preFilterArticles } from "@/lib/ai-matcher";
import { generateSearchPlan, type SearchPlan } from "@/lib/prompt-intelligence";

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

/**
 * Three-phase pipeline:
 *
 * Phase 1: SCAN — global sources + per-feed targeted sources into article_pool
 * Phase 2: MATCH — AI-score pool articles against each feed's prompt
 * Phase 3: INSERT — only high-quality matches (score >= 70) into feed_items
 *
 * Cost per run: ~$0.05 for 15 feeds (Haiku scoring + plan generation)
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const results = {
    phase1_scan: { global: { scanned: 0, added: 0 }, targeted: { scanned: 0, added: 0 }, brave: { scanned: 0, added: 0 } },
    phase2_match: { feeds_processed: 0, articles_added: 0, ai_calls: 0 },
    plans_generated: 0,
  };

  // ── Phase 1A: Global scan (covers 80% of prompts) ──
  try {
    const globalResult = await scanGlobal();
    results.phase1_scan.global = globalResult;
  } catch (err) {
    console.error("Global scan failed:", err);
  }

  // ── Get all active feeds ──
  const { data: feeds } = await supabase
    .from("feeds")
    .select("id, query_text, last_refreshed_at, search_plan")
    .eq("is_active", true);

  if (!feeds || feeds.length === 0) {
    return NextResponse.json(results);
  }

  // ── Phase 1B: Generate search plans for feeds that don't have one ──
  for (const feed of feeds) {
    if (!feed.search_plan) {
      try {
        const plan = await generateSearchPlan(feed.query_text);
        await supabase
          .from("feeds")
          .update({ search_plan: plan })
          .eq("id", feed.id);
        feed.search_plan = plan;
        results.plans_generated++;
      } catch (err) {
        console.error(`Plan generation failed for feed ${feed.id}:`, err);
      }
    }
  }

  // ── Phase 1C: Targeted scan for custom feeds with search plans ──
  // Deduplicate plans to avoid scanning same sources twice
  const scannedPlans = new Set<string>();
  for (const feed of feeds) {
    const plan = feed.search_plan as SearchPlan | null;
    if (!plan?.google_queries?.length) continue;

    const planKey = plan.google_queries.slice(0, 2).join("|");
    if (scannedPlans.has(planKey)) continue;
    scannedPlans.add(planKey);

    try {
      const targeted = await scanForPlan(plan);
      results.phase1_scan.targeted.scanned += targeted.scanned;
      results.phase1_scan.targeted.added += targeted.added;
    } catch (err) {
      console.error(`Targeted scan failed:`, err);
    }
  }

  // ── Brave Search for extra coverage (if API key available) ──
  try {
    const braveResult = await scanBrave();
    results.phase1_scan.brave = braveResult;
  } catch {
    // Brave is optional
  }

  // ── Phase 2: AI-match pool articles to feeds ──
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentArticles } = await supabase
    .from("article_pool")
    .select("id, title, summary, source")
    .gte("published_at", oneDayAgo)
    .order("published_at", { ascending: false })
    .limit(500);

  if (!recentArticles || recentArticles.length === 0) {
    return NextResponse.json(results);
  }

  for (const feed of feeds) {
    try {
      const plan = feed.search_plan as SearchPlan | null;

      // Get already-matched article IDs
      const { data: existing } = await supabase
        .from("feed_items")
        .select("article_pool_id")
        .eq("feed_id", feed.id)
        .not("article_pool_id", "is", null);

      const existingPoolIds = new Set(
        (existing || []).map((e: { article_pool_id: string }) => e.article_pool_id)
      );

      // Filter out already-matched
      const newArticles = recentArticles.filter((a) => !existingPoolIds.has(a.id));
      if (newArticles.length === 0) continue;

      // Smart pre-filter with search plan (free, cuts ~80% of articles)
      const preFiltered = preFilterArticles(feed.query_text, newArticles, plan);
      if (preFiltered.length === 0) continue;

      // AI score with quality guidance from search plan
      const scored = await scoreArticles(feed.query_text, preFiltered, plan);
      results.phase2_match.ai_calls++;

      // Only high-quality matches (70+)
      const relevant = scored.filter((s) => s.score >= 70);
      if (relevant.length === 0) continue;

      // Build insert rows
      const relevantIds = new Set(relevant.map((r) => r.id));
      const scoreMap = new Map(relevant.map((r) => [r.id, r.score]));

      // Get full article data from pool
      const { data: fullArticles } = await supabase
        .from("article_pool")
        .select("id, url, image_url, published_at, title, summary, source")
        .in("id", Array.from(relevantIds));

      if (!fullArticles || fullArticles.length === 0) continue;

      const toInsert = fullArticles.map((a) => ({
        feed_id: feed.id,
        article_pool_id: a.id,
        title: a.title,
        url: a.url,
        summary: a.summary,
        source: a.source,
        image_url: a.image_url,
        relevance_score: scoreMap.get(a.id) || 70,
        published_at: a.published_at,
      }));

      if (toInsert.length > 0) {
        await supabase.from("feed_items").insert(toInsert);
        results.phase2_match.articles_added += toInsert.length;
      }

      results.phase2_match.feeds_processed++;

      await supabase
        .from("feeds")
        .update({ last_refreshed_at: new Date().toISOString() })
        .eq("id", feed.id);
    } catch (err) {
      console.error(`Feed ${feed.id} matching failed:`, err);
    }
  }

  return NextResponse.json(results);
}
