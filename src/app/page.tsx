"use client";

import { useState, useEffect } from "react";
import { Plus, LogIn, RefreshCw, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";

interface FeedItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url?: string;
  publishedAt: string;
}

function cleanSummary(text: string): string {
  return text
    .replace(/Continue reading on [^»]+»/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DEFAULT_TABS = [
  { id: "tech", name: "Tech News", query: "technology news" },
  { id: "ai", name: "AI & ML", query: "artificial intelligence machine learning" },
  { id: "startup", name: "Startups", query: "startup funding venture capital" },
  { id: "dev", name: "Dev", query: "software engineering programming" },
  { id: "science", name: "Science", query: "science research discoveries" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("tech");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fetchFeed = (query: string, cursor?: string) => {
    const url = `/api/public/feeds?q=${encodeURIComponent(query)}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    return fetch(url).then((r) => r.json());
  };

  // Load feed on tab change
  useEffect(() => {
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    const tab = DEFAULT_TABS.find((t) => t.id === activeTab);
    if (!tab) return;

    fetchFeed(tab.query)
      .then((d) => {
        setItems(d.items || []);
        setHasMore(d.hasMore || false);
        setNextCursor(d.nextCursor || null);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  // Load more (infinite scroll)
  const loadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    const tab = DEFAULT_TABS.find((t) => t.id === activeTab);
    if (!tab) return;

    fetchFeed(tab.query, nextCursor)
      .then((d) => {
        setItems((prev) => [...prev, ...(d.items || [])]);
        setHasMore(d.hasMore || false);
        setNextCursor(d.nextCursor || null);
      })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header — minimal X.com style */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">MyFeed</h1>
        <div className="flex items-center gap-3">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-bg-hover transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          <Link href="/login" className="text-sm text-text-muted hover:text-text transition-colors">
            Sign in
          </Link>
          <Link
            href="/login?signup=true"
            className="text-sm font-semibold bg-text text-bg px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="border-b border-border px-4 flex gap-1 overflow-x-auto">
        {DEFAULT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text hover:border-border"
            }`}
          >
            {tab.name}
          </button>
        ))}
        <Link
          href="/login?signup=true"
          className="px-4 py-3 text-sm text-text-muted hover:text-text flex items-center gap-1 whitespace-nowrap transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </Link>
      </nav>

      {/* Feed Content */}
      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-5 bg-bg-hover rounded w-3/4 mb-2" />
                <div className="h-3 bg-bg-hover rounded w-full mb-1" />
                <div className="h-3 bg-bg-hover rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No articles yet. Feeds refresh daily.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item, i) => (
              <article key={item.id || i} className="group py-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                      <span>{item.source}</span>
                      <span>·</span>
                      <span>{timeAgo(item.publishedAt)}</span>
                    </div>
                    <h2 className="font-semibold text-text group-hover:underline leading-snug">
                      {item.title}
                    </h2>
                    {item.summary && (
                      <p className="text-sm text-text-muted mt-1 line-clamp-2">
                        {cleanSummary(item.summary)}
                      </p>
                    )}
                  </div>
                  {item.image_url && (
                    <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-bg-hover">
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                </a>
              </article>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-4 text-sm text-text-muted hover:text-text border-t border-border transition-colors"
            >
              {loadingMore ? "Loading..." : "Show more"}
            </button>
          )}

          {!hasMore && items.length > 0 && (
            <p className="text-center py-6 text-xs text-text-muted">You&apos;ve reached the beginning of this feed</p>
          )}
        )}

        {/* CTA */}
        <div className="mt-12 text-center border border-border rounded-2xl p-8">
          <h3 className="font-bold text-lg mb-2">Create your own feeds</h3>
          <p className="text-sm text-text-muted mb-5">
            Describe what you care about. MyFeed scans the internet for you.
          </p>
          <Link
            href="/login?signup=true"
            className="inline-flex items-center gap-2 bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            Get started — it&apos;s free
          </Link>
        </div>
      </main>
    </div>
  );
}
