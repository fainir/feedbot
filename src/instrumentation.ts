/**
 * Next.js Instrumentation hook — runs once when the server starts.
 * Calls scan via internal localhost (bypasses Railway proxy timeout).
 * Runs every 15 minutes. Splits scan and classify into separate calls.
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

    const internalUrl = "http://localhost:3000";

    setTimeout(() => runCycle(internalUrl, cronSecret), 30_000);
    setInterval(() => runCycle(internalUrl, cronSecret), INTERVAL);
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

  // Phase 2: AI classify + insert into feeds
  try {
    console.log("[Cron] Phase 2: Classifying articles...");
    const res = await fetch(`${baseUrl}/api/cron/scan-and-match?phase=classify`, {
      headers,
      signal: AbortSignal.timeout(180_000), // 3 min for classify
    });
    const data = await res.json();
    console.log(`[Cron] Classify done: processed=${data.classify?.articles_processed || 0}, inserted=${data.insert?.articles_inserted || 0}, feeds=${data.insert?.feeds_updated || 0}`);
  } catch (err) {
    console.error("[Cron] Classify failed:", err);
  }

  // Digests
  try {
    const { sendDigests } = await import("@/lib/email-digest");
    const result = await sendDigests();
    if (result.sent > 0) console.log(`[Cron] Digests: ${result.sent} sent`);
  } catch {}
}
