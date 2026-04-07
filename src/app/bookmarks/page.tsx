"use client";

import { useState, useEffect } from "react";
import { Bookmark, Sun, Moon, MoreVertical, LogIn, X } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { cleanSummary, cleanTitle, getSourceInfo, timeAgo } from "@/lib/source-info";
import type { User } from "@supabase/supabase-js";

interface BookmarkItem {
  id: string;
  feed_item_id: string;
  created_at: string;
  feed_items: {
    id: string;
    title: string;
    url: string;
    summary: string;
    source: string;
    image_url?: string;
    published_at: string;
  };
}

const GRADIENTS = [
  "from-blue-900/40 to-blue-800/20",
  "from-purple-900/40 to-purple-800/20",
  "from-green-900/40 to-green-800/20",
  "from-orange-900/40 to-orange-800/20",
  "from-red-900/40 to-red-800/20",
  "from-cyan-900/40 to-cyan-800/20",
  "from-pink-900/40 to-pink-800/20",
  "from-indigo-900/40 to-indigo-800/20",
];

function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetch("/api/bookmarks")
          .then((r) => r.json())
          .then((d) => setBookmarks(d.bookmarks || []))
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  const removeBookmark = async (feedItemId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.feed_item_id !== feedItemId));
    try {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feed_item_id: feedItemId }),
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border flex items-center h-11">
        <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
        </Link>
        <div className="flex-1" />
        <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 border-l border-border">
          <Link href="/explore" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap">Explore</Link>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-bg-hover transition-colors" aria-label="More options"><MoreVertical className="h-4 w-4 text-text-muted" /></button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-lg py-1 z-50" onMouseLeave={() => setShowMenu(false)}>
                {mounted && <button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{theme === "dark" ? "Light mode" : "Dark mode"}</button>}
                {!user && <Link href="/login" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}><LogIn className="h-4 w-4" />Sign in</Link>}
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="h-5 w-5 text-text" />
          <h1 className="text-lg font-bold">Bookmarks</h1>
          {!loading && bookmarks.length > 0 && <span className="text-xs text-text-muted">{bookmarks.length} saved</span>}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-border overflow-hidden bg-bg-card">
                <div className="p-4">
                  <div className="h-3 bg-bg-hover rounded w-16 mb-3" />
                  <div className="h-5 bg-bg-hover rounded w-4/5 mb-2" />
                  <div className="h-3 bg-bg-hover rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !user ? (
          <div className="text-center py-16">
            <Bookmark className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-text-muted font-medium">Sign in to see your bookmarks</p>
            <Link href="/login?signup=true" className="inline-block mt-4 bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">Sign in</Link>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-text-muted font-medium">No bookmarks yet</p>
            <p className="text-xs text-text-muted mt-1">Save articles while reading to find them here later</p>
            <Link href="/" className="inline-block mt-4 bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">Browse feeds</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bm) => {
              const item = bm.feed_items;
              if (!item) return null;
              const src = getSourceInfo(item.source);
              const title = cleanTitle(item.title);
              const summary = cleanSummary(item.summary || "");
              const hasImage = !!item.image_url;
              return (
                <article key={bm.id} className={`group rounded-2xl border border-border overflow-hidden bg-bg-card hover:border-text/20 transition-all duration-200${!hasImage ? " border-l-4 border-l-text/10" : ""}`}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                    {hasImage && (
                      <div className={`w-full aspect-[2.5/1] bg-gradient-to-br ${getGradient(title)} overflow-hidden relative`}>
                        <img src={item.image_url} alt={title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${src.color}`}>
                          {src.icon ? <img src={src.icon} alt="" className="w-3 h-3 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : null}
                          {src.name}
                        </span>
                        <span className="text-[11px] text-text-muted">{timeAgo(item.published_at)}</span>
                        <span className="text-[10px] text-text-muted/50 ml-auto">Saved {timeAgo(bm.created_at)}</span>
                      </div>
                      <h2 className="font-semibold text-text leading-snug text-[15px] group-hover:text-text/80 transition-colors">{title}</h2>
                      {summary && summary !== title && summary.length > 10 && (
                        <p className="text-sm text-text-muted mt-1.5 line-clamp-2 leading-relaxed">{summary}</p>
                      )}
                    </div>
                  </a>
                  <div className="px-3 sm:px-4 pb-3 flex justify-end">
                    <button
                      onClick={() => removeBookmark(item.id)}
                      className="flex items-center gap-1 text-[11px] text-text-muted hover:text-red-400 transition-colors"
                      aria-label="Remove bookmark"
                    >
                      <X className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
