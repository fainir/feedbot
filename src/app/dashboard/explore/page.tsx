"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Compass, TrendingUp, ExternalLink, Globe, Plus, Check, RefreshCw } from "lucide-react";
import Link from "next/link";

interface TrendingItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
}

const EXPLORE_CATEGORIES = [
  { name: "Technology", queries: ["latest tech news", "new software releases", "tech industry analysis"] },
  { name: "Science", queries: ["scientific breakthroughs", "research papers today", "climate science updates"] },
  { name: "Business", queries: ["business news today", "startup funding rounds", "market analysis"] },
  { name: "AI & ML", queries: ["artificial intelligence news", "machine learning research", "AI tools and products"] },
  { name: "Design", queries: ["UI UX design trends", "web design inspiration", "design tools"] },
  { name: "Programming", queries: ["programming tutorials", "new frameworks and libraries", "developer news"] },
];

export default function ExplorePage() {
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFeed, setCreatingFeed] = useState<string | null>(null);
  const [createdFeeds, setCreatedFeeds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/feeds/trending")
      .then((r) => r.json())
      .then((data) => setTrending(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createFeed = async (name: string, query: string) => {
    setCreatingFeed(name);
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, query_text: query, description: query }),
      });
      if (res.ok) {
        setCreatedFeeds((prev) => new Set([...prev, name]));
      }
    } catch {}
    setCreatingFeed(null);
  };

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
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Explore</h1>
          <p className="text-sm text-text-muted">Discover trending content and new feed ideas</p>
        </div>
      </div>

      {/* Trending Now */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <TrendingUp className="h-5 w-5 text-orange-400" />
          Trending Now
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-hover" />
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-text-muted/30" />
            <p className="text-sm text-text-muted">No trending items right now. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trending.map((item) => {
              let hostname = item.source;
              try { hostname = new URL(item.url).hostname.replace("www.", ""); } catch {}
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-xl border border-border bg-bg-card p-4 transition-colors hover:border-primary/30 hover:bg-bg-hover/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text line-clamp-1">{item.title}</p>
                    <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{item.summary}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-text-muted/60">
                      <Globe className="h-3 w-3" />
                      <span>{hostname}</span>
                    </div>
                  </div>
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-text-muted/30" />
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Explore Categories */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-text">Explore by Category</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPLORE_CATEGORIES.map((cat) => (
            <div key={cat.name} className="rounded-xl border border-border bg-bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-text">{cat.name}</h3>
              <div className="space-y-2">
                {cat.queries.map((query) => (
                  <div key={query} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-muted line-clamp-1">{query}</span>
                    {createdFeeds.has(query) ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
                    ) : (
                      <button
                        onClick={() => createFeed(cat.name + ": " + query.split(" ").slice(0, 3).join(" "), query)}
                        disabled={creatingFeed === query}
                        className="shrink-0 rounded p-1 text-text-muted hover:bg-bg-hover hover:text-primary"
                        title="Create feed from this query"
                      >
                        {creatingFeed === query ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
