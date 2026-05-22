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

  // Why an RPC: the public DB role's statement_timeout is ~8s, which the
  // PostgREST-issued DELETE on article_pool was tripping every time. The
  // prune_old_rows SQL function (migration 018) wraps the delete with
  // SET LOCAL statement_timeout = '90s', so a single 5K-row batch has
  // room to finish even against a bloated table.
  //
  // The function returns the number of rows deleted per call. We loop
  // until it returns 0 (or until our wall-clock budget runs out) for
  // each table.

  const BATCH = 5000;
  const MAX_CALLS = 200;
  // Overall wall-clock budget. The cron loop won't wait forever for prune
  // to finish; if we hit this, we bail and the next scheduled prune picks
  // up the remainder.
  const WALL_CLOCK_MS = 270_000; // 4.5 min
  const startedAt = Date.now();

  async function pruneVia(table: "feed_items" | "article_pool", retentionDays: number): Promise<number> {
    let total = 0;
    for (let i = 0; i < MAX_CALLS; i++) {
      if (Date.now() - startedAt > WALL_CLOCK_MS) break;
      const { data, error } = await svc.rpc("prune_old_rows", {
        p_table: table,
        p_retention_days: retentionDays,
        p_batch_limit: BATCH,
      });
      if (error) {
        console.error(`[prune] ${table} rpc failed:`, error.message);
        break;
      }
      const n = typeof data === "number" ? data : 0;
      total += n;
      if (n === 0) break; // backlog cleared
    }
    return total;
  }

  // feed_items first — frees the FK back-references for article_pool. With
  // migration 017 the FK is ON DELETE SET NULL, so this ordering is only
  // for tidy-ness now; article_pool can be deleted directly either way.
  itemsDeleted = await pruneVia("feed_items", FEED_ITEMS_RETENTION_DAYS);
  poolDeleted = await pruneVia("article_pool", ARTICLE_POOL_RETENTION_DAYS);

  return NextResponse.json({
    poolDeleted,
    itemsDeleted,
    retention: { articlePoolDays: ARTICLE_POOL_RETENTION_DAYS, feedItemsDays: FEED_ITEMS_RETENTION_DAYS },
  });
}
