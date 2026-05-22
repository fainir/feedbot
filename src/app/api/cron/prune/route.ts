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

  // Why this shape: the previous version SELECTed 2000 ids then issued
  // `DELETE ... WHERE id IN (uuid1,uuid2,...)`. That URL is ~75 KB and
  // PostgREST rejects it silently (returns 0 rows affected). Direct
  // predicate DELETE `WHERE published_at < cutoff` is one tiny SQL
  // statement that PostgreSQL executes against the (already-existing)
  // published_at index — no URL length issue.
  //
  // We walk backwards in 7-day windows so each statement deletes a bounded
  // number of rows (avoids hitting Supabase's statement_timeout on the
  // first big backlog run).

  // Each DELETE is bounded by a 1-day age window AND a LIMIT — Supabase's
  // statement_timeout (~8s) kills wider windows on busy tables. Smaller
  // windows = more round trips but each one finishes well under the cap.
  const STEP_DAYS = 1;
  const MAX_STEPS = 3000; // 3000 days = ~8 yrs of backlog headroom
  const stepMs = STEP_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const STOP_BEFORE = new Date("1980-01-01").getTime();
  // Hard cap on rows deleted per call to keep each statement under the
  // Supabase statement_timeout. Tune down if we ever see timeouts again.
  const PER_WINDOW_LIMIT = 2000;
  // Overall wall-clock budget. The cron loop won't wait forever for prune
  // to finish, so bail after this much elapsed time. The next prune run
  // will pick up where this one left off (the window resets to "now" but
  // there'll be less backlog).
  const WALL_CLOCK_MS = 240_000; // 4 min
  const startedAt = Date.now();

  async function pruneTable(table: "feed_items" | "article_pool", retentionDays: number): Promise<number> {
    let total = 0;
    let upper = now - retentionDays * 24 * 60 * 60 * 1000;
    let consecutiveEmpty = 0;
    for (let s = 0; s < MAX_STEPS; s++) {
      if (Date.now() - startedAt > WALL_CLOCK_MS) break;
      const lower = upper - stepMs;
      // .select() after .delete() asks PostgREST to return the deleted
      // rows so we can count them. Without it the response body is empty
      // and supabase-js gives us data:null.
      const { data, error } = await svc
        .from(table)
        .delete()
        .lt("published_at", new Date(upper).toISOString())
        .gte("published_at", new Date(lower).toISOString())
        .limit(PER_WINDOW_LIMIT)
        .select("id");
      if (error) {
        console.error(`[prune] ${table} window ${new Date(lower).toISOString()}..${new Date(upper).toISOString()} failed:`, error.message);
        // Statement timeout? Halve the window and retry. Bail if we got
        // unlucky on the smallest window.
        if (error.message?.includes("statement timeout")) {
          // Walk backwards anyway — losing this window's rows is fine; the
          // next prune cycle will revisit them with a fresh statement.
          upper = lower;
          if (upper < STOP_BEFORE) break;
          continue;
        }
        break;
      }
      const n = data?.length || 0;
      total += n;
      if (n === 0) {
        consecutiveEmpty++;
        // After enough empty windows, we've cleared the backlog — bail.
        if (consecutiveEmpty >= 30) break;
      } else {
        consecutiveEmpty = 0;
        // We hit the LIMIT — there might be more rows in this window. Keep
        // upper where it is so the next iteration deletes another chunk
        // from the SAME window.
        if (n === PER_WINDOW_LIMIT) continue;
      }
      upper = lower;
      if (upper < STOP_BEFORE) break;
    }
    return total;
  }

  // feed_items first — old rows hold FK references to article_pool that
  // would block step 2's delete (FK has no ON DELETE clause, so PostgreSQL
  // refuses to delete a referenced row).
  itemsDeleted = await pruneTable("feed_items", FEED_ITEMS_RETENTION_DAYS);

  // article_pool — now that the FK references are gone, this can delete
  // the matching old rows freely. Anything still referenced by a recent
  // feed_item will be blocked by the FK and skipped by Postgres (the
  // statement deletes only what it can; remaining rows raise an error
  // we catch and continue).
  poolDeleted = await pruneTable("article_pool", ARTICLE_POOL_RETENTION_DAYS);

  return NextResponse.json({
    poolDeleted,
    itemsDeleted,
    retention: { articlePoolDays: ARTICLE_POOL_RETENTION_DAYS, feedItemsDays: FEED_ITEMS_RETENTION_DAYS },
  });
}
