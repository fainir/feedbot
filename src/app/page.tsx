"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Sun, Moon, Sparkles, ThumbsUp, ThumbsDown, X, Bookmark, BookmarkCheck, Share2, MoreVertical, LogIn, SlidersHorizontal, Check, Mail, Search, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { trackEvent } from "@/components/analytics";
import { useToast } from "@/components/ui/toast";
import { cleanSummary, cleanTitle, getSourceInfo, getSourceFavicon, timeAgo } from "@/lib/source-info";
import type { User } from "@supabase/supabase-js";

interface FeedItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url?: string;
  publishedAt: string;
}

const FEEDS = [
  { id: "ai", name: "AI & ML", icon: "🤖" },
  { id: "tech", name: "Tech", icon: "💻" },
  { id: "startups", name: "Startups", icon: "🚀" },
  { id: "dev", name: "Dev", icon: "⚡" },
  { id: "science", name: "Science", icon: "🔬" },
  { id: "design", name: "Design", icon: "🎨" },
  { id: "security", name: "Security", icon: "🔒" },
  { id: "gaming", name: "Gaming", icon: "🎮" },
  { id: "business", name: "Business", icon: "📈" },
  { id: "space", name: "Space", icon: "🪐" },
  { id: "health", name: "Health", icon: "🏥" },
  { id: "open-source", name: "Open Source", icon: "🐙" },
  { id: "robotics", name: "Robotics", icon: "🦾" },
  { id: "energy", name: "Energy", icon: "⚡" },
];

// Feed name mapping (matches TAB_MAP in API)
const FEED_NAME_MAP: Record<string, string> = {
  ai: "AI & ML", tech: "Tech News", startups: "Startups", dev: "Dev", science: "Science",
  crypto: "Crypto", design: "Design", security: "Security", gaming: "Gaming", business: "Business",
  space: "Space", health: "Health", "open-source": "Open Source", robotics: "Robotics", energy: "Energy",
};

const DEFAULT_ENABLED = new Set(FEEDS.map((f) => f.id));

export default function ForYouPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showNewFeed, setShowNewFeed] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, "like" | "dislike">>({});
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());
  const [enabledFeeds, setEnabledFeeds] = useState<Set<string>>(DEFAULT_ENABLED);
  const [showAllFeeds, setShowAllFeeds] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("myfeed-show-all") !== "0";
    return true;
  });
  const [showEmailPrefs, setShowEmailPrefs] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState({ enabled: true, frequency: "daily", time: "08:00", feeds: ["for-you"] as string[] });
  const [heroDismissed, setHeroDismissed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("myfeed-hero-dismissed") === "1";
    return false;
  });
  const [hiddenFeeds, setHiddenFeeds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try { const saved = localStorage.getItem("myfeed-hidden-feeds"); if (saved) return new Set(JSON.parse(saved)); } catch {}
    }
    return new Set();
  });
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Load feed preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("myfeed-for-you-feeds");
    if (saved) {
      try { setEnabledFeeds(new Set(JSON.parse(saved))); } catch {}
    }
  }, []);

  const toggleFeed = (id: string) => {
    // If Show All is on, clicking a chip turns it off and deselects that chip
    if (showAllFeeds) {
      setShowAllFeeds(false);
      localStorage.setItem("myfeed-show-all", "0");
      const next = new Set(FEEDS.map(f => f.id));
      next.delete(id);
      setEnabledFeeds(next);
      localStorage.setItem("myfeed-for-you-feeds", JSON.stringify([...next]));
      return;
    }
    setEnabledFeeds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id);
      localStorage.setItem("myfeed-for-you-feeds", JSON.stringify([...next]));
      return next;
    });
  };

  const feedNames = useMemo(() => {
    if (showAllFeeds) return Object.values(FEED_NAME_MAP);
    return [...enabledFeeds].map((id) => FEED_NAME_MAP[id]).filter(Boolean);
  }, [enabledFeeds, showAllFeeds]);

  const fetchFeed = useCallback((cursor?: string) => {
    const feedsParam = feedNames.join(",");
    const url = `/api/public/feeds?q=all&feeds=${encodeURIComponent(feedsParam)}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    return fetch(url).then((r) => r.json());
  }, [feedNames]);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    fetchFeed()
      .then((d) => { setItems(d.items || []); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [fetchFeed]);

  const { dedupedItems, trendingTopics } = useMemo(() => {
    // Load source preferences for personalization
    let sourcePrefs: Record<string, number> = {};
    try { sourcePrefs = JSON.parse(localStorage.getItem("myfeed-source-prefs") || "{}"); } catch {}

    // URL dedup
    const seenUrls = new Set<string>();
    const urlDeduped = items.filter((item) => {
      const key = item.url.split("?")[0].split("#")[0];
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });

    // Apply personalization: boost liked sources, penalize disliked
    if (Object.keys(sourcePrefs).length > 0) {
      urlDeduped.sort((a, b) => {
        const aBoost = sourcePrefs[a.source.toLowerCase()] || 0;
        const bBoost = sourcePrefs[b.source.toLowerCase()] || 0;
        if (aBoost !== bBoost) return bBoost - aBoost; // higher preference first
        return 0; // keep original order (by date)
      });
    }

    // Story clustering — group by similar titles, keep best + track trending
    const stopWords = new Set(["this","that","with","from","have","been","will","they","their","about","what","when","which","these","those","would","could","should","here","there","your","more","just","into"]);
    const clusters: typeof urlDeduped = [];
    const clusterKeys = new Map<string, number>();
    const clusterCounts = new Map<number, number>(); // cluster index → count of similar stories
    for (const item of urlDeduped) {
      const words = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w)).slice(0, 5);
      const key = words.join(" ");
      if (key.length < 8) { clusters.push(item); continue; }
      let matched = false;
      for (const [ek, idx] of clusterKeys) {
        const overlap = words.filter((w) => ek.includes(w)).length;
        if (overlap >= 3) {
          clusterCounts.set(idx, (clusterCounts.get(idx) || 1) + 1);
          matched = true;
          break;
        }
      }
      if (!matched) { clusterKeys.set(key, clusters.length); clusterCounts.set(clusters.length, 1); clusters.push(item); }
    }
    // Build trending set: items with 3+ similar stories
    const trending = new Set<string>();
    for (const [idx, count] of clusterCounts) {
      if (count >= 3 && clusters[idx]) trending.add(clusters[idx].id);
    }
    return { dedupedItems: clusters, trendingTopics: trending };
  }, [items]);

  const loadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    fetchFeed(nextCursor)
      .then((d) => { setItems((p) => [...p, ...(d.items || [])]); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .finally(() => setLoadingMore(false));
  };

  const handleReaction = useCallback(async (feedItemId: string, reaction: "like" | "dislike") => {
    if (!user) { toast("Sign up to save your preferences", "info"); return; }
    const prev = userReactions[feedItemId];
    setUserReactions((r) => { const next = { ...r }; if (next[feedItemId] === reaction) delete next[feedItemId]; else next[feedItemId] = reaction; return next; });
    // Track source preferences for personalization
    const item = items.find((i) => i.id === feedItemId);
    if (item) {
      try {
        const prefs = JSON.parse(localStorage.getItem("myfeed-source-prefs") || "{}");
        const src = item.source.toLowerCase();
        if (!prefs[src]) prefs[src] = 0;
        if (reaction === "like") prefs[src] = Math.min(5, prefs[src] + 1);
        else prefs[src] = Math.max(-5, prefs[src] - 1);
        localStorage.setItem("myfeed-source-prefs", JSON.stringify(prefs));
      } catch {}
    }
    try { const res = await fetch("/api/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feed_item_id: feedItemId, reaction }) }); if (!res.ok) throw new Error(); } catch { setUserReactions((r) => { const next = { ...r }; if (prev) next[feedItemId] = prev; else delete next[feedItemId]; return next; }); }
  }, [user, userReactions, items]);

  const handleBookmark = useCallback(async (feedItemId: string) => {
    if (!user) { toast("Sign up to save your finds", "info"); return; }
    const was = userBookmarks.has(feedItemId);
    setUserBookmarks((s) => { const next = new Set(s); if (next.has(feedItemId)) next.delete(feedItemId); else next.add(feedItemId); return next; });
    try { const res = await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feed_item_id: feedItemId }) }); if (!res.ok) throw new Error(); } catch { setUserBookmarks((s) => { const next = new Set(s); if (was) next.add(feedItemId); else next.delete(feedItemId); return next; }); }
  }, [user, userBookmarks]);

  const handleShare = useCallback(async (item: FeedItem) => {
    trackEvent("share_article", { source: item.source, feed: "for-you" });
    if (navigator.share) { try { await navigator.share({ title: item.title, url: item.url }); } catch {} } else { await navigator.clipboard.writeText(item.url); }
  }, []);

  const handleHeroSubmit = useCallback(() => {
    const prompt = newPrompt.trim();
    if (!prompt) {
      setShowNewFeed(true);
      return;
    }

    if (user) {
      setShowNewFeed(true);
      return;
    }

    window.location.href = `/login?signup=true&prompt=${encodeURIComponent(prompt)}`;
  }, [newPrompt, user]);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Single top bar — fixed so it never scrolls away */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg-card border-b border-border flex items-center h-11">
        <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
        </Link>
        <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-0 min-w-0">
          <Link href="/" className="px-2.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 border-text text-text flex items-center gap-1">
            <span className="text-sm">✨</span><span className="hidden sm:inline">For You</span>
          </Link>
          <div className="w-px h-4 bg-border/50 mx-0.5 flex-shrink-0" />
          {FEEDS.filter(f => showAllFeeds || !hiddenFeeds.has(f.id)).map((tab) => (
            <div key={tab.id} className="group relative shrink-0 border-b-2 border-transparent text-text-muted hover:text-text transition-colors">
              <Link href={`/${tab.id}`} className="flex items-center gap-1 px-2 py-3 text-xs font-medium whitespace-nowrap">
                <span className="text-sm">{tab.icon}</span><span className="hidden sm:inline">{tab.name}</span>
              </Link>
              {!showAllFeeds && <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHiddenFeeds(prev => { const next = new Set(prev); next.add(tab.id); localStorage.setItem("myfeed-hidden-feeds", JSON.stringify([...next])); return next; }); }} className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 hidden sm:flex items-center justify-center rounded-full bg-bg-card border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Hide ${tab.name}`}><X className="h-2.5 w-2.5 text-text-muted" /></button>}
            </div>
          ))}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 ml-0.5 border-l border-border/50">
          <Link href="/explore" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap"><Search className="h-3 w-3" />Explore</Link>
          <button onClick={() => setShowNewFeed(true)} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-text text-bg rounded-full hover:opacity-90 transition-opacity whitespace-nowrap">
            <Plus className="h-3 w-3" /><span className="hidden sm:inline">Create feed</span><span className="sm:hidden">New</span>
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-bg-hover transition-colors" aria-label="More options"><MoreVertical className="h-4 w-4 text-text-muted" /></button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-bg-card border border-border rounded-xl shadow-lg py-1 z-50" onMouseLeave={() => setShowMenu(false)}>
                {user && <div className="px-3 py-2 border-b border-border"><p className="text-xs font-medium text-text truncate">{user.email}</p></div>}
                {mounted && <button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{theme === "dark" ? "Light mode" : "Dark mode"}</button>}
                {!user && <Link href="/login?signup=true" className="flex items-center gap-2 px-3 py-2 text-sm text-text font-medium hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}><LogIn className="h-4 w-4" />Sign up / Sign in</Link>}
                {user && <Link href="/bookmarks" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}><Bookmark className="h-4 w-4" />Bookmarks</Link>}
                {user && <button onClick={() => { setShowEmailPrefs(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"><Mail className="h-4 w-4" />Email digest</button>}
                {user && <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"><LogIn className="h-4 w-4" />Sign out</button>}
                <div className="border-t border-border my-1" />
                <Link href="/contact" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>Contact</Link>
                <Link href="/privacy" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>Privacy</Link>
                <Link href="/terms" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>Terms</Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="h-11" /> {/* Spacer for fixed header */}

      {/* Feed header — full width */}
      <div className="border-b border-border bg-bg-card">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-text flex items-center gap-2">
                <span className="text-lg">✨</span> For You
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {user ? (
                <button onClick={() => setShowEmailPrefs(true)} className="p-2 rounded-full text-text-muted hover:text-text hover:bg-bg-hover transition-all" aria-label="Email updates">
                  <Mail className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Link href="/login?signup=true&email=true" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-text text-bg hover:opacity-90 transition-opacity">
                  <Mail className="h-3 w-3" />Get in email
                </Link>
              )}
              <button onClick={() => { setLoading(true); setItems([]); setNextCursor(null); fetchFeed().then((d) => { setItems(d.items || []); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); }).catch(() => setItems([])).finally(() => setLoading(false)); }} className="p-2 rounded-full text-text-muted hover:text-text hover:bg-bg-hover transition-all" aria-label="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setShowFilter(!showFilter)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full text-text-muted hover:text-text hover:bg-bg-hover transition-all">
                <Sparkles className="h-3 w-3" />Customize
              </button>
            </div>
          </div>
          {/* Horizontal feed chips */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {FEEDS.map((f) => {
              const active = showAllFeeds || enabledFeeds.has(f.id);
              return (
                <button key={f.id} onClick={() => toggleFeed(f.id)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all ${active ? "border-text/20 bg-text/10 text-text" : "border-transparent text-text-muted hover:text-text hover:bg-bg-hover"}`}>
                  <span>{f.icon}</span>
                  <span>{f.name}</span>
                  {active && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero banner for guests — create feed */}
      {!user && !heroDismissed && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="relative rounded-2xl border border-border bg-bg-card p-5 sm:p-6">
            <button onClick={() => { setHeroDismissed(true); localStorage.setItem("myfeed-hero-dismissed", "1"); }} className="absolute top-3 right-3 p-1 rounded-lg text-text-muted hover:text-text hover:bg-bg-hover transition-colors" aria-label="Dismiss"><X className="h-4 w-4" /></button>
            <h2 className="text-base font-bold text-text mb-1">Create your own feed</h2>
            <p className="text-sm text-text-muted mb-3 max-w-lg">Type any topic and AI will find the best posts from across the internet. Always updating, delivered to your email.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="e.g. React tutorials, SpaceX launches, startup funding..."
                className="min-w-0 w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 placeholder:text-text-muted/50 sm:flex-1"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleHeroSubmit(); }}
              />
              <button
                onClick={handleHeroSubmit}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-text px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 sm:w-auto"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Create feed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-2">

        {/* Feed filter panel */}
        {showFilter && (
          <div className="mt-2 p-3 rounded-xl border border-border bg-bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-text">Customize your feed</span>
            </div>
            <label className="flex items-center justify-between py-2 px-1 cursor-pointer">
              <span className="text-xs text-text">Show all feeds</span>
              <button onClick={() => { const next = !showAllFeeds; setShowAllFeeds(next); localStorage.setItem("myfeed-show-all", next ? "1" : "0"); if (next) { setEnabledFeeds(DEFAULT_ENABLED); localStorage.setItem("myfeed-for-you-feeds", JSON.stringify([...DEFAULT_ENABLED])); } }} className={`relative w-9 h-5 rounded-full transition-colors ${showAllFeeds ? "bg-green-500" : "bg-border"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showAllFeeds ? "translate-x-4" : ""}`} />
              </button>
            </label>
            <div className="flex items-center justify-between mt-2 mb-2">
              <span className="text-[11px] text-text-muted">{showAllFeeds ? "All feeds selected" : `${enabledFeeds.size} of ${FEEDS.length} feeds`}</span>
              {!showAllFeeds && <button onClick={() => { setEnabledFeeds(enabledFeeds.size === FEEDS.length ? new Set(["ai"]) : DEFAULT_ENABLED); localStorage.setItem("myfeed-for-you-feeds", JSON.stringify(enabledFeeds.size === FEEDS.length ? ["ai"] : [...DEFAULT_ENABLED])); }} className="text-[10px] text-text-muted hover:text-text transition-colors">
                {enabledFeeds.size === FEEDS.length ? "Deselect all" : "Select all"}
              </button>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FEEDS.map((f) => (
                <button key={f.id} onClick={() => toggleFeed(f.id)} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${(showAllFeeds || enabledFeeds.has(f.id)) ? "border-text/30 bg-text/10 text-text" : "border-border text-text-muted hover:border-text/20"}`}>
                  <span>{f.icon}</span>
                  <span>{f.name}</span>
                  {(showAllFeeds || enabledFeeds.has(f.id)) && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feed content */}
      <main id="main-content" className="max-w-2xl mx-auto px-4 pb-6">
        {loading ? (
          <div className="space-y-4 pt-2">{[1,2,3,4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border overflow-hidden bg-bg-card">
              {i <= 2 && <div className="w-full aspect-[2.5/1] bg-bg-hover" />}
              <div className="p-4"><div className="flex items-center gap-2 mb-3"><div className="w-4 h-4 rounded-full bg-bg-hover" /><div className="h-3 bg-bg-hover rounded w-16" /></div><div className="h-5 bg-bg-hover rounded w-4/5 mb-2" /><div className="h-3 bg-bg-hover rounded w-full" /></div>
            </div>
          ))}</div>
        ) : dedupedItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-muted font-medium">Nothing here yet</p>
            <p className="text-xs text-text-muted mt-1">Fresh picks keep rolling in automatically</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {dedupedItems.map((item, i) => {
              const src = getSourceInfo(item.source);
              const favicon = src.icon || getSourceFavicon(item.source, item.url);
              const title = cleanTitle(item.title);
              const summary = cleanSummary(item.summary, title);
              const hasImage = !!item.image_url;
              const ytMatch = item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
              const ytId = ytMatch?.[1];
              return (
                <article key={item.id || i} className="group rounded-2xl border border-border overflow-hidden bg-bg-card hover:border-text/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  {ytId ? (
                    <div className="w-full aspect-video">
                      <iframe src={`https://www.youtube.com/embed/${ytId}`} title={title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                    </div>
                  ) : null}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                    {!ytId && hasImage && (
                      <div className="w-full aspect-[2/1] overflow-hidden relative">
                        <img src={item.image_url} alt={title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" loading="lazy" onError={(e) => { const container = (e.target as HTMLImageElement).parentElement; if (container) container.style.display = "none"; }} />
                      </div>
                    )}
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${src.color}`}>
                          {favicon ? <img src={favicon} alt="" className="w-3 h-3 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : null}
                          {src.name}
                        </span>
                        <span className="text-[11px] text-text-muted">{timeAgo(item.publishedAt)}</span>
                          {trendingTopics.has(item.id) && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400">Trending</span>}
                      </div>
                      <h2 className="font-semibold text-text leading-snug text-[15px] group-hover:text-text/80 transition-colors">{title}</h2>
                      {summary && summary !== title && summary.length > 10 && (
                        <p className="text-sm text-text-muted mt-1.5 line-clamp-2 leading-relaxed">{summary}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40">
                        <div className="flex items-center gap-0.5">
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "like"); }} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${userReactions[item.id] === "like" ? "text-green-400 bg-green-500/10" : "text-text-muted hover:text-green-400 hover:bg-green-500/10"}`} aria-label="More like this"><ThumbsUp className="h-3.5 w-3.5" />More</button>
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "dislike"); }} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${userReactions[item.id] === "dislike" ? "text-red-400 bg-red-500/10" : "text-text-muted hover:text-red-400 hover:bg-red-500/10"}`} aria-label="Less like this"><ThumbsDown className="h-3.5 w-3.5" />Less</button>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={(e) => { e.preventDefault(); handleBookmark(item.id); }} className={`p-1.5 rounded-md text-xs flex items-center justify-center transition-all ${userBookmarks.has(item.id) ? "text-yellow-400 bg-yellow-500/10" : "text-text-muted hover:text-text hover:bg-bg-hover"}`} aria-label="Save">{userBookmarks.has(item.id) ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}</button>
                          <button onClick={(e) => { e.preventDefault(); handleShare(item); }} className="p-1.5 rounded-md text-xs text-text-muted hover:text-text hover:bg-bg-hover flex items-center justify-center transition-all" aria-label="Share"><Share2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  </a>
                </article>
              );
            })}
          </div>
        )}
        {hasMore && (
          <button onClick={loadMore} disabled={loadingMore} className="w-full mt-4 py-3 text-sm font-medium text-text-muted hover:text-text border border-border rounded-2xl hover:bg-bg-card transition-all">
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}
        {!hasMore && !loading && dedupedItems.length > 0 && (
          <p className="text-center py-8 text-xs text-text-muted">You&apos;re all caught up</p>
        )}
      </main>

      <footer className="border-t border-border py-6 mt-8">
        <div className="max-w-2xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-text-muted">
          <span>MyFeed &copy; {new Date().getFullYear()}</span>
          <Link href="/privacy" className="hover:text-text transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-text transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-text transition-colors">Contact</Link>
        </div>
      </footer>

      {/* New Feed Modal */}
      {/* Email Digest Preferences Modal */}
      {showEmailPrefs && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEmailPrefs(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Mail className="h-5 w-5" /><h2 className="font-bold text-lg">Email Digest</h2></div>
                <button onClick={() => setShowEmailPrefs(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>

              <div className="space-y-4">
                {/* Enable/disable */}
                <label className="flex items-center justify-between">
                  <span className="text-sm">Receive email digests</span>
                  <input type="checkbox" checked={emailPrefs.enabled} onChange={(e) => setEmailPrefs({ ...emailPrefs, enabled: e.target.checked })} className="rounded" />
                </label>

                {emailPrefs.enabled && (
                  <>
                    {/* Frequency */}
                    <div>
                      <label className="text-xs text-text-muted font-medium uppercase tracking-wider block mb-1.5">Frequency</label>
                      <div className="flex gap-2">
                        {[{ v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" }, { v: "realtime", l: "Every 6h" }].map((o) => (
                          <button key={o.v} onClick={() => setEmailPrefs({ ...emailPrefs, frequency: o.v })} className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${emailPrefs.frequency === o.v ? "border-text bg-text/10 text-text font-semibold" : "border-border text-text-muted hover:border-text/30"}`}>{o.l}</button>
                        ))}
                      </div>
                    </div>

                    {/* Time */}
                    <div>
                      <label className="text-xs text-text-muted font-medium uppercase tracking-wider block mb-1.5">Delivery time</label>
                      <select value={emailPrefs.time} onChange={(e) => setEmailPrefs({ ...emailPrefs, time: e.target.value })} className="w-full bg-bg-hover border border-border rounded-lg px-3 py-2 text-sm">
                        <option value="06:00">6:00 AM</option>
                        <option value="07:00">7:00 AM</option>
                        <option value="08:00">8:00 AM (default)</option>
                        <option value="09:00">9:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="18:00">6:00 PM</option>
                      </select>
                    </div>

                    {/* Feed selection */}
                    <div>
                      <label className="text-xs text-text-muted font-medium uppercase tracking-wider block mb-1.5">Include feeds</label>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-hover cursor-pointer">
                          <input type="checkbox" checked={emailPrefs.feeds.includes("for-you")} onChange={(e) => { const f = e.target.checked ? [...emailPrefs.feeds, "for-you"] : emailPrefs.feeds.filter((x) => x !== "for-you"); setEmailPrefs({ ...emailPrefs, feeds: f }); }} className="rounded" />
                          <span className="text-sm">✨ For You (all feeds mixed)</span>
                        </label>
                        {FEEDS.map((feed) => (
                          <label key={feed.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-hover cursor-pointer">
                            <input type="checkbox" checked={emailPrefs.feeds.includes(feed.id)} onChange={(e) => { const f = e.target.checked ? [...emailPrefs.feeds, feed.id] : emailPrefs.feeds.filter((x) => x !== feed.id); setEmailPrefs({ ...emailPrefs, feeds: f }); }} className="rounded" />
                            <span className="text-sm">{feed.icon} {feed.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowEmailPrefs(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                <button onClick={async () => {
                  try {
                    await fetch("/api/email-preferences", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(emailPrefs),
                    });
                    toast("Email preferences saved", "success");
                  } catch { toast("Failed to save", "error"); }
                  setShowEmailPrefs(false);
                }} className="flex-1 py-2.5 text-sm bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewFeed && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewFeed(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-text/5 flex items-center justify-center"><Sparkles className="h-4 w-4 text-text" /></div><h2 className="font-bold text-lg">Create a Feed</h2></div>
                <button onClick={() => setShowNewFeed(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4 ml-10">Describe what you want to follow. AI will find the best content.</p>
              <textarea autoFocus placeholder="e.g. Latest React and Next.js tutorials, new CSS features" className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 transition-all placeholder:text-text-muted/50" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowNewFeed(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                {user ? (
                  <button onClick={async () => { if (!newPrompt.trim()) return; trackEvent("create_feed", { prompt: newPrompt.slice(0, 100), logged_in: true }); try { const res = await fetch("/api/feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPrompt.slice(0, 40), query_text: newPrompt }) }); const data = await res.json(); const id = data.feed?.id; if (id) { fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {}); window.location.href = `/my/${id}`; return; } window.location.href = "/dashboard"; } catch { window.location.href = "/dashboard"; } }} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Create feed</button>
                ) : (
                  <Link href={`/login?signup=true${newPrompt ? `&prompt=${encodeURIComponent(newPrompt)}` : ""}`} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Sign up to create</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
