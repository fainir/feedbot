import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { refreshFeed } from "@/lib/feed-engine";
import { notifyFeedUpdate } from "@/lib/notifications";
import type { Feed, FeedItem } from "@/types/database";

function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("CRON_SECRET not set, rejecting all cron requests");
    return false;
  }
  return secret === `Bearer ${cronSecret}`;
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    notified: 0,
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

        const existingUrls = new Set<string>();
        const { data: existingItems } = await supabase
          .from("feed_items")
          .select("url")
          .eq("feed_id", feed.id);

        if (existingItems) {
          for (const item of existingItems) {
            existingUrls.add(item.url);
          }
        }

        const uniqueItems = discoveredItems.filter(
          (item) => !existingUrls.has(item.url)
        );

        if (uniqueItems.length > 0) {
          const rows = uniqueItems.map((item) => ({
            feed_id: feed.id,
            title: item.title,
            url: item.url,
            summary: item.summary,
            source: item.source,
            image_url: item.image_url,
            published_at: item.published_at,
          }));

          const { data: insertedItems, error: insertError } = await supabase
            .from("feed_items")
            .insert(rows)
            .select();

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
          }

          const hasNotifications =
            feed.notify_email || feed.notify_push || feed.notify_whatsapp;

          if (hasNotifications && insertedItems) {
            try {
              await notifyFeedUpdate(feed, insertedItems as FeedItem[]);
              results.notified++;
            } catch (notifyErr) {
              console.error(
                `Notification failed for feed ${feed.id}:`,
                notifyErr
              );
            }
          }
        }

        await supabase
          .from("feeds")
          .update({ last_refreshed_at: new Date().toISOString() })
          .eq("id", feed.id);

        return { feed, newItems: uniqueItems.length };
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
