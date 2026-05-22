/**
 * Two-tier response cache for public feed endpoints.
 *
 * L1 — in-process Map (sub-ms, lives only inside this server instance,
 *      lost on deploy / scale-down).
 * L2 — Redis (single-digit-ms, shared across instances, survives deploys).
 *
 * If REDIS_URL is unset we run L1-only — every call gracefully degrades to
 * the same behaviour as before. If Redis goes down at runtime, individual
 * calls just miss L2 and refetch from upstream; we never break the API.
 */

import Redis from "ioredis";

type Entry = { body: string; expiresAt: number };

const L1 = new Map<string, Entry>();
const L1_MAX = 128;
// Defaults to 40min so a value promoted from L2 → L1 has the same shelf
// life as the L2 entry it came from (which is also 40min — see route
// handlers). 40 outlives the 30min cron interval so the warmer always
// overwrites before expiry. Per-call TTL still wins via `ttlMs` arg.
const DEFAULT_TTL_MS = 2_400_000;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (redis) return redis;
  try {
    redis = new Redis(process.env.REDIS_URL, {
      // Railway's internal DNS resolves to IPv6 only.
      family: 6,
      // Queue commands issued before the connection opens — first request
      // after cold start waits a few hundred ms instead of failing instantly.
      // commandTimeout still bounds the wait so a stuck connection can't
      // block API responses.
      enableOfflineQueue: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 3000,
      commandTimeout: 1200,
      lazyConnect: false,
      // ioredis default reconnects forever — that's what we want so a brief
      // Redis blip doesn't permanently disable L2 for this instance.
    });
    redis.on("error", () => {
      // Don't disable L2 here — ioredis will reconnect on its own. Each
      // call just sees a "MaxRetriesPerRequestError" and falls through to
      // L1 (read) or no-op (write). Avoiding global state means recovery
      // is automatic without us tracking timers.
    });
    return redis;
  } catch {
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
    // Single failure — log path? No, stay quiet. Reconnect handled by ioredis.
  }
  return null;
}

export async function cachePut(key: string, body: string, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  l1Put(key, body, ttlMs);
  const r = getRedis();
  if (!r) return;
  try {
    // PX = expire in ms.
    await r.set(key, body, "PX", ttlMs);
  } catch {
    // Ignore — next write will retry. L1 already has the value.
  }
}
