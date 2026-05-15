import { NextResponse } from "next/server";
import Redis from "ioredis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.REDIS_URL;
  if (!url) {
    return NextResponse.json({ ok: false, reason: "REDIS_URL not set" }, { status: 503 });
  }
  const r = new Redis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 1500,
    lazyConnect: false,
  });
  try {
    const pong = await r.ping();
    const dbsize = await r.dbsize();
    const sample = await r.keys("*");
    await r.quit();
    return NextResponse.json({
      ok: true,
      ping: pong,
      keys: dbsize,
      sampleKeys: sample.slice(0, 10),
    });
  } catch (e) {
    try { r.disconnect(); } catch {}
    return NextResponse.json({
      ok: false,
      reason: (e as Error).message,
      code: (e as { code?: string }).code,
    }, { status: 503 });
  }
}
