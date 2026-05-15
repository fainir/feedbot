/**
 * Two-tier response cache for public feed endpoints.
 *
 * L1 — in-process Map (sub-ms, lives only inside this server instance,
 *      lost on deploy / scale-down).
 * L2 — Redis (single-digit-ms, shared across instances, survives deploys).
 *
 * If REDIS_URL is unset we run L1-only — every call gracefully degrades to
 * the same behaviour as before. If Redis goes down at runtime we keep
 * serving from L1 and stop blocking on Redis until the next attempt.
 */

import Redis from "ioredis";

type Entry = { body: string; expiresAt: number };

const L1 = new Map<string, Entry>();
const L1_MAX = 128;
const DEFAULT_TTL_MS = 60_000;

let redis: Redis | null = null;
let redisDisabledUntil = 0;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (redis) return redis;
  if (Date.now() < redisDisabledUntil) return null;
  try {
    redis = new Redis(process.env.REDIS_URL, {
      // Railway's internal DNS resolves to IPv6 only.
      family: 6,
      // Don't queue commands while disconnected — fail fast and let us fall
      // back to L1 instead of stacking commands that may never flush.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 800,
      lazyConnect: false,
      retryStrategy(times) {
        // After two failed attempts in a row, back off for 30s. The cache
        // helpers will switch to L1 during that window.
        if (times > 2) return null;
        return Math.min(times * 200, 1000);
      },
    });
    redis.on("error", () => {
      // Suppress chatty connection logs — error path already returns null.
      redisDisabledUntil = Date.now() + 30_000;
    });
    return redis;
  } catch {
    redisDisabledUntil = Date.now() + 30_000;
    return null;
  }
}

function l1Put(key: string, body: string, ttlMs: number) {
  if (L1.size >= L1_MAX) {
    const oldest = L1.keys().next().value;
    if (oldest !== undefined) L1.delete(oldest);
  }
  L1.set(key, { body, expiresAt: Date.now() + ttlMs });
}

function l1Get(key: string): string | null {
  const e = L1.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { L1.delete(key); return null; }
  return e.body;
}

export async function cacheGet(key: string): Promise<{ body: string; tier: "L1" | "L2" } | null> {
  const fromL1 = l1Get(key);
  if (fromL1) return { body: fromL1, tier: "L1" };
  const r = getRedis();
  if (!r) return null;
  try {
    const v = await r.get(key);
    if (typeof v === "string" && v.length > 0) {
      // Promote into L1 so the same instance doesn't hit Redis again for
      // the rest of this TTL.
      l1Put(key, v, DEFAULT_TTL_MS);
      return { body: v, tier: "L2" };
    }
  } catch {
    redisDisabledUntil = Date.now() + 30_000;
  }
  return null;
}

export async function cachePut(key: string, body: string, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  l1Put(key, body, ttlMs);
  const r = getRedis();
  if (!r) return;
  try {
    // PX = expire in ms. We deliberately don't await with retries — caller
    // shouldn't be blocked on cache writes.
    await r.set(key, body, "PX", ttlMs);
  } catch {
    redisDisabledUntil = Date.now() + 30_000;
  }
}

export function cacheBackendName(): "redis" | "memory" {
  return process.env.REDIS_URL && Date.now() >= redisDisabledUntil ? "redis" : "memory";
}
