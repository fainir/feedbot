"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Rss, Search, X, RefreshCw, AlertCircle, Sparkles, ArrowRight, LogOut, Crown, CheckCircle2, Sun, Moon, Keyboard, Share2, Bookmark, Download, Settings, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { FeedCard } from "@/components/feed/feed-card";
import { SkeletonFeed } from "@/components/feed/skeleton-card";
import { useToast } from "@/components/ui/toast";
import { timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

interface Tab {
  id: string;
  name: string;
  prompt: string;
  items: FeedItem[];
  loading: boolean;
  lastRefresh: string | null;
  error?: string | null;
}

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

const FEED_TEMPLATES = [
  {
    emoji: "🤖",
    name: "AI News",
    prompt: "Latest AI and machine learning breakthroughs, new models, and research papers",
  },
  {
    emoji: "🚀",
    name: "Startups",
    prompt: "Startup funding news, product launches, and founder stories",
  },
  {
    emoji: "💻",
    name: "Dev Tools",
    prompt: "New developer tools, frameworks, programming languages, and open source projects",
  },
  {
    emoji: "₿",
    name: "Crypto",
    prompt: "Cryptocurrency market news, DeFi updates, and blockchain technology",
  },
  {
    emoji: "🎨",
    name: "Design",
    prompt: "UI/UX design trends, tools, and inspiration",
  },
  {
    emoji: "📈",
    name: "Markets",
    prompt: "Stock market analysis, economic news, and investment trends",
  },
];

function mapDbItemToFeedItem(item: Record<string, unknown>): FeedItem {
  const source = (item.source as string) || "";
  let hostname = source;
  try {
    if (item.url) hostname = new URL(item.url as string).hostname.replace("www.", "");
  } catch {}
  return {
    id: item.id as string,
    title: item.title as string,
    summary: item.summary as string,
    source,
    url: item.url as string,
    publishedAt: (item.published_at as string) || (item.created_at as string),
    sourceIcon: (item.image_url as string) || `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
  };
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "all", name: "All", prompt: "", items: [], loading: false, lastRefresh: null },
  ]);
  const [activeTabId, setActiveTabId] = useState("all");
  const [showNewTab, setShowNewTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [newTabPrompt, setNewTabPrompt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(15);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Reset visible count when switching tabs
  useEffect(() => {
    setVisibleCount(15);
  }, [activeTabId]);

  // Infinite scroll — load more items when sentinel is visible
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => prev + 15);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("feedbot-bookmarks");
      if (saved) setBookmarkedIds(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const toggleBookmark = useCallback((item: FeedItem) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
        toast("Removed from saved", "info");
      } else {
        next.add(item.id);
        toast("Saved for later", "success");
        try {
          const savedItems = JSON.parse(localStorage.getItem("feedbot-bookmark-items") || "{}");
          savedItems[item.id] = item;
          localStorage.setItem("feedbot-bookmark-items", JSON.stringify(savedItems));
        } catch {}
      }
      localStorage.setItem("feedbot-bookmarks", JSON.stringify([...next]));
      return next;
    });
  }, [toast]);

  // Get user on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Show checkout success banner
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      setShowCheckoutSuccess(true);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  // Load feeds from Supabase on mount
  useEffect(() => {
    async function loadFeeds() {
      try {
        const res = await fetch("/api/feeds");
        if (!res.ok) return;
        const { feeds } = await res.json();
        if (!feeds || feeds.length === 0) {
          setInitialLoading(false);
          return;
        }

        // Load items for each feed in parallel
        const feedTabs: Tab[] = await Promise.all(
          feeds.map(async (feed: Record<string, unknown>) => {
            let items: FeedItem[] = [];
            try {
              const itemsRes = await fetch(`/api/feeds/${feed.id}`);
              if (itemsRes.ok) {
                const data = await itemsRes.json();
                items = (data.items || []).map(mapDbItemToFeedItem);
              }
            } catch {}
            return {
              id: feed.id as string,
              name: feed.name as string,
              prompt: feed.query_text as string,
              items,
              loading: false,
              lastRefresh: feed.last_refreshed_at as string | null,
            };
          })
        );

        // Auto-refresh stale feeds (not refreshed in 6+ hours)
        const STALE_MS = 6 * 60 * 60 * 1000;
        const staleFeedIds = feedTabs
          .filter((t) => {
            if (!t.lastRefresh) return true;
            return Date.now() - new Date(t.lastRefresh).getTime() > STALE_MS;
          })
          .map((t) => t.id);

        setTabs([
          { id: "all", name: "All", prompt: "", items: [], loading: false, lastRefresh: null },
          ...feedTabs.map((t) =>
            staleFeedIds.includes(t.id) ? { ...t, loading: true } : t
          ),
        ]);

        // Background refresh stale feeds
        for (const feedId of staleFeedIds) {
          (async () => {
            try {
              await fetch(`/api/feeds/${feedId}/refresh`, { method: "POST" });
              const res = await fetch(`/api/feeds/${feedId}`);
              if (!res.ok) return;
              const data = await res.json();
              const items = (data.items || []).map(mapDbItemToFeedItem);
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === feedId
                    ? { ...t, items, loading: false, lastRefresh: new Date().toISOString() }
                    : t
                )
              );
            } catch {
              setTabs((prev) =>
                prev.map((t) => (t.id === feedId ? { ...t, loading: false } : t))
              );
            }
          })();
        }
      } catch (err) {
        console.error("Failed to load feeds:", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadFeeds();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // ? to show shortcuts (only when not typing)
      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }

      // Escape to close modals
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowSearch(false);
        setShowNewTab(false);
        return;
      }

      // / to focus search (only when not typing)
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        setShowSearch(true);
        return;
      }

      // d to toggle dark mode (only when not typing)
      if (e.key === "d" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
        return;
      }

      // b to go to saved/bookmarks (only when not typing)
      if (e.key === "b" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTabId("saved");
        return;
      }

      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx < tabs.length) setActiveTabId(tabs[idx].id);
      }
      if (e.key === "t" && !showNewTab) {
        e.preventDefault();
        setShowNewTab(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tabs, showNewTab, theme, setTheme]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Get all items across all tabs for the "All" view
  const allItems = tabs
    .filter((t) => t.id !== "all")
    .flatMap((t) => t.items)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Get bookmarked items for the Saved tab
  const bookmarkedItems: FeedItem[] = (() => {
    const allCurrentItems = tabs.filter((t) => t.id !== "all").flatMap((t) => t.items);
    const items: FeedItem[] = [];
    const found = new Set<string>();
    for (const item of allCurrentItems) {
      if (bookmarkedIds.has(item.id) && !found.has(item.id)) {
        items.push(item);
        found.add(item.id);
      }
    }
    try {
      const savedItems = JSON.parse(localStorage.getItem("feedbot-bookmark-items") || "{}");
      for (const id of bookmarkedIds) {
        if (!found.has(id) && savedItems[id]) {
          items.push(savedItems[id]);
        }
      }
    } catch {}
    return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  })();

  const displayItems = activeTabId === "all" ? allItems : activeTabId === "saved" ? bookmarkedItems : activeTab.items;
  const filteredItems = searchQuery
    ? displayItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.summary.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayItems;

  const createFeed = useCallback(async (name: string, prompt: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, query_text: prompt, description: prompt }),
      });
      if (!res.ok) return null;
      const { feed, initial_items_count } = await res.json();

      // Load the items that were just created
      let items: FeedItem[] = [];
      if (initial_items_count > 0) {
        try {
          const itemsRes = await fetch(`/api/feeds/${feed.id}`);
          if (itemsRes.ok) {
            const data = await itemsRes.json();
            items = (data.items || []).map(mapDbItemToFeedItem);
          }
        } catch {}
      }

      const tab: Tab = {
        id: feed.id,
        name: feed.name,
        prompt: feed.query_text,
        items,
        loading: false,
        lastRefresh: feed.last_refreshed_at,
      };
      setTabs((prev) => [...prev, tab]);
      return feed.id;
    } catch {
      return null;
    }
  }, []);

  const addTab = async () => {
    if (!newTabName.trim() || !newTabPrompt.trim()) return;
    const name = newTabName.trim();
    const prompt = newTabPrompt.trim();

    // Show loading state immediately
    const tempId = "creating-" + Date.now();
    const tempTab: Tab = {
      id: tempId,
      name,
      prompt,
      items: [],
      loading: true,
      lastRefresh: null,
    };
    setTabs((prev) => [...prev, tempTab]);
    setActiveTabId(tempId);
    setShowNewTab(false);
    setNewTabName("");
    setNewTabPrompt("");

    const feedId = await createFeed(name, prompt);
    if (feedId) {
      setTabs((prev) => prev.filter((t) => t.id !== tempId));
      setActiveTabId(feedId);
      toast(`"${name}" feed created`, "success");
    } else {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tempId
            ? { ...t, loading: false, error: "Failed to create feed. Try again." }
            : t
        )
      );
      toast("Failed to create feed", "error");
    }
  };

  const deleteTab = async (id: string) => {
    if (id === "all") return;
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) setActiveTabId("all");

    // Delete from Supabase in background
    try {
      await fetch(`/api/feeds/${id}`, { method: "DELETE" });
    } catch {}
  };

  const refreshTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.prompt || tabId === "all") return;

      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, loading: true, error: null } : t))
      );

      try {
        // Refresh via API (discovers new items + saves to DB)
        await fetch(`/api/feeds/${tabId}/refresh`, { method: "POST" });

        // Reload all items for this feed
        const res = await fetch(`/api/feeds/${tabId}`);
        if (!res.ok) throw new Error("Failed to load feed");
        const data = await res.json();
        const items = (data.items || []).map(mapDbItemToFeedItem);

        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? { ...t, items, loading: false, error: null, lastRefresh: new Date().toISOString() }
              : t
          )
        );
      } catch {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? { ...t, loading: false, error: "Failed to refresh feed. Try again." }
              : t
          )
        );
      }
    },
    [tabs]
  );

  const refreshAllTabs = useCallback(() => {
    const feedTabs = tabs.filter((t) => t.id !== "all" && t.prompt);
    if (feedTabs.length === 0) return;
    feedTabs.forEach((t) => refreshTab(t.id));
  }, [tabs, refreshTab]);

  const shareFeed = useCallback(async () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab || activeTabId === "all") return;
    const params = new URLSearchParams({ name: tab.name, prompt: tab.prompt });
    const shareUrl = `${window.location.origin}/dashboard?share=${encodeURIComponent(params.toString())}`;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    toast("Share link copied to clipboard", "success");
    setTimeout(() => setShareCopied(false), 2000);
  }, [activeTabId, tabs, toast]);

  const exportFeed = useCallback((format: "rss" | "json") => {
    if (activeTabId === "all" || activeTabId === "saved") return;
    window.open(`/api/feeds/${activeTabId}/export?format=${format}`, "_blank");
    toast(`Exported as ${format.toUpperCase()}`, "success");
  }, [activeTabId, toast]);

  // Auto-import shared feed from URL
  useEffect(() => {
    const shareParam = searchParams.get("share");
    if (!shareParam) return;
    try {
      const params = new URLSearchParams(shareParam);
      const name = params.get("name");
      const prompt = params.get("prompt");
      if (name && prompt) {
        window.history.replaceState({}, "", "/dashboard");
        createFeed(name, prompt).then((feedId) => {
          if (feedId) setActiveTabId(feedId);
        });
      }
    } catch {}
  }, [searchParams, createFeed]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleUpgrade() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch {
      alert("Failed to start checkout");
    }
    setCheckingOut(false);
  }

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header skeleton */}
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-bg-hover" />
            <div className="h-5 w-24 animate-pulse rounded-md bg-bg-hover" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 animate-pulse rounded-lg bg-bg-hover" />
            <div className="h-8 w-8 animate-pulse rounded-lg bg-bg-hover" />
          </div>
        </div>
        {/* Tab bar skeleton */}
        <div className="mb-6 flex gap-2 border-b border-border pb-2">
          <div className="h-9 w-16 animate-pulse rounded-lg bg-bg-hover" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-bg-hover" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-bg-hover" />
        </div>
        <SkeletonFeed count={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* User Header */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Rss className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-text">FeedBot</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleUpgrade}
            disabled={checkingOut}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-secondary to-orange-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:px-3"
          >
            <Crown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{checkingOut ? "Loading..." : "Upgrade to Pro"}</span>
            <span className="sm:hidden">{checkingOut ? "..." : "Pro"}</span>
          </button>
          {user && (
            <span className="hidden text-sm text-text-muted sm:inline">
              {user.email}
            </span>
          )}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode (D)`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            href="/dashboard/settings"
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setShowShortcuts(true)}
            className="hidden rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text sm:flex"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Checkout Success Banner */}
      {showCheckoutSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-300">
              Welcome to Pro! You now have unlimited feeds and hourly updates.
            </p>
          </div>
          <button
            onClick={() => setShowCheckoutSuccess(false)}
            className="shrink-0 text-green-400 hover:text-green-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Bar */}
      {allItems.length > 0 && !initialLoading && (
        <div className="mb-4 flex items-center gap-4 text-xs text-text-muted">
          <span>{tabs.filter((t) => t.id !== "all").length} feeds</span>
          <span className="text-border">|</span>
          <span>{allItems.length} items</span>
          <span className="text-border">|</span>
          <span>{bookmarkedIds.size} saved</span>
          <div className="flex-1" />
          <button
            onClick={() => setShowAnalytics((v) => !v)}
            className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-bg-hover hover:text-text"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {showAnalytics ? "Hide" : "Show"} Analytics
          </button>
        </div>
      )}

      {/* Source Analytics */}
      {showAnalytics && allItems.length > 0 && (() => {
        const sourceCounts: Record<string, number> = {};
        for (const item of allItems) {
          let domain = item.source;
          try { domain = new URL(item.url).hostname.replace("www.", ""); } catch {}
          sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
        }
        const sorted = Object.entries(sourceCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);
        const max = sorted[0]?.[1] || 1;

        return (
          <div className="mb-6 rounded-xl border border-border bg-bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-text">Top Sources</h3>
            <div className="space-y-2">
              {sorted.map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs text-text-muted">{source}</span>
                  <div className="flex-1">
                    <div
                      className="h-4 rounded-full bg-primary/20"
                      style={{ width: "100%" }}
                    >
                      <div
                        className="h-4 rounded-full bg-primary transition-all"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-medium text-text-muted">{count}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Tabs Bar */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`group relative flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTabId === tab.id
                ? "bg-primary text-white"
                : "text-text-muted hover:bg-surface hover:text-text"
            }`}
          >
            {tab.name}
            {!tab.loading && tab.items.length > 0 && tab.id !== "all" && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                activeTabId === tab.id ? "bg-white/20" : "bg-border text-text-muted"
              }`}>
                {tab.items.length}
              </span>
            )}
            {tab.id === "all" && allItems.length > 0 && !tabs.some((t) => t.loading) && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                activeTabId === "all" ? "bg-white/20" : "bg-border text-text-muted"
              }`}>
                {allItems.length}
              </span>
            )}
            {tab.loading && (
              <RefreshCw className="h-3 w-3 animate-spin" />
            )}
            {tab.id !== "all" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTab(tab.id);
                }}
                className={`ml-1 rounded p-0.5 hover:bg-white/20 ${
                  activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                } transition-opacity`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </button>
        ))}
        <button
          onClick={() => setActiveTabId("saved")}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTabId === "saved"
              ? "bg-secondary text-black"
              : "text-text-muted hover:bg-surface hover:text-text"
          }`}
        >
          <Bookmark className={`h-3.5 w-3.5 ${activeTabId === "saved" ? "fill-black" : ""}`} />
          Saved
          {bookmarkedIds.size > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
              activeTabId === "saved" ? "bg-black/20" : "bg-border text-text-muted"
            }`}>
              {bookmarkedIds.size}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowNewTab(true)}
          className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
        >
          <Plus className="h-4 w-4" />
          New Tab
        </button>
      </div>

      {/* Pro Upgrade Banner — show when user has 3+ tabs */}
      {tabs.filter((t) => t.id !== "all").length >= 3 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text">
              You&apos;ve hit the free plan limit (3 feeds)
            </p>
            <p className="text-xs text-text-muted">
              Upgrade to Pro for unlimited feeds, hourly updates, and WhatsApp notifications.
            </p>
          </div>
          <a
            href="/#pricing"
            className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Upgrade
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* New Tab Form */}
      {showNewTab && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-text">
            Create New Tab
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Tab name (e.g., AI News, Startup Ideas)"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newTabName.trim() && newTabPrompt.trim() && addTab()}
              className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              autoFocus
            />
            <textarea
              placeholder="What should this feed show? (e.g., Latest AI research papers and breakthroughs)"
              value={newTabPrompt}
              onChange={(e) => setNewTabPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && newTabName.trim() && newTabPrompt.trim()) {
                  e.preventDefault();
                  addTab();
                }
              }}
              rows={2}
              className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2">
              <Button onClick={addTab} disabled={!newTabName.trim() || !newTabPrompt.trim()}>
                <Plus className="h-4 w-4" />
                Create Tab
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowNewTab(false);
                  setNewTabName("");
                  setNewTabPrompt("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{activeTab.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {activeTab.prompt || `${allItems.length} items from all feeds`}
            {activeTab.lastRefresh && (
              <span className="ml-2 text-xs text-text-muted/60">
                · Updated {timeAgo(activeTab.lastRefresh)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTabId !== "all" && activeTabId !== "saved" && (
            <>
              <div className="relative group/export">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-text-muted"
                  title="Export feed"
                  onClick={() => exportFeed("rss")}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <div className="absolute right-0 top-full z-10 mt-1 hidden rounded-lg border border-border bg-bg-card p-1 shadow-lg group-hover/export:block">
                  <button
                    onClick={() => exportFeed("rss")}
                    className="block w-full rounded-md px-3 py-1.5 text-left text-xs text-text-muted hover:bg-bg-hover hover:text-text"
                  >
                    RSS Feed
                  </button>
                  <button
                    onClick={() => exportFeed("json")}
                    className="block w-full rounded-md px-3 py-1.5 text-left text-xs text-text-muted hover:bg-bg-hover hover:text-text"
                  >
                    JSON
                  </button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={shareFeed}
                className="text-text-muted"
                title="Share this feed"
              >
                {shareCopied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="text-text-muted"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              activeTabId === "all" ? refreshAllTabs() : refreshTab(activeTabId)
            }
            className="text-text-muted"
            disabled={
              activeTabId === "all"
                ? tabs.some((t) => t.loading)
                : activeTab.loading
            }
          >
            <RefreshCw
              className={`h-4 w-4 ${
                (activeTabId === "all" ? tabs.some((t) => t.loading) : activeTab.loading)
                  ? "animate-spin"
                  : ""
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search feed items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* Error Banner */}
      {activeTab.error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="flex-1 text-sm text-red-300">{activeTab.error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              activeTabId === "all" ? refreshAllTabs() : refreshTab(activeTabId)
            }
            className="shrink-0 text-red-300 hover:text-red-200"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Feed */}
      {activeTab.loading ? (
        <SkeletonFeed count={5} />
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Rss className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-text">
            {activeTabId === "saved"
              ? "No saved items"
              : activeTabId === "all"
              ? "Create your first feed"
              : "No items yet"}
          </h2>
          <p className="mb-6 max-w-sm text-center text-sm text-text-muted">
            {activeTabId === "saved"
              ? "Bookmark articles from your feeds to save them here for later."
              : activeTabId === "all"
              ? "Pick a template below or create a custom feed with any topic."
              : "Click the refresh button to generate content for this tab."}
          </p>
          {activeTabId === "all" && (
            <>
              <div className="mb-6 grid w-full max-w-lg grid-cols-1 gap-3 px-4 sm:grid-cols-2">
                {FEED_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={async () => {
                      const tempId = "creating-" + Date.now();
                      const tempTab: Tab = {
                        id: tempId,
                        name: tpl.name,
                        prompt: tpl.prompt,
                        items: [],
                        loading: true,
                        lastRefresh: null,
                      };
                      setTabs((prev) => [...prev, tempTab]);
                      setActiveTabId(tempId);

                      const feedId = await createFeed(tpl.name, tpl.prompt);
                      if (feedId) {
                        setTabs((prev) => prev.filter((t) => t.id !== tempId));
                        setActiveTabId(feedId);
                      } else {
                        setTabs((prev) =>
                          prev.map((t) =>
                            t.id === tempId
                              ? { ...t, loading: false, error: "Failed to create feed." }
                              : t
                          )
                        );
                      }
                    }}
                    className="flex flex-col items-start rounded-xl border border-border bg-bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-bg-hover/50"
                  >
                    <span className="mb-1 text-lg">{tpl.emoji}</span>
                    <span className="text-sm font-medium text-text">
                      {tpl.name}
                    </span>
                    <span className="mt-0.5 text-xs text-text-muted line-clamp-1">
                      {tpl.prompt}
                    </span>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowNewTab(true)}
              >
                <Plus className="h-4 w-4" />
                Custom Feed
              </Button>
            </>
          )}
          {activeTabId !== "all" && (
            <Button onClick={() => refreshTab(activeTabId)}>
              <RefreshCw className="h-4 w-4" />
              Generate Feed
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.slice(0, visibleCount).map((item) => (
            <FeedCard
              key={item.id}
              title={item.title}
              summary={item.summary}
              source={item.source}
              url={item.url}
              publishedAt={item.publishedAt}
              sourceIcon={item.sourceIcon}
              bookmarked={bookmarkedIds.has(item.id)}
              onToggleBookmark={() => toggleBookmark(item)}
            />
          ))}
          {filteredItems.length > visibleCount && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          )}
          {filteredItems.length > 0 && filteredItems.length <= visibleCount && (
            <p className="py-4 text-center text-xs text-text-muted">
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-2xl border border-border bg-bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { keys: "?", desc: "Toggle this help" },
                { keys: "/", desc: "Focus search" },
                { keys: "D", desc: "Toggle dark/light mode" },
                { keys: "B", desc: "Go to Saved items" },
                { keys: "Esc", desc: "Close modal / search" },
                { keys: "Ctrl+1–9", desc: "Switch to tab 1–9" },
                { keys: "Ctrl+T", desc: "Create new tab" },
              ].map(({ keys, desc }) => (
                <div key={keys} className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">{desc}</span>
                  <kbd className="rounded-md border border-border bg-bg px-2 py-1 text-xs font-mono text-text">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
