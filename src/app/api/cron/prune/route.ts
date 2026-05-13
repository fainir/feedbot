import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * Daily prune. Keeps the I/O budget from drifting back into the red.
 *
 * - article_pool rows older than 14 days that no feed_item references → delete
 * - feed_items rows older than 60 days → delete
 *
 * Both deletes use a small LIMIT per batch and loop, so we never hold a long
 * lock or blow the statement timeout. Cap total work at MAX_BATCHES per run.
 */
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
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
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
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
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

  return NextResponse.json({ poolDeleted, itemsDeleted });
}
