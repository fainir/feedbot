/**
 * Next.js Instrumentation hook — runs once when the server starts.
 * Calls scan functions DIRECTLY (no HTTP) to avoid Railway proxy timeout.
 * Runs every 15 minutes. First run forces all feeds.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const INTERVAL = 15 * 60 * 1000; // 15 minutes

    if (!process.env.CRON_SECRET) {
      console.log("[Cron] CRON_SECRET not set, skipping auto-scan");
      return;
    }

    console.log(`[Cron] Starting auto-scan loop every ${INTERVAL / 60000} minutes`);

    // First run after deploy (30s warmup)
    setTimeout(() => runDirectScan(true), 30_000);
    // Subsequent runs
    setInterval(() => runDirectScan(false), INTERVAL);
  }
}

async function runDirectScan(forceAll: boolean) {
  console.log(`[Cron] Running scan...${forceAll ? " (force-all)" : ""}`);
  try {
    // Import and call scan functions directly — no HTTP, no proxy timeout
    const { scanGlobal, scanForPlan, scanBrave } = await import("@/lib/global-scanner");
    const { scoreArticles, preFilterArticles } = await import("@/lib/ai-matcher");
    const { generateSearchPlan } = await import("@/lib/prompt-intelligence");
    const { getServiceClient } = await import("@/lib/supabase");
    type SearchPlan = Awaited<ReturnType<typeof generateSearchPlan>>;

    const supabase = getServiceClient();

    // Phase 1A: Global scan
    const globalResult = await scanGlobal().catch(() => ({ scanned: 0, added: 0 }));
    console.log(`[Cron] Global: ${globalResult.added} added`);

    // Get active feeds
    const { data: allFeeds } = await supabase
      .from("feeds")
      .select("id, query_text, last_refreshed_at, search_plan, schedule")
      .eq("is_active", true);

    if (!allFeeds || allFeeds.length === 0) {
      console.log("[Cron] No active feeds");
      return;
    }

    // Filter by schedule
    const now = Date.now();
    const feeds = forceAll ? allFeeds : allFeeds.filter((feed) => {
      if (!feed.last_refreshed_at) return true;
      const elapsed = now - new Date(feed.last_refreshed_at).getTime();
      switch (feed.schedule) {
        case "realtime": return elapsed > 10 * 60 * 1000;
        case "hourly": return elapsed > 50 * 60 * 1000;
        default: return elapsed > 12 * 60 * 60 * 1000;
      }
    });

    if (feeds.length === 0) {
      console.log(`[Cron] ${allFeeds.length} feeds not due`);
      return;
    }

    // Phase 1B: Generate missing search plans
    for (const feed of feeds) {
      if (!feed.search_plan) {
        try {
          const plan = await generateSearchPlan(feed.query_text);
          await supabase.from("feeds").update({ search_plan: plan }).eq("id", feed.id);
          feed.search_plan = plan;
        } catch {}
      }
    }

    // Phase 1C: Targeted scan per plan
    const scannedPlans = new Set<string>();
    for (const feed of feeds) {
      const plan = feed.search_plan as SearchPlan | null;
      if (!plan?.google_queries?.length) continue;
      const planKey = plan.google_queries.slice(0, 2).join("|");
      if (scannedPlans.has(planKey)) continue;
      scannedPlans.add(planKey);
      await scanForPlan(plan).catch(() => {});
    }

    // Phase 1D: Brave search
    const braveQueries: string[] = [];
    const seenQ = new Set<string>();
    for (const feed of feeds) {
      const plan = feed.search_plan as SearchPlan | null;
      if (!plan?.google_queries?.length) continue;
      for (const q of plan.google_queries.slice(0, 2)) {
        const key = q.toLowerCase().trim();
        if (!seenQ.has(key)) { seenQ.add(key); braveQueries.push(q); }
      }
    }
    if (braveQueries.length > 0) {
      await scanBrave(braveQueries.slice(0, 10)).catch(() => {});
    }

    // Phase 2: AI match
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentArticles } = await supabase
      .from("article_pool")
      .select("id, title, summary, source")
      .gte("published_at", threeDaysAgo)
      .order("published_at", { ascending: false })
      .limit(1000);

    if (!recentArticles || recentArticles.length === 0) {
      console.log("[Cron] No recent articles in pool");
      return;
    }

    let totalAdded = 0;
    let feedsProcessed = 0;

    for (const feed of feeds) {
      try {
        const plan = feed.search_plan as SearchPlan | null;
        const { data: existing } = await supabase
          .from("feed_items")
          .select("article_pool_id")
          .eq("feed_id", feed.id)
          .not("article_pool_id", "is", null);

        const existingIds = new Set((existing || []).map((e: { article_pool_id: string }) => e.article_pool_id));
        const newArticles = recentArticles.filter((a) => !existingIds.has(a.id));
        if (newArticles.length === 0) continue;

        const preFiltered = preFilterArticles(feed.query_text, newArticles, plan);
        if (preFiltered.length === 0) continue;

        const scored = await scoreArticles(feed.query_text, preFiltered, plan);
        const relevant = scored.filter((s) => s.score >= 70);
        if (relevant.length === 0) continue;

        const relevantIds = new Set(relevant.map((r) => r.id));
        const scoreMap = new Map(relevant.map((r) => [r.id, r.score]));

        const { data: fullArticles } = await supabase
          .from("article_pool")
          .select("id, url, image_url, published_at, title, summary, source")
          .in("id", Array.from(relevantIds));

        if (fullArticles && fullArticles.length > 0) {
          const rows = fullArticles.map((a) => ({
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
          await supabase.from("feed_items").insert(rows);
          totalAdded += rows.length;
        }

        feedsProcessed++;
        await supabase.from("feeds").update({ last_refreshed_at: new Date().toISOString() }).eq("id", feed.id);
      } catch (err) {
        console.error(`[Cron] Feed ${feed.id} failed:`, err);
      }
    }

    console.log(`[Cron] Done: ${feedsProcessed} feeds, ${totalAdded} articles added`);
  } catch (err) {
    console.error("[Cron] Scan failed:", err);
  }

  // Email digests
  try {
    const { sendDigests } = await import("@/lib/email-digest");
    const result = await sendDigests();
    if (result.sent > 0) console.log(`[Cron] Digests: ${result.sent} sent`);
  } catch {}
}
