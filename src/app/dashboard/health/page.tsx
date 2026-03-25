"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, RefreshCw, Rss, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";

interface FeedHealth {
  id: string;
  name: string;
  queryText: string;
  lastRefreshed: string | null;
  itemCount: number;
  status: "healthy" | "stale" | "empty" | "error";
  statusMessage: string;
}

export default function HealthPage() {
  const [feeds, setFeeds] = useState<FeedHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const res = await fetch("/api/feeds");
        if (!res.ok) return;
        const { feeds: rawFeeds } = await res.json();
        if (!rawFeeds) return;

        const healthData: FeedHealth[] = await Promise.all(
          rawFeeds.map(async (feed: Record<string, unknown>) => {
            let itemCount = 0;
            try {
              const itemsRes = await fetch(`/api/feeds/${feed.id}?limit=1`);
              if (itemsRes.ok) {
                const data = await itemsRes.json();
                itemCount = (data.items || []).length > 0 ? (data.items || []).length : 0;
                // Get real count by fetching more
                const fullRes = await fetch(`/api/feeds/${feed.id}?limit=100`);
                if (fullRes.ok) {
                  const fullData = await fullRes.json();
                  itemCount = (fullData.items || []).length;
                }
              }
            } catch {}

            const lastRefreshed = feed.last_refreshed_at as string | null;
            const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

            let status: FeedHealth["status"] = "healthy";
            let statusMessage = "Feed is healthy and up to date";

            if (itemCount === 0) {
              status = "empty";
              statusMessage = "No items found — feed may not be working";
            } else if (!lastRefreshed) {
              status = "stale";
              statusMessage = "Never refreshed";
            } else if (Date.now() - new Date(lastRefreshed).getTime() > STALE_MS) {
              status = "stale";
              statusMessage = `Last refreshed ${timeAgo(lastRefreshed)}`;
            }

            return {
              id: feed.id as string,
              name: feed.name as string,
              queryText: feed.query_text as string,
              lastRefreshed,
              itemCount,
              status,
              statusMessage,
            };
          })
        );

        setFeeds(healthData);
      } catch {}
      setLoading(false);
    }
    loadHealth();
  }, []);

  const refreshFeed = async (feedId: string) => {
    setRefreshing(feedId);
    try {
      await fetch(`/api/feeds/${feedId}/refresh`, { method: "POST" });
      // Reload health for this feed
      const res = await fetch(`/api/feeds/${feedId}?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setFeeds((prev) =>
          prev.map((f) =>
            f.id === feedId
              ? {
                  ...f,
                  itemCount: (data.items || []).length,
                  lastRefreshed: new Date().toISOString(),
                  status: (data.items || []).length > 0 ? "healthy" : "empty",
                  statusMessage: "Just refreshed",
                }
              : f
          )
        );
      }
    } catch {}
    setRefreshing(null);
  };

  const healthyCt = feeds.filter((f) => f.status === "healthy").length;
  const staleCt = feeds.filter((f) => f.status === "stale").length;
  const emptyCt = feeds.filter((f) => f.status === "empty").length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text">Feed Health</h1>
          <p className="text-sm text-text-muted">
            Monitor which feeds are working and which need attention
          </p>
        </div>
      </div>

      {/* Summary */}
      {!loading && feeds.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card className="text-center">
            <div className="flex flex-col items-center">
              <CheckCircle2 className="mb-1 h-5 w-5 text-green-400" />
              <span className="text-2xl font-bold text-text">{healthyCt}</span>
              <span className="text-xs text-text-muted">Healthy</span>
            </div>
          </Card>
          <Card className="text-center">
            <div className="flex flex-col items-center">
              <AlertTriangle className="mb-1 h-5 w-5 text-yellow-400" />
              <span className="text-2xl font-bold text-text">{staleCt}</span>
              <span className="text-xs text-text-muted">Stale</span>
            </div>
          </Card>
          <Card className="text-center">
            <div className="flex flex-col items-center">
              <AlertCircle className="mb-1 h-5 w-5 text-red-400" />
              <span className="text-2xl font-bold text-text">{emptyCt}</span>
              <span className="text-xs text-text-muted">Empty</span>
            </div>
          </Card>
        </div>
      )}

      {/* Feed List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-bg-card" />
          ))}
        </div>
      ) : feeds.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-text-muted">
            No feeds to monitor. Create some from the{" "}
            <Link href="/dashboard" className="text-primary hover:underline">dashboard</Link>.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {feeds.map((feed) => (
            <Card key={feed.id} className="flex items-center gap-4">
              <div className="shrink-0">
                {feed.status === "healthy" && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                {feed.status === "stale" && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                {feed.status === "empty" && <AlertCircle className="h-5 w-5 text-red-400" />}
                {feed.status === "error" && <AlertCircle className="h-5 w-5 text-red-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{feed.name}</p>
                <p className="text-xs text-text-muted">
                  {feed.statusMessage} · {feed.itemCount} items
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refreshFeed(feed.id)}
                disabled={refreshing === feed.id}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing === feed.id ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
