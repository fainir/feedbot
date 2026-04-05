/**
 * Next.js Instrumentation hook — runs once when the server starts.
 * Calls scan via internal localhost (bypasses Railway proxy timeout).
 * Runs every 15 minutes. First run forces all feeds.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const INTERVAL = 15 * 60 * 1000; // 15 minutes
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.log("[Cron] CRON_SECRET not set, skipping auto-scan");
      return;
    }

    console.log(`[Cron] Starting auto-scan loop every ${INTERVAL / 60000} minutes`);

    // Use internal localhost to bypass Railway's proxy timeout
    const internalUrl = "http://localhost:3000";

    setTimeout(() => runCycle(internalUrl, cronSecret, true), 30_000);
    setInterval(() => runCycle(internalUrl, cronSecret, false), INTERVAL);
  }
}

async function runCycle(baseUrl: string, cronSecret: string, forceAll: boolean) {
  try {
    const forceParam = forceAll ? "?force=1" : "";
    console.log(`[Cron] Running scan...${forceAll ? " (force-all)" : ""}`);
    // Use localhost to bypass Railway proxy timeout (internal → no 120s limit)
    const res = await fetch(`${baseUrl}/api/cron/scan-and-match${forceParam}`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(300_000),
    });
    const data = await res.json();
    const skipped = data.skipped ? ` (${data.skipped})` : "";
    console.log(`[Cron] Done: ${data.phase1_scan?.global?.added || 0} pool, ${data.phase2_match?.articles_added || 0} matched, ${data.phase2_match?.feeds_processed || 0} feeds${skipped}`);
  } catch (err) {
    console.error("[Cron] Scan failed:", err);
  }

  try {
    const { sendDigests } = await import("@/lib/email-digest");
    const result = await sendDigests();
    if (result.sent > 0) console.log(`[Cron] Digests: ${result.sent} sent`);
  } catch {}
}
