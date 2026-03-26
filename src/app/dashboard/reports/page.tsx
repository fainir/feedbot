"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, BarChart3, TrendingUp, Clock, BookOpen, Rss, Calendar } from "lucide-react";
import Link from "next/link";

interface FeedData {
  id: string;
  name: string;
  itemCount: number;
  lastRefresh: string | null;
}

export default function ReportsPage() {
  const [feeds, setFeeds] = useState<FeedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [readCount, setReadCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/feeds");
        if (res.ok) {
          const { feeds: f } = await res.json();
          const feedData: FeedData[] = [];
          for (const feed of (f || [])) {
            try {
              const itemsRes = await fetch(`/api/feeds/${feed.id}`);
              if (itemsRes.ok) {
                const data = await itemsRes.json();
                feedData.push({
                  id: feed.id,
                  name: feed.name,
                  itemCount: data.items?.length || 0,
                  lastRefresh: feed.last_refreshed_at,
                });
              }
            } catch {}
          }
          setFeeds(feedData);
        }
      } catch {}

      try {
        const read = JSON.parse(localStorage.getItem("feedbot-read") || "[]");
        setReadCount(read.length);
        const bookmarks = JSON.parse(localStorage.getItem("feedbot-bookmarks") || "[]");
        setBookmarkCount(bookmarks.length);
      } catch {}

      setLoading(false);
    }
    load();
  }, []);

  const totalItems = useMemo(() => feeds.reduce((sum, f) => sum + f.itemCount, 0), [feeds]);
  const avgItems = feeds.length > 0 ? Math.round(totalItems / feeds.length) : 0;

  const readRate = totalItems > 0 ? Math.round((readCount / totalItems) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Reports</h1>
          <p className="text-sm text-text-muted">Your reading analytics and feed performance</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-hover" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-bg-card p-5">
              <div className="flex items-center gap-2 text-text-muted">
                <Rss className="h-4 w-4" />
                <span className="text-xs">Active Feeds</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-text">{feeds.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-card p-5">
              <div className="flex items-center gap-2 text-text-muted">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Total Items</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-text">{totalItems}</p>
              <p className="mt-1 text-xs text-text-muted">avg {avgItems}/feed</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-card p-5">
              <div className="flex items-center gap-2 text-text-muted">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs">Articles Read</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-text">{readCount}</p>
              <p className="mt-1 text-xs text-text-muted">{readRate}% read rate</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-card p-5">
              <div className="flex items-center gap-2 text-text-muted">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Bookmarked</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-text">{bookmarkCount}</p>
            </div>
          </div>

          {/* Feed Breakdown */}
          <div className="rounded-xl border border-border bg-bg-card p-5">
            <h2 className="mb-4 text-base font-semibold text-text">Feed Performance</h2>
            {feeds.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">No feeds yet. Create your first feed to see analytics.</p>
            ) : (
              <div className="space-y-3">
                {feeds
                  .sort((a, b) => b.itemCount - a.itemCount)
                  .map((feed) => {
                    const pct = totalItems > 0 ? (feed.itemCount / totalItems) * 100 : 0;
                    return (
                      <div key={feed.id} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate text-sm text-text">{feed.name}</span>
                        <div className="flex-1">
                          <div className="h-6 rounded-full bg-border">
                            <div
                              className="flex h-6 items-center rounded-full bg-primary/20 pl-2 text-xs font-medium text-primary transition-all"
                              style={{ width: `${Math.max(pct, 8)}%` }}
                            >
                              {feed.itemCount}
                            </div>
                          </div>
                        </div>
                        <div className="w-20 shrink-0 text-right">
                          <span className="text-xs text-text-muted">{Math.round(pct)}%</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Reading Insights */}
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="mb-2 text-base font-semibold text-text">Reading Insights</h2>
            <div className="space-y-2 text-sm text-text-muted">
              {readCount === 0 ? (
                <p>Start reading articles to see personalized insights here.</p>
              ) : (
                <>
                  <p>You&apos;ve read <span className="font-medium text-primary">{readCount}</span> articles across <span className="font-medium text-primary">{feeds.length}</span> feeds.</p>
                  {readRate > 50 ? (
                    <p>Your read rate of <span className="font-medium text-green-400">{readRate}%</span> is excellent — you&apos;re engaging deeply with your content!</p>
                  ) : readRate > 20 ? (
                    <p>Your read rate of <span className="font-medium text-yellow-400">{readRate}%</span> is healthy. Consider narrowing your feeds for higher relevance.</p>
                  ) : (
                    <p>Your read rate of <span className="font-medium text-orange-400">{readRate}%</span> is low. Try using &quot;Catch Me Up&quot; or the Daily Brief to stay current.</p>
                  )}
                  {bookmarkCount > 5 && (
                    <p>You&apos;ve saved <span className="font-medium text-secondary">{bookmarkCount}</span> articles. Consider organizing them with collections or tags.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
