import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase";
import { refreshFeed } from "@/lib/feed-engine";
import { classifyAndInsert } from "@/lib/classify";
import type { Feed } from "@/types/database";

function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("CRON_SECRET not set, rejecting all cron requests");
    return false;
  }
  const expected = `Bearer ${cronSecret}`;
  if (!secret || secret.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
  } catch {
    return false;
  }
}

function isDueForRefresh(feed: Feed): boolean {
  if (!feed.last_refreshed_at) return true;

  const lastRefresh = new Date(feed.last_refreshed_at).getTime();
  const now = Date.now();
  const elapsed = now - lastRefresh;

  switch (feed.schedule) {
    case "realtime":
      return elapsed > 5 * 60 * 1000; // 5 minutes
    case "hourly":
      return elapsed > 60 * 60 * 1000; // 1 hour
    case "daily":
      return elapsed > 24 * 60 * 60 * 1000; // 24 hours
    default:
      return elapsed > 24 * 60 * 60 * 1000;
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data: feeds, error } = await supabase
    .from("feeds")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Cron feed fetch error:", error.message);
    return NextResponse.json({ error: "Failed to fetch feeds" }, { status: 500 });
  }

  if (!feeds || feeds.length === 0) {
    return NextResponse.json({
      message: "No active feeds",
      refreshed: 0,
      errors: 0,
    });
  }

  const dueFeeds = (feeds as Feed[]).filter(isDueForRefresh);

  if (dueFeeds.length === 0) {
    return NextResponse.json({
      message: "No feeds due for refresh",
      checked: feeds.length,
      refreshed: 0,
      errors: 0,
    });
  }

  const results = {
    checked: feeds.length,
    due: dueFeeds.length,
    refreshed: 0,
    errors: 0,
    details: [] as Array<{
      feed_id: string;
      feed_name: string;
      new_items: number;
      status: "ok" | "error";
      error?: string;
    }>,
  };

  const BATCH_SIZE = 5;
  for (let i = 0; i < dueFeeds.length; i += BATCH_SIZE) {
    const batch = dueFeeds.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (feed) => {
        const discoveredItems = await refreshFeed(feed);
        if (discoveredItems.length === 0) return { feed, newItems: 0 };

        // Classify and insert immediately — same AI pipeline as scan-and-match
        const { inserted } = await classifyAndInsert(discoveredItems, [feed], supabase);

        if (inserted > 0) {
          await supabase
            .from("feeds")
            .update({ last_refreshed_at: new Date().toISOString() })
            .eq("id", feed.id);
        }

        return { feed, newItems: inserted };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.refreshed++;
        results.details.push({
          feed_id: result.value.feed.id,
          feed_name: result.value.feed.name,
          new_items: result.value.newItems,
          status: "ok",
        });
      } else {
        results.errors++;
        results.details.push({
          feed_id: "unknown",
          feed_name: "unknown",
          new_items: 0,
          status: "error",
          error: String(result.reason),
        });
      }
    }
  }

  return NextResponse.json(results);
}
