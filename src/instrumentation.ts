/**
 * Next.js Instrumentation hook — runs once when the server starts.
 * Sets up a 15-minute cron loop to scan feeds and send email digests.
 *
 * First run after deploy forces all feeds to refresh (force=1).
 * Subsequent runs use schedule-aware filtering.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const INTERVAL = 15 * 60 * 1000; // 15 minutes
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.log("[Cron] CRON_SECRET not set, skipping auto-scan");
      return;
    }

    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    console.log(`[Cron] Starting auto-scan loop every ${INTERVAL / 60000} minutes`);

    // First run after deploy: force-refresh all feeds (30s delay for server warmup)
    setTimeout(() => runCycle(baseUrl, cronSecret, true), 30_000);
    // Subsequent runs: schedule-aware
    setInterval(() => runCycle(baseUrl, cronSecret, false), INTERVAL);
  }
}

async function runCycle(baseUrl: string, cronSecret: string, forceAll: boolean) {
  // Phase 1: Scan and match
  try {
    const forceParam = forceAll ? "?force=1" : "";
    console.log(`[Cron] Running scan-and-match...${forceAll ? " (force-all after deploy)" : ""}`);
    const res = await fetch(`${baseUrl}/api/cron/scan-and-match${forceParam}`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json();
    const skipped = data.skipped ? ` (${data.skipped})` : "";
    console.log(`[Cron] Scan done: ${data.phase1_scan?.global?.added || 0} pool articles, ${data.phase2_match?.articles_added || 0} matched, ${data.phase2_match?.feeds_processed || 0} feeds${skipped}`);
  } catch (err) {
    console.error("[Cron] Scan failed:", err);
  }

  // Phase 2: Send email digests
  try {
    const { sendDigests } = await import("@/lib/email-digest");
    const result = await sendDigests();
    if (result.sent > 0) {
      console.log(`[Cron] Digests: ${result.sent} sent, ${result.skipped} skipped`);
    }
  } catch (err) {
    console.error("[Cron] Digest failed:", err);
  }
}
