/**
 * Next.js Instrumentation hook — runs once when the server starts.
 *
 * - Scan + classify every 30 min (was 15 min). News doesn't refresh that
 *   fast and halving the cron rate halves the per-tick DB write load,
 *   which was straight-up doubling the Supabase Disk IO budget burn.
 * - Prune every 6th cycle ≈ every 3 hours. Without this, article_pool
 *   and feed_items grow unbounded; the prune cron was sitting in code
 *   but never scheduled, so retention never kicked in.
 * - Cache warm runs after every classify (handled inside scan-and-match).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const INTERVAL = 30 * 60 * 1000; // 30 minutes
    const PRUNE_EVERY_N_CYCLES = 6; // ~ every 3 hours
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.log("[Cron] CRON_SECRET not set, skipping auto-scan");
      return;
    }

    console.log(`[Cron] Starting auto-scan loop every ${INTERVAL / 60000} minutes`);

    const internalUrl = "http://localhost:3000";

    let cycleCount = 0;
    const tick = async () => {
      cycleCount++;
      await runCycle(internalUrl, cronSecret);
      // Run prune on the Nth cycle. The cycle counter survives restarts
      // because each container has its own counter — if Railway restarts
      // us at the wrong cadence, we just over-prune by a few cycles, which
      // is fine (prune is idempotent within its retention windows).
      if (cycleCount % PRUNE_EVERY_N_CYCLES === 0) {
        await runPrune(internalUrl, cronSecret);
      }
    };

    setTimeout(tick, 30_000);
    setInterval(tick, INTERVAL);
  }
}

async function runCycle(baseUrl: string, cronSecret: string) {
  const headers = { Authorization: `Bearer ${cronSecret}` };

  // Phase 1: Scan RSS + Brave into article_pool
  try {
    console.log("[Cron] Phase 1: Scanning sources...");
    const res = await fetch(`${baseUrl}/api/cron/scan-and-match?phase=scan`, {
      headers,
      signal: AbortSignal.timeout(180_000), // 3 min for scan
    });
    const data = await res.json();
    const scan = data.scan || {};
    console.log(`[Cron] Scan done: RSS=${scan.global?.added || 0}, Brave=${scan.brave?.added || 0}, Video=${scan.videos?.added || 0}`);
  } catch (err) {
    console.error("[Cron] Scan failed:", err);
  }

  // Phase 2: classify new articles into feeds (lossless keyset cursor +
  // umbrella). Lightweight — fits the free-tier Disk IO budget.
  //
  // NOTE: the semantic embed+fill path (pgvector/HNSW) is implemented and
  // env-gated behind EVO_SEMANTIC=1. It's OFF by default because HNSW write
  // amplification + continuous embedding writes exceed free-tier Supabase
  // IO (it saturated the instance during rollout). Enable it only on paid
  // compute. When off, classify keeps every feed fresh as before.
  if (process.env.EVO_SEMANTIC === "1") {
    try {
      console.log("[Cron] Phase 2a: Embedding new articles...");
      const res = await fetch(`${baseUrl}/api/cron/embed`, { headers, signal: AbortSignal.timeout(200_000) });
      const data = await res.json();
      console.log(`[Cron] Embed done: embedded=${data.embedded || 0}, pages=${data.pages || 0}`);
    } catch (err) {
      console.error("[Cron] Embed failed:", err);
    }
    try {
      console.log("[Cron] Phase 2b: Filling feeds (semantic pull)...");
      const res = await fetch(`${baseUrl}/api/cron/scan-and-match?phase=fill`, { headers, signal: AbortSignal.timeout(200_000) });
      const data = await res.json();
      const f = data.fill || {};
      console.log(`[Cron] Fill done: feeds=${f.feeds || 0}, inserted=${f.inserted || 0}`);
    } catch (err) {
      console.error("[Cron] Fill failed:", err);
    }
  } else {
    try {
      console.log("[Cron] Phase 2: Classifying articles...");
      const res = await fetch(`${baseUrl}/api/cron/scan-and-match?phase=classify`, {
        headers,
        signal: AbortSignal.timeout(270_000),
      });
      const data = await res.json();
      const c = data.classify || {};
      console.log(`[Cron] Classify done: articles=${c.articles || 0}, new=${c.newArticles || 0}, inserted=${c.inserted || 0}, pages=${c.pages || 0}`);
    } catch (err) {
      console.error("[Cron] Classify failed:", err);
    }
  }

  // Phase 3: demand-driven top-up — targeted search for feeds below the
  // freshness SLO (niche + brand-new). Makes EVERY feed reach good numbers,
  // not just mainstream ones. Free Google News + capped Brave.
  try {
    console.log("[Cron] Phase 3: Topping up starving feeds...");
    const res = await fetch(`${baseUrl}/api/cron/scan-and-match?phase=topup`, {
      headers,
      signal: AbortSignal.timeout(200_000),
    });
    const data = await res.json();
    const t = data.topup || {};
    console.log(`[Cron] Top-up done: checked=${t.checked || 0}, filled=${t.filled || 0}, inserted=${t.inserted || 0}, braveUsed=${t.braveUsed || 0}`);
  } catch (err) {
    console.error("[Cron] Top-up failed:", err);
  }

  // Digests
  try {
    const { sendDigests } = await import("@/lib/email-digest");
    const result = await sendDigests();
    if (result.sent > 0) console.log(`[Cron] Digests: ${result.sent} sent`);
  } catch {}
}

async function runPrune(baseUrl: string, cronSecret: string) {
  // 5 min timeout — prune can process up to 20×2000 rows per table, which
  // is plenty of headroom but still bounded so a runaway can't wedge the
  // cron loop.
  try {
    console.log("[Cron] Prune: starting...");
    const res = await fetch(`${baseUrl}/api/cron/prune`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(300_000),
    });
    const data = await res.json();
    console.log(`[Cron] Prune done: pool=${data.poolDeleted || 0}, items=${data.itemsDeleted || 0}`);
  } catch (err) {
    console.error("[Cron] Prune failed:", err);
  }
}
