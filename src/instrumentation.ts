/**
 * Next.js Instrumentation hook — runs once when the server starts.
 *
 * Two modes, selected by env (so the same image runs both Railway services):
 *
 *  - WEB (default): serves the site. Historically it ALSO ran the scan/
 *    classify/top-up loop in-process every 30 min — which pinned the
 *    container awake AND sized its memory for the cron's working set. Set
 *    DISABLE_INPROCESS_CRON=1 to shed that loop once the cron service below
 *    is verified, so the web container can slim down (and could later sleep).
 *  - CRON (SERVICE_ROLE=cron): a separate Railway Cron Job runs this image on
 *    a schedule. It boots, runs ONE cycle (+ a time-gated prune) against its
 *    own loopback server, then exits — so Railway bills only the minutes it
 *    runs, not 24/7. This is where the heavy pipeline now lives.
 *
 * Cadence (both modes): scan + classify every tick; prune ~every 3 hours.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.log("[Cron] CRON_SECRET not set, skipping auto-scan");
    return;
  }

  const internalUrl = "http://localhost:3000";

  // ── Cron-service mode (Railway Cron Job — scales to zero) ───────────────
  if (process.env.SERVICE_ROLE === "cron") {
    console.log("[Cron] cron-service mode — running one cycle then exiting");
    // Don't await: let register() return so Next finishes booting and starts
    // listening; the one-shot polls until the loopback server is up.
    void runOnceAndExit(internalUrl, cronSecret);
    return;
  }

  // ── Web-service mode ────────────────────────────────────────────────────
  // Kept for a zero-gap rollout: deploy this, stand up + verify the cron
  // service, THEN set DISABLE_INPROCESS_CRON=1 here so only it ticks.
  if (process.env.DISABLE_INPROCESS_CRON === "1") {
    console.log("[Cron] in-process scheduler disabled — handled by the cron service");
    return;
  }

  const INTERVAL = 30 * 60 * 1000; // 30 minutes
  const PRUNE_EVERY_N_CYCLES = 6; // ~ every 3 hours
  console.log(`[Cron] Starting auto-scan loop every ${INTERVAL / 60000} minutes`);

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

// One-shot entry for the Railway Cron Job: wait for this container's own
// server to accept requests, run a single cycle, prune if due, then exit so
// Railway closes out the run (and stops billing) instead of leaving a server
// up. Exit non-zero on a hard failure so the On-Failure policy retries.
async function runOnceAndExit(baseUrl: string, cronSecret: string) {
  try {
    await waitForServer(baseUrl);
    await runCycle(baseUrl, cronSecret);
    await maybePrune(baseUrl, cronSecret);
  } catch (err) {
    console.error("[Cron] one-shot cycle failed:", err);
    process.exit(1);
  }
  console.log("[Cron] one-shot cycle complete — exiting");
  process.exit(0);
}

// Poll our own server until it answers. No auth header → the cron route
// returns 401, which is a perfectly good "socket is open, routes are live"
// signal (any HTTP status counts; we never trigger work here).
async function waitForServer(baseUrl: string, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/cron/scan-and-match?phase=ping`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.status > 0) {
        console.log(`[Cron] server ready after ${Math.round((Date.now() - start) / 1000)}s`);
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.warn("[Cron] server readiness timed out — proceeding anyway");
}

// Prune is heavy on free-tier Supabase, so the web scheduler only ran it
// every 6th cycle (~3h). Cron-job containers are ephemeral and can't keep an
// in-memory counter, so gate on a persisted timestamp in scan_state instead
// (same table/pattern as the Brave rate-limit).
async function maybePrune(baseUrl: string, cronSecret: string) {
  const PRUNE_INTERVAL_MS = 3 * 60 * 60_000; // ~3 hours
  try {
    const { getServiceClient } = await import("@/lib/supabase");
    const svc = getServiceClient();
    const { data } = await svc
      .from("scan_state")
      .select("last_scanned_at")
      .eq("category", "last_prune_at")
      .single();
    const last = data?.last_scanned_at ? new Date(data.last_scanned_at).getTime() : 0;
    if (Date.now() - last < PRUNE_INTERVAL_MS) {
      console.log("[Cron] prune skipped — ran recently");
      return;
    }
    await runPrune(baseUrl, cronSecret);
    await svc.from("scan_state").upsert(
      { category: "last_prune_at", last_scanned_at: new Date().toISOString() },
      { onConflict: "category" },
    );
  } catch (err) {
    console.error("[Cron] prune gate failed:", err);
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
