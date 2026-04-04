import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase";
import { scanGlobal, scanForPlan, scanBrave } from "@/lib/global-scanner";
import { scoreArticles, preFilterArticles, type FeedbackHint } from "@/lib/ai-matcher";
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
  const { data: allFeeds } = await supabase
    .from("feeds")
    .select("id, query_text, last_refreshed_at, search_plan, schedule")
    .eq("is_active", true);

  if (!allFeeds || allFeeds.length === 0) {
    return NextResponse.json(results);
  }

  // ── Filter feeds that are due for refresh based on schedule ──
  // Always process all feeds on first run after deploy (forceAll param)
  const forceAll = request.nextUrl.searchParams.get("force") === "1";
  const now = Date.now();
  const feeds = forceAll ? allFeeds : allFeeds.filter((feed) => {
    if (!feed.last_refreshed_at) return true; // never refreshed
    const lastRefresh = new Date(feed.last_refreshed_at).getTime();
    const elapsed = now - lastRefresh;
    switch (feed.schedule) {
      case "realtime": return elapsed > 10 * 60 * 1000;   // 10 min
      case "hourly":   return elapsed > 50 * 60 * 1000;   // 50 min
      case "daily":
      default:         return elapsed > 12 * 60 * 60 * 1000; // 12 hours (was 23h, too long for daily)
    }
  });

  if (feeds.length === 0) {
    return NextResponse.json({ ...results, skipped: `${allFeeds.length} feeds not due` });
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
  // Use per-feed search plan queries instead of generic defaults
  try {
    const braveQueries: string[] = [];
    const seenQueries = new Set<string>();
    for (const feed of feeds) {
      const plan = feed.search_plan as SearchPlan | null;
      if (!plan?.google_queries?.length) continue;
      for (const q of plan.google_queries.slice(0, 2)) {
        const key = q.toLowerCase().trim();
        if (!seenQueries.has(key)) {
          seenQueries.add(key);
          braveQueries.push(q);
        }
      }
    }
    if (braveQueries.length > 0) {
      // Cap at 10 queries per cycle to stay within free tier (2000/month)
      const braveResult = await scanBrave(braveQueries.slice(0, 10));
      results.phase1_scan.brave = braveResult;
    } else {
      const braveResult = await scanBrave();
      results.phase1_scan.brave = braveResult;
    }
  } catch {
    // Brave is optional
  }

  // ── Phase 2: AI-match pool articles to feeds ──
  // Use 3-day window to ensure thin feeds (Space, Health) have enough candidates
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentArticles } = await supabase
    .from("article_pool")
    .select("id, title, summary, source")
    .gte("published_at", threeDaysAgo)
    .order("published_at", { ascending: false })
    .limit(1000);

  if (!recentArticles || recentArticles.length === 0) {
    return NextResponse.json(results);
  }

  // ── Load user feedback (reactions) for personalized scoring ──
  const feedbackMap = new Map<string, FeedbackHint>();
  try {
    const feedIds = feeds.map((f) => f.id);
    const { data: reactions } = await supabase
      .from("reactions")
      .select("feed_item_id, reaction, feed_items!inner(feed_id, title, source)")
      .in("feed_items.feed_id", feedIds)
      .order("created_at", { ascending: false })
      .limit(200);

    if (reactions) {
      for (const r of reactions as unknown as Array<{ reaction: string; feed_items: { feed_id: string; title: string; source: string } }>) {
        const feedId = r.feed_items.feed_id;
        if (!feedbackMap.has(feedId)) {
          feedbackMap.set(feedId, { likedSources: [], dislikedSources: [], likedTopics: [], dislikedTopics: [] });
        }
        const fb = feedbackMap.get(feedId)!;
        const src = r.feed_items.source.toLowerCase();
        const titleWords = r.feed_items.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4).slice(0, 3);
        if (r.reaction === "like") {
          if (!fb.likedSources.includes(src)) fb.likedSources.push(src);
          fb.likedTopics.push(...titleWords.filter((w) => !fb.likedTopics.includes(w)));
        } else {
          if (!fb.dislikedSources.includes(src)) fb.dislikedSources.push(src);
          fb.dislikedTopics.push(...titleWords.filter((w) => !fb.dislikedTopics.includes(w)));
        }
      }
    }
  } catch {
    // Feedback is optional — proceed without it
  }

  for (const feed of feeds) {
    try {
      const plan = feed.search_plan as SearchPlan | null;
      const feedback = feedbackMap.get(feed.id) || null;

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

      // AI score with quality guidance from search plan + user feedback
      const scored = await scoreArticles(feed.query_text, preFiltered, plan, feedback);
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
