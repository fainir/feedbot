"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, Sun, Moon, Sparkles, ThumbsUp, ThumbsDown, X, Bookmark, BookmarkCheck, Share2, Zap, Globe, TrendingUp, MoreVertical, LogIn, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { trackEvent } from "@/components/analytics";
import { useToast } from "@/components/ui/toast";
import { cleanSummary, cleanTitle, cleanSourceDisplay, getSourceInfo, timeAgo } from "@/lib/source-info";
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

// Gradient fallback for articles without cover images
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

const TABS = [
  { id: "ai", name: "AI & ML", icon: "🤖", query: "artificial intelligence breakthroughs, LLM models, AI startups, machine learning research, GPT Claude Gemini, AI tools and products" },
  { id: "tech", name: "Tech", icon: "💻", query: "tech industry news, product launches, big tech companies, gadgets, consumer technology, tech business" },
  { id: "startups", name: "Startups", icon: "🚀", query: "startup funding rounds, venture capital deals, Y Combinator, new startup launches, founder stories, seed series A B funding" },
  { id: "dev", name: "Dev", icon: "⚡", query: "software engineering, programming tutorials, developer tools, open source projects, React Next.js Python Rust, coding best practices" },
  { id: "science", name: "Science", icon: "🔬", query: "scientific discoveries, space exploration, physics breakthroughs, biology research, climate science, nature published papers" },
  { id: "crypto", name: "Crypto", icon: "₿", query: "cryptocurrency bitcoin ethereum blockchain DeFi web3 NFT crypto market analysis trading" },
  { id: "design", name: "Design", icon: "🎨", query: "UI UX design, product design, Figma, design systems, typography, visual design trends" },
  { id: "security", name: "Security", icon: "🔒", query: "cybersecurity, data breaches, zero-day exploits, infosec tools, penetration testing, security research" },
  { id: "gaming", name: "Gaming", icon: "🎮", query: "video games, game releases, gaming industry news, esports, game development, indie games" },
  { id: "business", name: "Business", icon: "📈", query: "business strategy, leadership, management, entrepreneurship, market trends, corporate news" },
  { id: "space", name: "Space", icon: "🚀", query: "SpaceX launches, NASA missions, Mars exploration, James Webb telescope, space industry, rocket launches, satellites" },
  { id: "health", name: "Health", icon: "🏥", query: "health research, medical breakthroughs, mental health, nutrition science, fitness studies, biotech news" },
  { id: "climate", name: "Climate", icon: "🌍", query: "climate change, renewable energy, solar wind power, sustainability, carbon emissions, green technology, electric vehicles" },
  { id: "fintech", name: "Fintech", icon: "💳", query: "fintech news, digital banking, payment technology, neobanks, financial APIs, open banking, insurtech" },
  { id: "devops", name: "DevOps", icon: "🔧", query: "DevOps, cloud infrastructure, Kubernetes Docker, CI CD pipelines, AWS Azure GCP, platform engineering, SRE" },
  { id: "data", name: "Data", icon: "📊", query: "data science, analytics, big data, data engineering, SQL databases, data visualization, business intelligence" },
  { id: "mobile", name: "Mobile", icon: "📱", query: "mobile app development, iOS Android, React Native Flutter, mobile UX, app store trends, Swift Kotlin" },
  { id: "marketing", name: "Marketing", icon: "📣", query: "digital marketing, SEO, content marketing, growth hacking, social media marketing, email marketing, conversion optimization" },
];

const PROMPT_EXAMPLES = [
  "Latest React and Next.js tutorials, new CSS features",
  "AI startup funding, new AI product launches",
  "Indie game development, pixel art, game jams",
  "Climate change research, renewable energy news",
];

export default function FeedPage() {
  const params = useParams();
  const feedSlug = (params.feed as string) || "tech";
  const activeTab = TABS.find((t) => t.id === feedSlug);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [newArticlesAvailable, setNewArticlesAvailable] = useState(0);
  const [communityFeed, setCommunityFeed] = useState<{ id: string; name: string; description: string; creator: string; followers: number } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [userFeeds, setUserFeeds] = useState<{ id: string; slug: string; name: string; icon: string }[]>([]);
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(new Set());
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [dontShowRemoveAgain, setDontShowRemoveAgain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showNewFeed, setShowNewFeed] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, "like" | "dislike">>({});
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  // Scroll active tab into view on mount
  useEffect(() => {
    if (!tabBarRef.current) return;
    const activeEl = tabBarRef.current.querySelector("[data-active='true']") as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
    }
  }, [feedSlug]);

  // Check auth state + load user feeds
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Load user's custom feeds as tabs
        fetch("/api/feeds").then((r) => r.json()).then((d) => {
          const feeds = (d.feeds || []).map((f: { id: string; slug?: string; name: string }) => ({
            id: f.slug || f.id,
            slug: f.slug || f.id,
            name: f.name.length > 20 ? f.name.slice(0, 18) + "..." : f.name,
            icon: "📡",
          }));
          setUserFeeds(feeds);
        }).catch(() => {});
      }
    });
    // Load tab preferences from storage
    try {
      const saved = sessionStorage.getItem("mf_tab_order");
      if (saved) setTabOrder(JSON.parse(saved));
      const hidden = sessionStorage.getItem("mf_hidden_tabs");
      if (hidden) setHiddenTabs(new Set(JSON.parse(hidden)));
      const dontShow = localStorage.getItem("mf_dont_show_remove");
      if (dontShow === "1") setDontShowRemoveAgain(true);
    } catch {}
  }, []);

  const handleReaction = useCallback(async (feedItemId: string, reaction: "like" | "dislike") => {
    if (!user) { toast("Sign up to save your preferences", "info"); return; }
    const prev = userReactions[feedItemId];
    // Optimistic update
    setUserReactions((r) => {
      const next = { ...r };
      if (next[feedItemId] === reaction) delete next[feedItemId];
      else next[feedItemId] = reaction;
      return next;
    });
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feed_item_id: feedItemId, reaction }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setUserReactions((r) => {
        const next = { ...r };
        if (prev) next[feedItemId] = prev;
        else delete next[feedItemId];
        return next;
      });
    }
  }, [user, userReactions]);

  const handleBookmark = useCallback(async (feedItemId: string) => {
    if (!user) { toast("Sign up to save articles", "info"); return; }
    const wasBookmarked = userBookmarks.has(feedItemId);
    // Optimistic update
    setUserBookmarks((s) => {
      const next = new Set(s);
      if (next.has(feedItemId)) next.delete(feedItemId);
      else next.add(feedItemId);
      return next;
    });
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feed_item_id: feedItemId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setUserBookmarks((s) => {
        const next = new Set(s);
        if (wasBookmarked) next.add(feedItemId);
        else next.delete(feedItemId);
        return next;
      });
    }
  }, [user, userBookmarks]);

  const handleShare = useCallback(async (item: FeedItem) => {
    trackEvent("share_article", { source: item.source, feed: feedSlug });
    const shareData = { title: item.title, url: item.url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(item.url);
    }
  }, [feedSlug]);

  const fetchFeed = useCallback((query: string, cursor?: string) => {
    const url = `/api/public/feeds?q=${encodeURIComponent(query)}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    return fetch(url).then((r) => r.json());
  }, []);

  const fetchBySlug = useCallback((slug: string, cursor?: string) => {
    const url = `/api/public/feed-by-slug?slug=${encodeURIComponent(slug)}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    return fetch(url).then((r) => r.json());
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setNewArticlesAvailable(0);
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    const fetcher = activeTab ? fetchFeed(activeTab.query) : fetchBySlug(feedSlug);
    fetcher
      .then((d) => { setItems(d.items || []); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .catch(() => setItems([]))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [activeTab, feedSlug, fetchFeed, fetchBySlug]);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    setCommunityFeed(null);
    setNotFound(false);

    if (activeTab) {
      // System tab — use query-based API
      fetchFeed(activeTab.query)
        .then((d) => { setItems(d.items || []); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else {
      // Try loading as a community feed by slug
      fetch(`/api/public/feed-by-slug?slug=${encodeURIComponent(feedSlug)}&limit=50`)
        .then((r) => {
          if (!r.ok) { setNotFound(true); setLoading(false); return; }
          return r.json();
        })
        .then((d) => {
          if (!d || !d.items) { setNotFound(true); return; }
          setItems(d.items);
          setHasMore(d.hasMore || false);
          setNextCursor(d.nextCursor || null);
          if (d.feed) {
            setCommunityFeed(d.feed);
            // Track view (fire and forget)
            fetch(`/api/feeds/${d.feed.id}/view`, { method: "POST" }).catch(() => {});
          }
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    }
  }, [feedSlug, activeTab, fetchFeed, fetchBySlug]);

  // Poll for new articles every 2 minutes
  useEffect(() => {
    if (!activeTab || items.length === 0) return;
    const interval = setInterval(() => {
      const q = activeTab.query;
      fetch(`/api/public/feeds?q=${encodeURIComponent(q)}&limit=1`)
        .then((r) => r.json())
        .then((d) => {
          const latest = d.items?.[0];
          if (latest && items[0] && new Date(latest.publishedAt) > new Date(items[0].publishedAt)) {
            setNewArticlesAvailable((prev) => prev + 1);
          }
        })
        .catch(() => {});
    }, 120000);
    return () => clearInterval(interval);
  }, [activeTab, items]);

  const dedupedItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.url.split("?")[0].split("#")[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items]);

  const loadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    const fetchMore = activeTab ? fetchFeed(activeTab.query, nextCursor) : fetchBySlug(feedSlug, nextCursor);
    fetchMore
      .then((d) => { setItems((p) => [...p, ...(d.items || [])]); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .finally(() => setLoadingMore(false));
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <header className="fixed top-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur-md border-b border-border flex items-center h-11">
          <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
            <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
          </Link>
          <div className="flex-1" />
          <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 border-l border-border">
            <Link href="/explore" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap">Explore</Link>
          </div>
        </header>
        <div className="h-11" />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 2.75rem)" }}>
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-2">404</h1>
            <p className="text-text-muted mb-6">Feed not found</p>
            <Link href="/explore" className="bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">Explore feeds</Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = activeTab?.name || communityFeed?.name || feedSlug;

  const handleShareFeed = useCallback(async () => {
    const url = `https://myfeed.space/${feedSlug}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${displayName} — MyFeed`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast("Link copied!", "success");
    }
  }, [feedSlug, displayName, toast]);

  // Build combined tab list: system tabs + user feeds, respecting order and hidden
  const allTabs = useMemo(() => {
    const systemTabs = TABS.map((t) => ({ id: t.id, name: t.name, icon: t.icon, isSystem: true }));
    const custom = userFeeds.map((f) => ({ id: f.id, name: f.name, icon: f.icon, isSystem: false }));
    const combined = [...systemTabs, ...custom];

    // Apply custom ordering if set
    if (tabOrder.length > 0) {
      const orderMap = new Map(tabOrder.map((id, i) => [id, i]));
      combined.sort((a, b) => {
        const ai = orderMap.get(a.id) ?? 999;
        const bi = orderMap.get(b.id) ?? 999;
        return ai - bi;
      });
    }

    // Filter hidden tabs
    return combined.filter((t) => !hiddenTabs.has(t.id));
  }, [userFeeds, tabOrder, hiddenTabs]);

  const saveTabOrder = useCallback((newOrder: string[]) => {
    setTabOrder(newOrder);
    try { sessionStorage.setItem("mf_tab_order", JSON.stringify(newOrder)); } catch {}
    // For signed-in users, also save to DB (future: user preferences table)
  }, []);

  const removeTab = useCallback((tabId: string) => {
    const newHidden = new Set(hiddenTabs);
    newHidden.add(tabId);
    setHiddenTabs(newHidden);
    try { sessionStorage.setItem("mf_hidden_tabs", JSON.stringify([...newHidden])); } catch {}
    setShowRemoveConfirm(null);
  }, [hiddenTabs]);

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string, tabName: string, tabIcon: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", tabId);
    // Create a clean drag image that looks like the tab
    const ghost = document.createElement("div");
    ghost.textContent = `${tabIcon} ${tabName}`;
    ghost.style.cssText = "position:fixed;top:-100px;left:-100px;padding:6px 12px;font-size:12px;font-weight:500;background:var(--color-bg-card);color:var(--color-text);border:1px solid var(--color-border);border-radius:8px;white-space:nowrap;z-index:9999;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    requestAnimationFrame(() => ghost.remove());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetId) return;
    const currentOrder = allTabs.map((t) => t.id);
    const fromIdx = currentOrder.indexOf(draggedTab);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    currentOrder.splice(fromIdx, 1);
    currentOrder.splice(toIdx, 0, draggedTab);
    saveTabOrder(currentOrder);
  }, [draggedTab, allTabs, saveTabOrder]);

  const handleDragEnd = useCallback(() => {
    setDraggedTab(null);
  }, []);

  // Mobile touch DnD — long press to start, drag to reorder
  const touchState = useRef<{ id: string; startX: number; timer: ReturnType<typeof setTimeout> | null }>({ id: "", startX: 0, timer: null });

  const handleTouchStart = useCallback((tabId: string, x: number) => {
    touchState.current.timer = setTimeout(() => {
      touchState.current.id = tabId;
      setDraggedTab(tabId);
    }, 400); // 400ms long press
    touchState.current.startX = x;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if moved too much
    if (touchState.current.timer && !touchState.current.id) {
      const dx = Math.abs(e.touches[0].clientX - touchState.current.startX);
      if (dx > 10) { clearTimeout(touchState.current.timer); touchState.current.timer = null; }
      return;
    }
    if (!touchState.current.id) return;
    e.preventDefault();
    // Find which tab element we're over
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const tabEl = el?.closest("[data-tab-id]") as HTMLElement | null;
    if (tabEl) {
      const targetId = tabEl.dataset.tabId!;
      if (targetId !== touchState.current.id) {
        const currentOrder = allTabs.map((t) => t.id);
        const fromIdx = currentOrder.indexOf(touchState.current.id);
        const toIdx = currentOrder.indexOf(targetId);
        if (fromIdx !== -1 && toIdx !== -1) {
          currentOrder.splice(fromIdx, 1);
          currentOrder.splice(toIdx, 0, touchState.current.id);
          saveTabOrder(currentOrder);
        }
      }
    }
  }, [allTabs, saveTabOrder]);

  const handleTouchEnd = useCallback(() => {
    if (touchState.current.timer) { clearTimeout(touchState.current.timer); touchState.current.timer = null; }
    touchState.current.id = "";
    setDraggedTab(null);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Single top bar — fixed so it never scrolls away */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur-md border-b border-border flex items-center h-11">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
        </Link>

        {/* Scrollable tabs — drag to reorder, X to remove */}
        {/* TODO: Add unread count badges per tab — requires tracking last visit timestamp per feed */}
        <div ref={tabBarRef} className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-0 min-w-0 pr-2">
          <Link href="/" className="px-2.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 border-transparent text-text hover:bg-bg-hover transition-colors flex items-center gap-1">
            <span className="text-sm">✨</span><span className="hidden sm:inline">For You</span>
          </Link>
          <div className="w-px h-4 bg-border/50 mx-0.5 flex-shrink-0" />
          {allTabs.map((tab) => (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id, tab.name, tab.icon)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(tab.id, e.touches[0].clientX)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`group flex shrink-0 cursor-grab select-none items-center border-b-2 py-3 pl-2.5 pr-1 text-xs font-medium transition-all active:cursor-grabbing ${
                feedSlug === tab.id
                  ? "border-text text-text"
                  : "border-transparent text-text-muted hover:bg-bg-hover hover:text-text"
              } ${draggedTab === tab.id ? "opacity-40 scale-105" : ""}`}
            >
              <Link
                href={`/${tab.id}`}
                data-active={feedSlug === tab.id}
                draggable={false}
                className="flex items-center gap-1 whitespace-nowrap"
              >
                <span className="text-sm">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.name}</span>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dontShowRemoveAgain) { removeTab(tab.id); }
                  else { setShowRemoveConfirm(tab.id); }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                draggable={false}
                className={`ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md opacity-0 transition-all pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 ${
                  feedSlug === tab.id
                    ? "text-text/70 hover:bg-text/10 hover:text-text"
                    : "text-text-muted hover:bg-bg-hover hover:text-text"
                }`}
                aria-label={`Remove ${tab.name}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 border-l border-border">
          <Link href="/explore" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap">Explore</Link>
          <button
            onClick={() => setShowNewFeed(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-text text-bg rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">Create feed</span>
            <span className="sm:hidden">New</span>
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-bg-hover transition-colors" aria-label="More options">
              <MoreVertical className="h-4 w-4 text-text-muted" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-bg-card border border-border rounded-xl shadow-lg py-1 z-50" onMouseLeave={() => setShowMenu(false)}>
                {user && <div className="px-3 py-2 border-b border-border"><p className="text-xs font-medium text-text truncate">{user.email}</p></div>}
                {mounted && (
                  <button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </button>
                )}
                {!user && (
                  <Link href="/login?signup=true" className="flex items-center gap-2 px-3 py-2 text-sm text-text font-medium hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>
                    <LogIn className="h-4 w-4" />
                    Sign up / Sign in
                  </Link>
                )}
                {user && (
                  <Link href="/bookmarks" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>
                    <Bookmark className="h-4 w-4" />
                    Bookmarks
                  </Link>
                )}
                {user && (
                  <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">
                    <LogIn className="h-4 w-4" />
                    Sign out
                  </button>
                )}
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

      {/* Feed header */}
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text flex items-center gap-1.5">{activeTab?.icon || "📡"} {displayName}</h2>
            <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
              {activeTab?.query || communityFeed?.description || ""}
              {!loading && dedupedItems.length > 0 && ` · ${dedupedItems.length} articles`}
            </p>
            {communityFeed && <p className="text-[10px] text-text-muted mt-0.5">by {communityFeed.creator} · {communityFeed.followers} followers</p>}
          </div>
          <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
            <button onClick={handleRefresh} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg-hover transition-colors" aria-label="Refresh feed" disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleShareFeed} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg-hover transition-colors" aria-label="Share feed">
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setShowCustomize(true); setNewPrompt(activeTab?.query || communityFeed?.description || ""); }}
              className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              Customize
            </button>
          </div>
        </div>
      </div>

      {/* Fixed new articles toast */}
      {newArticlesAvailable > 0 && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50">
          <button onClick={handleRefresh} className="bg-text text-bg px-4 py-2 rounded-full text-xs font-semibold shadow-lg hover:opacity-90 transition-all">
            {newArticlesAvailable} new {newArticlesAvailable === 1 ? "article" : "articles"} — tap to refresh
          </button>
        </div>
      )}

      {/* Feed */}
      <main id="main-content" className="max-w-2xl mx-auto px-4 pb-6">
        {loading ? (
          <div className="space-y-4 pt-2">{[1,2,3,4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border overflow-hidden bg-bg-card">
              {i <= 2 && <div className="w-full aspect-[2.5/1] bg-bg-hover" />}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3"><div className="w-4 h-4 rounded-full bg-bg-hover" /><div className="h-3 bg-bg-hover rounded w-16" /></div>
                <div className="h-5 bg-bg-hover rounded w-4/5 mb-2" />
                <div className="h-3 bg-bg-hover rounded w-full" />
              </div>
            </div>
          ))}</div>
        ) : dedupedItems.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-text-muted font-medium">Scanning the internet...</p>
            <p className="text-xs text-text-muted mt-1">Content refreshes automatically every 15 minutes</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {dedupedItems.map((item, i) => {
              const src = getSourceInfo(item.source);
              const title = cleanTitle(item.title);
              const summary = cleanSummary(item.summary);
              const hasImage = !!item.image_url;
              return (
                <article key={item.id || i} className={`group rounded-2xl border border-border overflow-hidden bg-bg-card hover:border-text/20 transition-all duration-200${!hasImage ? " border-l-4 border-l-text/10" : ""}`}>
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
                        <span className="text-[11px] text-text-muted">{timeAgo(item.publishedAt)}</span>
                      </div>
                      <h2 className="font-semibold text-text leading-snug text-[15px] group-hover:text-text/80 transition-colors">{title}</h2>
                      {summary && summary !== title && summary.length > 10 && (
                        <p className="text-sm text-text-muted mt-1.5 line-clamp-2 leading-relaxed">{summary}</p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "like"); }} className={`min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-all ${userReactions[item.id] === "like" ? "text-green-400 bg-green-500/10" : "text-text-muted hover:text-green-400 hover:bg-green-500/10"}`} aria-label="More like this"><ThumbsUp className="h-4 w-4" /></button>
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "dislike"); }} className={`min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-all ${userReactions[item.id] === "dislike" ? "text-red-400 bg-red-500/10" : "text-text-muted hover:text-red-400 hover:bg-red-500/10"}`} aria-label="Less like this"><ThumbsDown className="h-4 w-4" /></button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.preventDefault(); handleBookmark(item.id); }} className={`min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-all ${userBookmarks.has(item.id) ? "text-yellow-400 bg-yellow-500/10" : "text-text-muted hover:text-text hover:bg-bg-hover"}`} aria-label="Save">{userBookmarks.has(item.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}</button>
                          <button onClick={(e) => { e.preventDefault(); handleShare(item); }} className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-xs text-text-muted hover:text-text hover:bg-bg-hover flex items-center justify-center gap-1 transition-all" aria-label="Share"><Share2 className="h-4 w-4" /></button>
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
          <LoadMoreSentinel loading={loadingMore} onVisible={loadMore} />
        )}
        {!hasMore && dedupedItems.length > 0 && dedupedItems.length >= 15 && (
          <p className="text-center py-6 text-xs text-text-muted">You&apos;ve reached the end of this feed</p>
        )}
        {!hasMore && dedupedItems.length > 0 && dedupedItems.length < 15 && (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted mb-1">This feed is building up</p>
            <p className="text-xs text-text-muted">New articles are added every 15 minutes. Check back soon for more.</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 rounded-2xl border border-border bg-bg-card overflow-hidden">
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-text/5 mb-4">
              <Zap className="h-6 w-6 text-text" />
            </div>
            <h3 className="font-bold text-lg mb-2">Your internet, curated by AI</h3>
            <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">
              Describe what you care about in plain English. MyFeed scans thousands of sources and delivers only what matters to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setShowNewFeed(true)} className="inline-flex items-center justify-center gap-2 bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">
                <Sparkles className="h-4 w-4" />
                Create your custom feed
              </button>
            </div>
          </div>
          <div className="border-t border-border/50 px-6 py-4 bg-bg-hover/30">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2 font-medium">Popular feeds</p>
            <div className="flex flex-wrap gap-2">
              {["AI tools & products", "Startup funding", "React & Next.js", "Space exploration", "Cybersecurity"].map((ex) => (
                <span key={ex} className="text-xs px-3 py-1 rounded-full border border-border/50 text-text-muted">{ex}</span>
              ))}
            </div>
          </div>
        </div>
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
      {/* Remove tab confirmation popup */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRemoveConfirm(null)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Remove from tabs?</h3>
            <p className="text-sm text-text-muted mb-4">This will remove the tab from your bar. You can find it again in Explore.</p>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowRemoveAgain}
                onChange={(e) => {
                  setDontShowRemoveAgain(e.target.checked);
                  try { localStorage.setItem("mf_dont_show_remove", e.target.checked ? "1" : "0"); } catch {}
                }}
                className="rounded border-border"
              />
              <span className="text-xs text-text-muted">Don&apos;t show this again</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowRemoveConfirm(null)} className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
              <button onClick={() => removeTab(showRemoveConfirm)} className="flex-1 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}

      {showNewFeed && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewFeed(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-text/5 flex items-center justify-center"><Sparkles className="h-4 w-4 text-text" /></div>
                  <h2 className="font-bold text-lg">Create a Feed</h2>
                </div>
                <button onClick={() => setShowNewFeed(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4 ml-10">Describe what you want to follow. AI will find the best content.</p>
              <textarea autoFocus placeholder="e.g. Latest React and Next.js tutorials, new CSS features, web performance tips" className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 transition-all placeholder:text-text-muted/50" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
              <div className="mt-3 mb-4">
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2 font-medium">Try these</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => setNewPrompt(ex)} className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-text-muted hover:text-text hover:border-text/30 transition-all">{ex.length > 40 ? ex.slice(0, 37) + "..." : ex}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewFeed(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                {user ? (
                  <button
                    onClick={async () => {
                      if (!newPrompt.trim()) return;
                      trackEvent("create_feed", { prompt: newPrompt.slice(0, 100), logged_in: true });
                      try {
                        const res = await fetch("/api/feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPrompt.slice(0, 40), query_text: newPrompt }) });
                        const data = await res.json();
                        const id = data.feed?.id;
                        if (id) { fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {}); window.location.href = `/my/${id}`; return; }
                        window.location.href = "/dashboard";
                      } catch { window.location.href = "/dashboard"; }
                    }}
                    className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Create feed
                  </button>
                ) : (
                  <Link href={`/login?signup=true${newPrompt ? `&prompt=${encodeURIComponent(newPrompt)}` : ""}`} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sign up to create
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load More Sentinel is defined below */}

      {/* Customize Feed Modal */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCustomize(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-text/5 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-text" /></div>
                  <h2 className="font-bold text-lg">Customize Feed</h2>
                </div>
                <button onClick={() => setShowCustomize(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4 ml-10">Change the prompt to adjust what articles appear.</p>
              <textarea autoFocus className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 transition-all" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowCustomize(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                {user ? (
                  <button onClick={async () => { if (!newPrompt.trim()) return; try { const res = await fetch("/api/feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPrompt.slice(0, 40), query_text: newPrompt }) }); const data = await res.json(); const id = data.feed?.id; if (id) { fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {}); window.location.href = `/my/${id}`; return; } } catch {} setShowCustomize(false); }} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Save as custom feed
                  </button>
                ) : (
                <Link href={`/login?signup=true${newPrompt ? `&prompt=${encodeURIComponent(newPrompt)}` : ""}`} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sign up to customize
                </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadMoreSentinel({ loading, onVisible }: { loading: boolean; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onVisibleRef.current(); },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex justify-center py-6">
      {loading && (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
      )}
    </div>
  );
}
