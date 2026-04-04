import { NextResponse } from "next/server";

/**
 * Self-triggering cron endpoint.
 * Called by the app's startup script or by an external service.
 * Triggers scan-and-match and schedules the next run.
 *
 * For Railway: set this as a startup ping or use the app's
 * instrumentation hook to start the cron loop.
 */
export async function GET() {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
    || "https://myfeed.space";

  try {
    const res = await fetch(`${baseUrl}/api/cron/scan-and-match`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const data = await res.json();
    return NextResponse.json({ triggered: true, result: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
