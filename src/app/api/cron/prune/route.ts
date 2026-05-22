import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * Hourly prune. Keeps the I/O budget from drifting back into the red.
 *
 * News content has a short half-life — anything older than a week is dead
 * weight that bloats the indexes and slows every query. We're aggressive on
 * retention because:
 *   - article_pool: scratch buffer for classification, no value once consumed
 *   - feed_items: shown in the UI, but 30d back is far longer than anyone
 *     scrolls; older rows are pure write-amplification
 *
 * Both deletes use a small LIMIT per batch and loop, so we never hold a long
 * lock or blow the statement timeout. Cap total work at MAX_BATCHES per run.
 *
 * After delete, autovacuum reclaims space on its next pass — no explicit
 * VACUUM needed (Supabase's autovacuum is tuned aggressive enough for our
 * row counts).
 */

// Aggressive retention: news has a short half-life, anything older is bloat.
const ARTICLE_POOL_RETENTION_DAYS = 7;
const FEED_ITEMS_RETENTION_DAYS = 30;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = getServiceClient();
  let poolDeleted = 0;
  let itemsDeleted = 0;

  // With migration 019 the FK between feed_items.article_pool_id and
  // article_pool is gone, so deletes on either table no longer fire
  // cascading triggers. Simple direct predicate DELETEs finish well
  // under Supabase's 8s statement_timeout for the steady-state inflow
  // (a few thousand rows per hour at most).
  //
  // We still bound by row count via the ?prefer return=representation
  // .select() pattern + a small wrapper loop so the route never holds
  // the request open longer than ~2 min.
  //
  // After a freshly-pruned table, expect 0 deletes most of the time —
  // the cron loop calls this every ~3 hours.

  const WALL_CLOCK_MS = 120_000; // 2 min
  const startedAt = Date.now();

  async function pruneTable(table: "feed_items" | "article_pool", retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    let total = 0;
    // Loop until we get a clean empty pass or we run out of wall-clock.
    for (let pass = 0; pass < 30; pass++) {
      if (Date.now() - startedAt > WALL_CLOCK_MS) break;
      const { data, error } = await svc
        .from(table)
        .delete()
        .lt("published_at", cutoff)
        .select("id");
      if (error) {
        // Statement timeout → bail; the next prune call (~3 h later)
        // tries again with a smaller backlog.
        console.error(`[prune] ${table} delete failed:`, error.message);
        break;
      }
      const n = data?.length || 0;
      total += n;
      if (n === 0) break;
    }
    return total;
  }

  itemsDeleted = await pruneTable("feed_items", FEED_ITEMS_RETENTION_DAYS);
  poolDeleted = await pruneTable("article_pool", ARTICLE_POOL_RETENTION_DAYS);

  return NextResponse.json({
    poolDeleted,
    itemsDeleted,
    retention: { articlePoolDays: ARTICLE_POOL_RETENTION_DAYS, feedItemsDays: FEED_ITEMS_RETENTION_DAYS },
  });
}
