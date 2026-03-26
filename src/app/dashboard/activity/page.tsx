"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Activity, RefreshCw, Rss, Trash2, Plus, BookOpen, Clock, Calendar } from "lucide-react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: "feed_created" | "feed_refreshed" | "feed_deleted" | "items_discovered" | "article_read" | "article_bookmarked";
  feedName?: string;
  count?: number;
  timestamp: string;
}

const ICON_MAP: Record<string, typeof Activity> = {
  feed_created: Plus,
  feed_refreshed: RefreshCw,
  feed_deleted: Trash2,
  items_discovered: Rss,
  article_read: BookOpen,
  article_bookmarked: BookOpen,
};

const COLOR_MAP: Record<string, string> = {
  feed_created: "text-green-400 bg-green-500/10",
  feed_refreshed: "text-blue-400 bg-blue-500/10",
  feed_deleted: "text-red-400 bg-red-500/10",
  items_discovered: "text-primary bg-primary/10",
  article_read: "text-text-muted bg-bg-hover",
  article_bookmarked: "text-secondary bg-secondary/10",
};

const LABEL_MAP: Record<string, string> = {
  feed_created: "Created feed",
  feed_refreshed: "Refreshed feed",
  feed_deleted: "Deleted feed",
  items_discovered: "New items discovered",
  article_read: "Read article",
  article_bookmarked: "Bookmarked article",
};

function generateActivityFromLocalStorage(): ActivityItem[] {
  const items: ActivityItem[] = [];

  try {
    // Read IDs for "articles read" activity
    const readIds = JSON.parse(localStorage.getItem("feedbot-read") || "[]");
    if (readIds.length > 0) {
      // Group by day
      items.push({
        id: "read-total",
        type: "article_read",
        count: readIds.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Bookmarks
    const bookmarks = JSON.parse(localStorage.getItem("feedbot-bookmarks") || "[]");
    if (bookmarks.length > 0) {
      items.push({
        id: "bookmark-total",
        type: "article_bookmarked",
        count: bookmarks.length,
        timestamp: new Date().toISOString(),
      });
    }
  } catch {}

  return items;
}

function timeAgoShort(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [feeds, setFeeds] = useState<{ id: string; name: string; created_at: string; last_refreshed_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/feeds");
        if (res.ok) {
          const { feeds: f } = await res.json();
          setFeeds(f || []);

          const feedActivities: ActivityItem[] = [];
          for (const feed of (f || [])) {
            feedActivities.push({
              id: `created-${feed.id}`,
              type: "feed_created",
              feedName: feed.name,
              timestamp: feed.created_at,
            });
            if (feed.last_refreshed_at) {
              feedActivities.push({
                id: `refreshed-${feed.id}`,
                type: "feed_refreshed",
                feedName: feed.name,
                timestamp: feed.last_refreshed_at,
              });
            }
          }

          const localActivity = generateActivityFromLocalStorage();
          setActivities([...feedActivities, ...localActivity].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ));
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter
    ? activities.filter((a) => a.type === filter)
    : activities;

  const stats = useMemo(() => ({
    totalFeeds: feeds.length,
    totalReads: activities.find((a) => a.type === "article_read")?.count || 0,
    totalBookmarks: activities.find((a) => a.type === "article_bookmarked")?.count || 0,
  }), [feeds, activities]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Activity</h1>
          <p className="text-sm text-text-muted">Your feed activity and reading history</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
          <p className="text-2xl font-bold text-text">{stats.totalFeeds}</p>
          <p className="text-xs text-text-muted">Feeds</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
          <p className="text-2xl font-bold text-text">{stats.totalReads}</p>
          <p className="text-xs text-text-muted">Articles Read</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
          <p className="text-2xl font-bold text-text">{stats.totalBookmarks}</p>
          <p className="text-xs text-text-muted">Bookmarked</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {[null, "feed_created", "feed_refreshed", "article_read", "article_bookmarked"].map((f) => (
          <button
            key={f || "all"}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-white" : "text-text-muted hover:bg-bg-hover hover:text-text"
            }`}
          >
            {f ? LABEL_MAP[f] || f : "All"}
          </button>
        ))}
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-bg-hover" />
              <div className="flex-1">
                <div className="h-4 w-48 animate-pulse rounded bg-bg-hover" />
                <div className="mt-1 h-3 w-24 animate-pulse rounded bg-bg-hover" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Activity className="mx-auto mb-3 h-8 w-8 text-text-muted/30" />
          <p className="text-sm text-text-muted">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((activity) => {
            const Icon = ICON_MAP[activity.type] || Activity;
            const color = COLOR_MAP[activity.type] || "text-text-muted bg-bg-hover";

            return (
              <div key={activity.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-bg-card px-4 py-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">
                    {LABEL_MAP[activity.type]}
                    {activity.feedName && (
                      <span className="font-medium"> &quot;{activity.feedName}&quot;</span>
                    )}
                    {activity.count && (
                      <span className="font-medium"> ({activity.count} total)</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-text-muted">
                  {timeAgoShort(activity.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
