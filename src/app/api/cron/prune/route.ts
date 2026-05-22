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
  const BATCH = 2000;
  const MAX_BATCHES = 60; // higher cap — we have months of backlog to chew through on first runs
  let poolDeleted = 0;
  let itemsDeleted = 0;

  // ── 1) feed_items first ──
  // Once an old feed_item is gone, the article_pool row it referenced is
  // free to be pruned in step 2. Doing this in this order also avoids the
  // "all first 2000 rows are FK-referenced" loop bug where the SELECT
  // returns the same batch every iteration.
  //
  // We order ASC by published_at so each batch is the oldest available
  // rows. PostgREST has no offset cursor here, but since we delete the
  // rows we just listed, the next "oldest BATCH" will be a different set.
  for (let i = 0; i < MAX_BATCHES; i++) {
    const cutoff = new Date(Date.now() - FEED_ITEMS_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: victims } = await svc
      .from("feed_items")
      .select("id")
      .lt("published_at", cutoff)
      .order("published_at", { ascending: true })
      .limit(BATCH);
    if (!victims || victims.length === 0) break;
    const { data: deleted } = await svc
      .from("feed_items")
      .delete()
      .in("id", victims.map((v) => v.id))
      .select("id");
    itemsDeleted += deleted?.length || 0;
    // If we got less than a full batch, we're done for this run.
    if (victims.length < BATCH) break;
  }

  // ── 2) Prune unreferenced old article_pool rows ──
  // Track ids we've already considered this run so a batch full of
  // FK-referenced rows doesn't trap us in an infinite loop.
  const skipIds = new Set<string>();
  for (let i = 0; i < MAX_BATCHES; i++) {
    const cutoff = new Date(Date.now() - ARTICLE_POOL_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    let q = svc
      .from("article_pool")
      .select("id")
      .lt("published_at", cutoff)
      .order("published_at", { ascending: true })
      .limit(BATCH);
    // Skip ids we've already inspected and found to be referenced. Supabase
    // caps not.in to ~1000 ids per query, so flush the skip set when it
    // gets close to that — at worst we re-inspect 1000 rows.
    if (skipIds.size > 0 && skipIds.size < 1000) {
      q = q.not("id", "in", `(${[...skipIds].join(",")})`);
    } else if (skipIds.size >= 1000) {
      skipIds.clear();
    }
    const { data: victims } = await q;
    if (!victims || victims.length === 0) break;

    const ids = victims.map((v) => v.id);
    const { data: refs } = await svc
      .from("feed_items")
      .select("article_pool_id")
      .in("article_pool_id", ids);
    const referenced = new Set((refs || []).map((r) => r.article_pool_id));
    const safeIds = ids.filter((id) => !referenced.has(id));
    // Remember the ones we can't delete this run so the next batch doesn't
    // hand them to us again.
    for (const id of ids) if (referenced.has(id)) skipIds.add(id);
    if (safeIds.length === 0) continue;

    const { data: deleted } = await svc
      .from("article_pool")
      .delete()
      .in("id", safeIds)
      .select("id");
    poolDeleted += deleted?.length || 0;
    if (victims.length < BATCH) break;
  }

  return NextResponse.json({
    poolDeleted,
    itemsDeleted,
    retention: { articlePoolDays: ARTICLE_POOL_RETENTION_DAYS, feedItemsDays: FEED_ITEMS_RETENTION_DAYS },
  });
}
