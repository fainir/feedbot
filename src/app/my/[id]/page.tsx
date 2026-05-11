"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Sparkles, Loader2, ArrowLeft, RefreshCw, ExternalLink, ThumbsUp, ThumbsDown, Bookmark, Share2 } from "lucide-react";
import Link from "next/link";

interface Feed {
  id: string;
  name: string;
  query_text: string;
  is_active: boolean;
  last_refreshed_at: string | null;
  created_at: string;
}

interface FeedItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url: string | null;
  published_at: string;
}

export default function MyFeedPage() {
  const params = useParams();
  const feedId = params.id as string;
  const [feed, setFeed] = useState<Feed | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/feeds/${feedId}`);
      if (!res.ok) { setError("Feed not found"); setLoading(false); return; }
      const data = await res.json();
      setFeed(data.feed);
      setItems(data.items || []);
    } catch {
      setError("Failed to load feed");
    }
    setLoading(false);
  }, [feedId]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Auto-refresh if feed is new (no articles yet)
  useEffect(() => {
    if (!feed || items.length > 0) return;
    const interval = setInterval(loadFeed, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [feed, items.length, loadFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`/api/feeds/${feedId}/refresh`, { method: "POST" });
      await loadFeed();
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !feed) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Feed not found</h1>
          <Link href="/dashboard" className="text-text-muted hover:text-text text-sm">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold text-sm">{feed.name}</h1>
            <p className="text-[11px] text-text-muted line-clamp-1">{feed.query_text}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
          aria-label="Refresh feed"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4">
        {items.length === 0 ? (
          /* Empty state — feed is being built */
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-text/5 mb-4">
              <Sparkles className="h-8 w-8 text-text animate-pulse" />
            </div>
            <h2 className="font-bold text-lg mb-2">Building your feed...</h2>
            <p className="text-sm text-text-muted mb-2 max-w-sm mx-auto">
              AI is scanning thousands of sources to find content matching:
            </p>
            <div className="inline-block rounded-xl border border-border bg-bg-card px-4 py-2 mb-6">
              <p className="text-sm text-text italic">&ldquo;{feed.query_text}&rdquo;</p>
            </div>
            <p className="text-xs text-text-muted mb-6">
              Content will appear within a few minutes. This page auto-refreshes.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              Scanning...
            </div>
          </div>
        ) : (
          /* Articles */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">{items.length} finds</span>
              <span className="text-xs text-text-muted">{feed.last_refreshed_at ? `Updated ${new Date(feed.last_refreshed_at).toLocaleTimeString()}` : ""}</span>
            </div>
            {items.map((item) => (
              <article key={item.id} className="group rounded-2xl border border-border overflow-hidden bg-bg-card hover:border-text/20 transition-all duration-200">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                  {item.image_url && (
                    <div className="w-full aspect-[2.5/1] bg-bg-hover overflow-hidden">
                      <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                    </div>
                  )}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-text/5 text-text-muted">{item.source}</span>
                      <span className="text-[11px] text-text-muted">{new Date(item.published_at).toLocaleDateString()}</span>
                    </div>
                    <h2 className="font-semibold text-text leading-snug text-[15px] group-hover:text-text/80 transition-colors">{item.title}</h2>
                    {item.summary && (
                      <p className="text-sm text-text-muted mt-1.5 line-clamp-2">{item.summary}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => e.preventDefault()} className="px-2 py-1 rounded-lg text-xs text-text-muted hover:text-green-400 hover:bg-green-500/10 transition-all"><ThumbsUp className="h-3.5 w-3.5" /></button>
                        <button onClick={(e) => e.preventDefault()} className="px-2 py-1 rounded-lg text-xs text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"><ThumbsDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => e.preventDefault()} className="px-2 py-1 rounded-lg text-xs text-text-muted hover:text-text hover:bg-bg-hover transition-all"><Bookmark className="h-3.5 w-3.5" /></button>
                        <button onClick={(e) => e.preventDefault()} className="px-2 py-1 rounded-lg text-xs text-text-muted hover:text-text hover:bg-bg-hover transition-all"><Share2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </a>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
