"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, LogIn, Sun, Moon, Sparkles, ThumbsUp, ThumbsDown, X } from "lucide-react";
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
  return text.replace(/Continue reading on [^»]+»/g, "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DEFAULT_TABS = [
  { id: "tech", name: "Tech", icon: "💻", query: "technology news" },
  { id: "ai", name: "AI & ML", icon: "🤖", query: "artificial intelligence machine learning" },
  { id: "startup", name: "Startups", icon: "🚀", query: "startup funding venture capital" },
  { id: "dev", name: "Dev", icon: "⚡", query: "software engineering programming" },
  { id: "science", name: "Science", icon: "🔬", query: "science research discoveries" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("tech");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showNewFeed, setShowNewFeed] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fetchFeed = useCallback((query: string, cursor?: string) => {
    const url = `/api/public/feeds?q=${encodeURIComponent(query)}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    return fetch(url).then((r) => r.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    const tab = DEFAULT_TABS.find((t) => t.id === activeTab);
    if (!tab) return;
    fetchFeed(tab.query)
      .then((d) => { setItems(d.items || []); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeTab, fetchFeed]);

  const loadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    const tab = DEFAULT_TABS.find((t) => t.id === activeTab);
    if (!tab) return;
    fetchFeed(tab.query, nextCursor)
      .then((d) => { setItems((p) => [...p, ...(d.items || [])]); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .finally(() => setLoadingMore(false));
  };

  const activeTabData = DEFAULT_TABS.find((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">MyFeed</h1>
        <div className="flex items-center gap-3">
          {mounted && (
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-full hover:bg-bg-hover transition-colors" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          <Link href="/login" className="text-sm text-text-muted hover:text-text transition-colors">Sign in</Link>
          <Link href="/login?signup=true" className="text-sm font-semibold bg-text text-bg px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity">Sign up</Link>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="sticky top-[57px] z-40 bg-bg/80 backdrop-blur-md border-b border-border px-4 flex gap-0 overflow-x-auto scrollbar-hide">
        {DEFAULT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id ? "border-text text-text" : "border-transparent text-text-muted hover:text-text hover:bg-bg-hover"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
        <button
          onClick={() => setShowNewFeed(true)}
          className="px-3 py-3 text-text-muted hover:text-text hover:bg-bg-hover rounded transition-colors"
          aria-label="New feed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </nav>

      {/* Customize bar */}
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs text-text-muted">{activeTabData?.icon} {activeTabData?.name}</span>
        <button
          onClick={() => { setShowCustomize(true); setNewPrompt(activeTabData?.query || ""); }}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          Customize feed
        </button>
      </div>

      {/* Feed */}
      <main id="main-content" className="max-w-2xl mx-auto px-4 pb-6">
        {loading ? (
          <div className="space-y-4 pt-4">{[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} className="animate-pulse py-3"><div className="h-3 bg-bg-hover rounded w-1/4 mb-2" /><div className="h-5 bg-bg-hover rounded w-3/4 mb-2" /><div className="h-3 bg-bg-hover rounded w-full" /></div>
          ))}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-text-muted"><p>No articles yet. Content refreshes automatically.</p></div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item, i) => (
              <article key={item.id || i} className="group py-4">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                      <span>{item.source}</span>
                      <span>·</span>
                      <span>{timeAgo(item.publishedAt)}</span>
                    </div>
                    <h2 className="font-semibold text-text group-hover:underline leading-snug text-[15px]">{item.title}</h2>
                    {item.summary && <p className="text-sm text-text-muted mt-1 line-clamp-2">{cleanSummary(item.summary)}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      <button onClick={(e) => { e.preventDefault(); }} className="text-xs text-text-muted hover:text-green-500 flex items-center gap-1 transition-colors" aria-label="More like this">
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.preventDefault(); }} className="text-xs text-text-muted hover:text-red-500 flex items-center gap-1 transition-colors" aria-label="Less like this">
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {item.image_url && (
                    <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-bg-hover mt-1">
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                </a>
              </article>
            ))}
          </div>
        )}

        {hasMore && (
          <button onClick={loadMore} disabled={loadingMore} className="w-full py-4 text-sm text-text-muted hover:text-text border-t border-border transition-colors">
            {loadingMore ? "Loading..." : "Show more"}
          </button>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-center py-6 text-xs text-text-muted">You&apos;ve seen all articles in this feed</p>
        )}

        {/* CTA */}
        <div className="mt-8 text-center border border-border rounded-2xl p-8">
          <h3 className="font-bold text-lg mb-2">Create your own feeds</h3>
          <p className="text-sm text-text-muted mb-5">Describe what you care about. MyFeed scans the internet for you.</p>
          <Link href="/login?signup=true" className="inline-flex bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">
            Get started — it&apos;s free
          </Link>
        </div>
      </main>

      {/* New Feed Modal */}
      {showNewFeed && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowNewFeed(false)}>
          <div className="bg-bg border border-border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">New Feed</h2>
              <button onClick={() => setShowNewFeed(false)} className="p-1 hover:bg-bg-hover rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-text-muted mb-4">Describe what you want to follow in plain English.</p>
            <textarea
              placeholder="e.g. Latest React and Next.js tutorials, new CSS features, web performance tips"
              className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-24 focus:outline-none focus:border-text transition-colors"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowNewFeed(false)} className="flex-1 py-2.5 text-sm border border-border rounded-full hover:bg-bg-hover transition-colors">Cancel</button>
              <Link href="/login?signup=true" className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-full font-semibold hover:opacity-90 transition-opacity">
                Sign up to create
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Customize Feed Modal */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCustomize(false)}>
          <div className="bg-bg border border-border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <h2 className="font-bold text-lg">Customize Feed</h2>
              </div>
              <button onClick={() => setShowCustomize(false)} className="p-1 hover:bg-bg-hover rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-text-muted mb-4">Edit the prompt to change what articles appear in this feed.</p>
            <textarea
              className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-24 focus:outline-none focus:border-text transition-colors"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCustomize(false)} className="flex-1 py-2.5 text-sm border border-border rounded-full hover:bg-bg-hover transition-colors">Cancel</button>
              <Link href="/login?signup=true" className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-full font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Sign up to customize
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
