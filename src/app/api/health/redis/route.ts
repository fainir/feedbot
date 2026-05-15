import { NextResponse } from "next/server";
import Redis from "ioredis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.REDIS_URL;
  if (!url) {
    return NextResponse.json({ ok: false, reason: "REDIS_URL not set" }, { status: 503 });
  }
  // Railway's internal DNS resolves to IPv6 — force family: 6 so Node
  // doesn't pick a non-existent IPv4 address.
  const events: string[] = [];
  const r = new Redis(url, {
    family: 6,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    commandTimeout: 3000,
    lazyConnect: false,
  });
  r.on("connect", () => events.push("connect"));
  r.on("ready", () => events.push("ready"));
  r.on("error", (e) => events.push(`error: ${e.message}`));
  r.on("end", () => events.push("end"));
  try {
    // Give it up to 5s to connect.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("ready timeout")), 5000);
      r.once("ready", () => { clearTimeout(t); resolve(); });
      r.once("error", (e) => { clearTimeout(t); reject(e); });
    });
    const pong = await r.ping();
    const dbsize = await r.dbsize();
    const sample = await r.keys("*");
    await r.quit();
    return NextResponse.json({
      ok: true,
      ping: pong,
      keys: dbsize,
      sampleKeys: sample.slice(0, 10),
      events,
      url_masked: url.replace(/:[^:@]+@/, ":***@"),
    });
  } catch (e) {
    try { r.disconnect(); } catch {}
    return NextResponse.json({
      ok: false,
      reason: (e as Error).message,
      code: (e as { code?: string }).code,
      events,
      url_masked: url.replace(/:[^:@]+@/, ":***@"),
    }, { status: 503 });
  }
}
