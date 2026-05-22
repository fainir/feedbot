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
  const MAX_BATCHES = 20;
  let poolDeleted = 0;
  let itemsDeleted = 0;

  // 1) Prune unreferenced old article_pool rows.
  for (let i = 0; i < MAX_BATCHES; i++) {
    const cutoff = new Date(Date.now() - ARTICLE_POOL_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: victims } = await svc
      .from("article_pool")
      .select("id")
      .lt("published_at", cutoff)
      .limit(BATCH);
    if (!victims || victims.length === 0) break;

    // Check which are unreferenced. feed_items.article_pool_id is indexed,
    // so this is fast.
    const ids = victims.map((v) => v.id);
    const { data: refs } = await svc
      .from("feed_items")
      .select("article_pool_id")
      .in("article_pool_id", ids);
    const referenced = new Set((refs || []).map((r) => r.article_pool_id));
    const safeIds = ids.filter((id) => !referenced.has(id));
    if (safeIds.length === 0) continue;

    const { data: deleted } = await svc
      .from("article_pool")
      .delete()
      .in("id", safeIds)
      .select("id");
    poolDeleted += deleted?.length || 0;
    if (safeIds.length < BATCH) break;
  }

  // 2) Prune old feed_items.
  for (let i = 0; i < MAX_BATCHES; i++) {
    const cutoff = new Date(Date.now() - FEED_ITEMS_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: victims } = await svc
      .from("feed_items")
      .select("id")
      .lt("published_at", cutoff)
      .limit(BATCH);
    if (!victims || victims.length === 0) break;
    const { data: deleted } = await svc
      .from("feed_items")
      .delete()
      .in("id", victims.map((v) => v.id))
      .select("id");
    itemsDeleted += deleted?.length || 0;
    if (victims.length < BATCH) break;
  }

  return NextResponse.json({
    poolDeleted,
    itemsDeleted,
    retention: { articlePoolDays: ARTICLE_POOL_RETENTION_DAYS, feedItemsDays: FEED_ITEMS_RETENTION_DAYS },
  });
}
