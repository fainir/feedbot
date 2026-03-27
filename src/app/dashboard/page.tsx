"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from "react";
import { useSearchParams } from "next/navigation";
import { EyeOff, Plus, Search, RefreshCw, Download, Share2, CheckCircle2, CheckCheck, LayoutList, LayoutGrid, CheckSquare, X, Bookmark, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { SkeletonFeed } from "@/components/feed/skeleton-card";
import { useToast } from "@/components/ui/toast";
import { computeTrending, TrendingHeader } from "@/components/feed/trending-tab";
import { FilterChips, applyFilter, type FilterChipType } from "@/components/feed/filter-chips";
import { type FeedFolder } from "@/components/feed/feed-folders";
import { type KeywordAlert, computeKeywordMatches } from "@/components/feed/keyword-alerts";
import { SmartSortButton, smartSort, type SortMode } from "@/components/feed/smart-sort";
import { type SavedCollection } from "@/components/feed/saved-collections";
import { filterMutedSources, type MutedSource } from "@/components/feed/source-mute";
import { useReactions } from "@/components/feed/emoji-reactions";
import { sendKeywordNotification } from "@/components/feed/push-notifications";
import { FeedComparisonButton } from "@/components/feed/feed-comparison";
import { usePinnedArticles, PinnedArticles, sortWithPinned } from "@/components/feed/pin-articles";
import { useBookmarkTags } from "@/components/feed/bookmark-tags";
import { useReadLater, ReadLaterQueue } from "@/components/feed/read-later-queue";
import { ContentTypeFilter, getContentType } from "@/components/feed/content-type-tag";
import { FeedCard } from "@/components/feed/feed-card";
import { DashboardHeader, DashboardTabBar, DashboardWidgets, DashboardModals, FeedItemList } from "@/components/dashboard";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { timeAgo } from "@/lib/utils";
import { type Tab, type FeedItem, FEED_TEMPLATES, mapDbItemToFeedItem } from "@/lib/feed-types";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

// Lazy-load heavy, conditionally-rendered components for better initial load
const CatchMeUp = lazy(() => import("@/components/feed/catch-me-up").then(m => ({ default: m.CatchMeUp })));
const TopicClusterView = lazy(() => import("@/components/feed/topic-clusters").then(m => ({ default: m.TopicClusterView })));
const FeedSuggestions = lazy(() => import("@/components/feed/feed-suggestions").then(m => ({ default: m.FeedSuggestions })));
const ReadingHistory = lazy(() => import("@/components/feed/reading-history").then(m => ({ default: m.ReadingHistory })));
const SavedCollections = lazy(() => import("@/components/feed/saved-collections").then(m => ({ default: m.SavedCollections })));
const SourceMuteManager = lazy(() => import("@/components/feed/source-mute").then(m => ({ default: m.SourceMuteManager })));
const FeedTimeline = lazy(() => import("@/components/feed/feed-timeline").then(m => ({ default: m.FeedTimeline })));
const ContentHighlights = lazy(() => import("@/components/feed/content-highlights").then(m => ({ default: m.ContentHighlights })));
const ShareFeed = lazy(() => import("@/components/feed/share-feed").then(m => ({ default: m.ShareFeed })));
const FeedHealthScore = lazy(() => import("@/components/feed/feed-health-score").then(m => ({ default: m.FeedHealthScore })));
const SentimentTracker = lazy(() => import("@/components/feed/sentiment-tracker").then(m => ({ default: m.SentimentTracker })));

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  // ── State ─────────────────────────────────────────────────────────────
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
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [importing, setImporting] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverUrl, setDiscoverUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<{ title: string; url: string; type: string }[]>([]);
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [readerItem, setReaderItem] = useState<FeedItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterChipType>("all");
  const [folders, setFolders] = useState<FeedFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [keywordAlerts, setKeywordAlerts] = useState<KeywordAlert[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [showClusters, setShowClusters] = useState(false);
  const [mutedSources, setMutedSources] = useState<MutedSource[]>([]);
  const [savedCollections, setSavedCollections] = useState<SavedCollection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { reactions, toggleReaction } = useReactions();
  const { pinnedIds, togglePin, isPinned } = usePinnedArticles();
  const { addToQueue, removeFromQueue, isInQueue } = useReadLater();
  const { getTagsForItem } = useBookmarkTags();
  const [readingModeItem, setReadingModeItem] = useState<FeedItem | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareItems, setCompareItems] = useState<FeedItem[]>([]);
  const [similarTarget, setSimilarTarget] = useState<FeedItem | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // ── Effects ───────────────────────────────────────────────────────────

  // Reset visible count when switching tabs
  useEffect(() => {
    setVisibleCount(15);
  }, [activeTabId]);

  // Infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((prev) => prev + 15);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load bookmarks and read state from localStorage
  useEffect(() => {
    try { const saved = localStorage.getItem("feedbot-bookmarks"); if (saved) setBookmarkedIds(new Set(JSON.parse(saved))); } catch {}
    try { const read = localStorage.getItem("feedbot-read"); if (read) setReadIds(new Set(JSON.parse(read))); } catch {}
    try { const notes = localStorage.getItem("feedbot-notes"); if (notes) setItemNotes(JSON.parse(notes)); } catch {}
    try { const foldersData = localStorage.getItem("feedbot-folders"); if (foldersData) setFolders(JSON.parse(foldersData)); } catch {}
    try { const alertsData = localStorage.getItem("feedbot-alerts"); if (alertsData) setKeywordAlerts(JSON.parse(alertsData)); } catch {}
    try { const mutedData = localStorage.getItem("feedbot-muted-sources"); if (mutedData) setMutedSources(JSON.parse(mutedData)); } catch {}
    try { const collectionsData = localStorage.getItem("feedbot-collections"); if (collectionsData) setSavedCollections(JSON.parse(collectionsData)); } catch {}
    try { const notifEnabled = localStorage.getItem("feedbot-notifications"); if (notifEnabled === "true") setNotificationsEnabled(true); } catch {}
  }, []);

  // Reset focused index on tab change
  useEffect(() => { setFocusedIndex(-1); }, [activeTabId]);

  // ── Callbacks (needed before keyboard shortcuts effect) ───────────────

  const markAsRead = useCallback((itemId: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      localStorage.setItem("feedbot-read", JSON.stringify([...next]));
      return next;
    });
  }, []);

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
        if (!feeds || feeds.length === 0) { setInitialLoading(false); return; }

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

        const STALE_MS = 6 * 60 * 60 * 1000;
        const staleFeedIds = feedTabs
          .filter((t) => !t.lastRefresh || Date.now() - new Date(t.lastRefresh).getTime() > STALE_MS)
          .map((t) => t.id);

        setTabs([
          { id: "all", name: "All", prompt: "", items: [], loading: false, lastRefresh: null },
          ...feedTabs.map((t) => staleFeedIds.includes(t.id) ? { ...t, loading: true } : t),
        ]);

        for (const feedId of staleFeedIds) {
          (async () => {
            try {
              await fetch(`/api/feeds/${feedId}/refresh`, { method: "POST" });
              const res = await fetch(`/api/feeds/${feedId}`);
              if (!res.ok) return;
              const data = await res.json();
              const items = (data.items || []).map(mapDbItemToFeedItem);
              setTabs((prev) => prev.map((t) => t.id === feedId ? { ...t, items, loading: false, lastRefresh: new Date().toISOString() } : t));
            } catch {
              setTabs((prev) => prev.map((t) => (t.id === feedId ? { ...t, loading: false } : t)));
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

      if (e.key === "?" && !isInput) { e.preventDefault(); setShowShortcuts((v) => !v); return; }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") { e.preventDefault(); setShowGlobalSearch(true); return; }
      if (e.key === "Escape") { setShowShortcuts(false); setShowSearch(false); setShowNewTab(false); setShowGlobalSearch(false); return; }
      if (e.key === "/" && !isInput) { e.preventDefault(); setShowSearch(true); return; }
      if (e.key === "d" && !isInput && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setTheme(theme === "dark" ? "light" : "dark"); return; }
      if (e.key === "b" && !isInput && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setActiveTabId("saved"); return; }
      if (e.key === "f" && !isInput && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setFocusMode((v) => !v); return; }
      if (e.key === "j" && !isInput && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setFocusedIndex((prev) => prev + 1); return; }
      if (e.key === "k" && !isInput && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setFocusedIndex((prev) => Math.max(-1, prev - 1)); return; }
      if (e.key === "o" && !isInput && !e.ctrlKey && !e.metaKey) { e.preventDefault(); const el = document.querySelector("[data-focused-item] a"); if (el) (el as HTMLAnchorElement).click(); return; }
      if (e.key === "m" && !isInput && !e.ctrlKey && !e.metaKey) { e.preventDefault(); const el = document.querySelector("[data-focused-item]"); const id = el?.getAttribute("data-item-id"); if (id) markAsRead(id); return; }
      if (e.key === "r" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const el = document.querySelector("[data-focused-item]");
        const id = el?.getAttribute("data-item-id");
        if (id) { const item = tabs.filter((t) => t.id !== "all").flatMap((t) => t.items).find((i) => i.id === id); if (item) setReaderItem(item); }
        return;
      }
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key >= "1" && e.key <= "9") { e.preventDefault(); const idx = parseInt(e.key) - 1; if (idx < tabs.length) setActiveTabId(tabs[idx].id); }
      if (e.key === "t" && !showNewTab) { e.preventDefault(); setShowNewTab(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tabs, showNewTab, theme, setTheme, markAsRead]);

  // ── Callbacks ─────────────────────────────────────────────────────────

  const toggleBookmark = useCallback((item: FeedItem) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) { next.delete(item.id); toast("Removed from saved", "info"); }
      else {
        next.add(item.id); toast("Saved for later", "success");
        try { const saved = JSON.parse(localStorage.getItem("feedbot-bookmark-items") || "{}"); saved[item.id] = item; localStorage.setItem("feedbot-bookmark-items", JSON.stringify(saved)); } catch {}
      }
      localStorage.setItem("feedbot-bookmarks", JSON.stringify([...next]));
      return next;
    });
  }, [toast]);

  const importOPML = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/feeds/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) toast(data.error || "Import failed", "error");
      else { toast(`Imported ${data.imported} feeds (${data.skipped} skipped)`, "success"); window.location.reload(); }
    } catch { toast("Failed to import OPML", "error"); }
    setImporting(false);
  }, [toast]);

  const createFeed = useCallback(async (name: string, prompt: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, query_text: prompt, description: prompt }),
      });
      if (res.status === 403) {
        toast("You\u2019ve reached the free plan limit (3 feeds). Upgrade to Pro for unlimited feeds!", "error");
        return null;
      }
      if (!res.ok) return null;
      const { feed, initial_items_count } = await res.json();
      let items: FeedItem[] = [];
      if (initial_items_count > 0) {
        try { const r = await fetch(`/api/feeds/${feed.id}`); if (r.ok) { const d = await r.json(); items = (d.items || []).map(mapDbItemToFeedItem); } } catch {}
      }
      const tab: Tab = { id: feed.id, name: feed.name, prompt: feed.query_text, items, loading: false, lastRefresh: feed.last_refreshed_at };
      setTabs((prev) => [...prev, tab]);
      return feed.id;
    } catch { return null; }
  }, []);

  const refreshTab = useCallback(async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || !tab.prompt || tabId === "all") return;
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, loading: true, error: null } : t)));
    try {
      await fetch(`/api/feeds/${tabId}/refresh`, { method: "POST" });
      const res = await fetch(`/api/feeds/${tabId}`);
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      const items = (data.items || []).map(mapDbItemToFeedItem);
      setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, items, loading: false, error: null, lastRefresh: new Date().toISOString() } : t));
    } catch {
      setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, loading: false, error: "Failed to refresh feed. Try again." } : t));
    }
  }, [tabs]);

  const refreshAllTabs = useCallback(() => {
    tabs.filter((t) => t.id !== "all" && t.prompt).forEach((t) => refreshTab(t.id));
  }, [tabs, refreshTab]);

  const shareFeed = useCallback(async () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab || activeTabId === "all") return;
    const params = new URLSearchParams({ name: tab.name, prompt: tab.prompt });
    await navigator.clipboard.writeText(`${window.location.origin}/dashboard?share=${encodeURIComponent(params.toString())}`);
    setShareCopied(true);
    toast("Share link copied to clipboard", "success");
    setTimeout(() => setShareCopied(false), 2000);
  }, [activeTabId, tabs, toast]);

  const exportFeed = useCallback((format: "rss" | "json") => {
    if (activeTabId === "all" || activeTabId === "saved") return;
    window.open(`/api/feeds/${activeTabId}/export?format=${format}`, "_blank");
    toast(`Exported as ${format.toUpperCase()}`, "success");
  }, [activeTabId, toast]);

  const updateFolders = useCallback((f: FeedFolder[]) => { setFolders(f); localStorage.setItem("feedbot-folders", JSON.stringify(f)); }, []);
  const updateAlerts = useCallback((a: KeywordAlert[]) => { setKeywordAlerts(a); localStorage.setItem("feedbot-alerts", JSON.stringify(a)); }, []);
  const updateMutedSources = useCallback((s: MutedSource[]) => { setMutedSources(s); localStorage.setItem("feedbot-muted-sources", JSON.stringify(s)); }, []);
  const updateCollections = useCallback((c: SavedCollection[]) => { setSavedCollections(c); localStorage.setItem("feedbot-collections", JSON.stringify(c)); }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => { const next = new Set(prev); for (const item of displayItems) next.add(item.id); localStorage.setItem("feedbot-read", JSON.stringify([...next])); return next; });
    toast("All items marked as read", "success");
  }, [toast]);

  const toggleSelect = useCallback((itemId: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(itemId)) next.delete(itemId); else next.add(itemId); return next; });
  }, []);

  const bulkMarkRead = useCallback(() => {
    setReadIds((prev) => { const next = new Set(prev); for (const id of selectedIds) next.add(id); localStorage.setItem("feedbot-read", JSON.stringify([...next])); return next; });
    toast(`${selectedIds.size} items marked as read`, "success");
    setSelectedIds(new Set()); setSelectMode(false);
  }, [selectedIds, toast]);

  const bulkBookmark = useCallback(() => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) next.add(id);
      try { const saved = JSON.parse(localStorage.getItem("feedbot-bookmark-items") || "{}"); for (const item of displayItems) { if (selectedIds.has(item.id)) saved[item.id] = item; } localStorage.setItem("feedbot-bookmark-items", JSON.stringify(saved)); } catch {}
      localStorage.setItem("feedbot-bookmarks", JSON.stringify([...next]));
      return next;
    });
    toast(`${selectedIds.size} items bookmarked`, "success");
    setSelectedIds(new Set()); setSelectMode(false);
  }, [selectedIds, toast]);

  const discoverFeedsFromUrl = useCallback(async () => {
    if (!discoverUrl.trim()) return;
    setDiscovering(true); setDiscoveredFeeds([]);
    try {
      const res = await fetch("/api/feeds/discover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: discoverUrl.trim() }) });
      const data = await res.json();
      if (!res.ok) toast(data.error || "Discovery failed", "error");
      else if (data.feeds.length === 0) toast("No RSS feeds found at this URL", "info");
      else { setDiscoveredFeeds(data.feeds); toast(`Found ${data.feeds.length} feed(s)`, "success"); }
    } catch { toast("Failed to discover feeds", "error"); }
    setDiscovering(false);
  }, [discoverUrl, toast]);

  const saveNote = useCallback((itemId: string, note: string) => {
    setItemNotes((prev) => { const next = { ...prev }; if (note.trim()) next[itemId] = note.trim(); else delete next[itemId]; localStorage.setItem("feedbot-notes", JSON.stringify(next)); return next; });
  }, []);

  const toggleNotifications = useCallback((enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem("feedbot-notifications", enabled ? "true" : "false");
  }, []);

  const clearReadingHistory = useCallback(() => { setReadIds(new Set()); localStorage.setItem("feedbot-read", "[]"); }, []);

  const addTab = async () => {
    if (!newTabName.trim() || !newTabPrompt.trim()) return;
    const name = newTabName.trim();
    const prompt = newTabPrompt.trim();
    const tempId = "creating-" + Date.now();
    setTabs((prev) => [...prev, { id: tempId, name, prompt, items: [], loading: true, lastRefresh: null }]);
    setActiveTabId(tempId); setShowNewTab(false); setNewTabName(""); setNewTabPrompt("");
    const feedId = await createFeed(name, prompt);
    if (feedId) { setTabs((prev) => prev.filter((t) => t.id !== tempId)); setActiveTabId(feedId); toast(`"${name}" feed created`, "success"); }
    else { setTabs((prev) => prev.filter((t) => t.id !== tempId)); }
  };

  const deleteTab = async (id: string) => {
    if (id === "all") return;
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) setActiveTabId("all");
    try { await fetch(`/api/feeds/${id}`, { method: "DELETE" }); } catch {}
  };

  async function handleLogout() { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = "/"; }
  async function handleUpgrade() {
    setCheckingOut(true);
    try { const res = await fetch("/api/stripe/checkout", { method: "POST" }); const data = await res.json(); if (data.url) window.location.href = data.url; else alert(data.error || "Failed to start checkout"); } catch { alert("Failed to start checkout"); }
    setCheckingOut(false);
  }

  // Auto-import shared feed from URL
  useEffect(() => {
    const shareParam = searchParams.get("share");
    if (!shareParam) return;
    try { const params = new URLSearchParams(shareParam); const name = params.get("name"); const prompt = params.get("prompt"); if (name && prompt) { window.history.replaceState({}, "", "/dashboard"); createFeed(name, prompt).then((feedId) => { if (feedId) setActiveTabId(feedId); }); } } catch {}
  }, [searchParams, createFeed]);

  // ── Derived State ─────────────────────────────────────────────────────

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const allItems = tabs.filter((t) => t.id !== "all").flatMap((t) => t.items).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const bookmarkedItems: FeedItem[] = (() => {
    const allCurrentItems = tabs.filter((t) => t.id !== "all").flatMap((t) => t.items);
    const items: FeedItem[] = []; const found = new Set<string>();
    for (const item of allCurrentItems) { if (bookmarkedIds.has(item.id) && !found.has(item.id)) { items.push(item); found.add(item.id); } }
    try { const saved = JSON.parse(localStorage.getItem("feedbot-bookmark-items") || "{}"); for (const id of bookmarkedIds) { if (!found.has(id) && saved[id]) items.push(saved[id]); } } catch {}
    return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  })();

  const dedupedAllItems = (() => {
    if (activeTabId !== "all") return allItems;
    const seen: string[] = [];
    return allItems.filter((item) => {
      const words = new Set(item.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 2));
      for (const prev of seen) { const prevWords = new Set(prev.split(/\s+/)); const overlap = [...words].filter((w) => prevWords.has(w)).length; if (overlap / Math.max(words.size, prevWords.size) > 0.7) return false; }
      seen.push([...words].join(" ")); return true;
    });
  })();

  const trendingItems = useMemo(() => computeTrending(allItems, readIds, bookmarkedIds), [allItems, readIds, bookmarkedIds]);
  const trendingMap = useMemo(() => { const map = new Map<string, string[]>(); for (const item of trendingItems) map.set(item.id, item.reasons); return map; }, [trendingItems]);
  const tabItemMap = useMemo(() => { const map = new Map<string, Set<string>>(); for (const tab of tabs) { if (tab.id === "all") continue; map.set(tab.id, new Set(tab.items.map((i) => i.id))); } return map; }, [tabs]);

  const folderFilteredItems = useMemo(() => {
    const base = activeTabId === "all" ? dedupedAllItems : activeTabId === "saved" ? bookmarkedItems : activeTabId === "trending" ? trendingItems : activeTab.items;
    if (!activeFolderId) return base;
    const folder = folders.find((f) => f.id === activeFolderId);
    if (!folder) return base;
    if (activeTabId === "all") { const ids = new Set(folder.feedIds); return allItems.filter((item) => !!tabs.find((t) => t.items.some((i) => i.id === item.id) && ids.has(t.id))); }
    return base;
  }, [activeTabId, dedupedAllItems, bookmarkedItems, trendingItems, activeTab.items, activeFolderId, folders, allItems, tabs]);

  const unmutedItems = useMemo(() => filterMutedSources(folderFilteredItems, mutedSources), [folderFilteredItems, mutedSources]);
  const sortedItems = useMemo(() => smartSort(unmutedItems, sortMode, { bookmarkedIds, readIds }), [unmutedItems, sortMode, bookmarkedIds, readIds]);
  const displayItems = useMemo(() => sortWithPinned(sortedItems, pinnedIds), [sortedItems, pinnedIds]);
  const keywordMatchedIds = useMemo(() => computeKeywordMatches(displayItems, keywordAlerts), [displayItems, keywordAlerts]);
  const chipFilteredItems = useMemo(() => applyFilter(displayItems, activeFilter, readIds), [displayItems, activeFilter, readIds]);
  const typeFilteredItems = useMemo(() => contentTypeFilter ? chipFilteredItems.filter((item) => getContentType(item.title, item.summary) === contentTypeFilter) : chipFilteredItems, [chipFilteredItems, contentTypeFilter]);
  const filteredItems = useMemo(() => searchQuery ? typeFilteredItems.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.summary.toLowerCase().includes(searchQuery.toLowerCase())) : typeFilteredItems, [typeFilteredItems, searchQuery]);
  const todayCount = useMemo(() => { const cutoff = Date.now() - 24 * 60 * 60 * 1000; return displayItems.filter((i) => new Date(i.publishedAt).getTime() > cutoff).length; }, [displayItems]);
  const unreadCount = useMemo(() => displayItems.filter((i) => !readIds.has(i.id)).length, [displayItems, readIds]);

  // ── Loading skeleton ──────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
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
        <div className="mb-6 flex gap-2 border-b border-border pb-2">
          <div className="h-9 w-16 animate-pulse rounded-lg bg-bg-hover" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-bg-hover" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-bg-hover" />
        </div>
        <SkeletonFeed count={5} />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${focusMode ? "max-w-2xl" : "max-w-4xl"}`}>
      {/* Focus Mode Bar */}
      {focusMode && (
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-text">{activeTab.name}</h1>
          <button onClick={() => setFocusMode(false)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text">
            <EyeOff className="h-3.5 w-3.5" />
            Exit Focus
          </button>
        </div>
      )}

      {/* Header + Widgets + Tabs (hidden in focus mode) */}
      {!focusMode && (
        <>
          <ErrorBoundary name="Header">
          <DashboardHeader
            user={user}
            checkingOut={checkingOut}
            allItems={allItems}
            notificationsEnabled={notificationsEnabled}
            onUpgrade={handleUpgrade}
            onToggleNotifications={toggleNotifications}
            onOpenReader={setReaderItem}
            onOpenGlobalSearch={() => setShowGlobalSearch(true)}
            onShowShortcuts={() => setShowShortcuts(true)}
            onLogout={handleLogout}
          />
          </ErrorBoundary>

          <ErrorBoundary name="Widgets">
          <DashboardWidgets
            tabs={tabs}
            activeTabId={activeTabId}
            allItems={allItems}
            readIds={readIds}
            bookmarkedIds={bookmarkedIds}
            initialLoading={initialLoading}
            showCheckoutSuccess={showCheckoutSuccess}
            showAnalytics={showAnalytics}
            folders={folders}
            activeFolderId={activeFolderId}
            keywordAlerts={keywordAlerts}
            keywordMatchedIds={keywordMatchedIds}
            onSetShowCheckoutSuccess={setShowCheckoutSuccess}
            onSetShowAnalytics={setShowAnalytics}
            onSetActiveFolderId={setActiveFolderId}
            onUpdateFolders={updateFolders}
            onUpdateAlerts={updateAlerts}
            onOpenReader={setReaderItem}
            onMarkAsRead={markAsRead}
          />
          </ErrorBoundary>

          {/* New Tab Form */}
          {showNewTab && (
            <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">Create New Tab</h3>
                <span className="text-xs text-text-muted">{tabs.filter((t) => t.id !== "all").length} / 3 feeds (free plan)</span>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Tab name (e.g., AI News, Startup Ideas)" value={newTabName} onChange={(e) => setNewTabName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && newTabName.trim() && newTabPrompt.trim() && addTab()} className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" autoFocus />
                <textarea placeholder="What should this feed show? (e.g., Latest AI research papers and breakthroughs)" value={newTabPrompt} onChange={(e) => setNewTabPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && newTabName.trim() && newTabPrompt.trim()) { e.preventDefault(); addTab(); } }} rows={2} className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" />
                <div className="flex gap-2">
                  <Button onClick={addTab} disabled={!newTabName.trim() || !newTabPrompt.trim()}><Plus className="h-4 w-4" />Create Tab</Button>
                  <Button variant="ghost" onClick={() => { setShowNewTab(false); setNewTabName(""); setNewTabPrompt(""); }}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Discover from URL */}
      {showDiscover && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-text">Discover Feeds from URL</h3>
          <div className="flex gap-2">
            <input type="url" placeholder="Paste any website URL (e.g., https://techcrunch.com)" value={discoverUrl} onChange={(e) => setDiscoverUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && discoverFeedsFromUrl()} className="flex-1 rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" autoFocus />
            <Button onClick={discoverFeedsFromUrl} disabled={discovering || !discoverUrl.trim()}>
              {discovering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {discovering ? "Scanning..." : "Discover"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowDiscover(false); setDiscoveredFeeds([]); setDiscoverUrl(""); }}>Cancel</Button>
          </div>
          {discoveredFeeds.length > 0 && (
            <div className="mt-3 space-y-2">
              {discoveredFeeds.map((feed) => (
                <div key={feed.url} className="flex items-center justify-between rounded-lg border border-border bg-bg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{feed.title}</p>
                    <p className="truncate text-xs text-text-muted">{feed.url}</p>
                  </div>
                  <Button size="sm" onClick={async () => { const feedId = await createFeed(feed.title, feed.title); if (feedId) { toast(`Added "${feed.title}"`, "success"); setActiveTabId(feedId); } }}>
                    <Plus className="h-3.5 w-3.5" />Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Bar */}
      <ErrorBoundary name="Tabs">
      <DashboardTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        allItems={allItems}
        bookmarkedIds={bookmarkedIds}
        dragTabId={dragTabId}
        importing={importing}
        onSetActiveTab={setActiveTabId}
        onDeleteTab={deleteTab}
        onShowNewTab={() => setShowNewTab(true)}
        onShowDiscover={() => setShowDiscover(true)}
        onImportOPML={importOPML}
        onDragStart={setDragTabId}
        onDragEnd={() => setDragTabId(null)}
        onDrop={(targetId) => {
          if (!dragTabId || dragTabId === targetId) return;
          setTabs((prev) => {
            const fromIdx = prev.findIndex((t) => t.id === dragTabId);
            const toIdx = prev.findIndex((t) => t.id === targetId);
            if (fromIdx < 0 || toIdx < 0 || fromIdx === 0 || toIdx === 0) return prev;
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
          });
          setDragTabId(null);
        }}
      />
      </ErrorBoundary>

      {/* Feed Header + Toolbar */}
      {!focusMode && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">{activeTab.name}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {activeTab.prompt || `${allItems.length} items from all feeds`}
              {activeTab.lastRefresh && <span className="ml-2 text-xs text-text-muted/60">· Updated {timeAgo(activeTab.lastRefresh)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTabId !== "all" && activeTabId !== "saved" && (
              <>
                <div className="relative group/export">
                  <Button variant="ghost" size="icon" className="text-text-muted" title="Export feed" aria-label="Export feed" aria-haspopup="true"><Download className="h-4 w-4" /></Button>
                  <div className="absolute right-0 top-full z-10 mt-1 hidden rounded-lg border border-border bg-bg-card p-1 shadow-lg group-hover/export:block" role="menu" aria-label="Export format options">
                    <button onClick={() => exportFeed("rss")} className="block w-full rounded-md px-3 py-1.5 text-left text-xs text-text-muted hover:bg-bg-hover hover:text-text" role="menuitem">RSS Feed</button>
                    <button onClick={() => exportFeed("json")} className="block w-full rounded-md px-3 py-1.5 text-left text-xs text-text-muted hover:bg-bg-hover hover:text-text" role="menuitem">JSON</button>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={shareFeed} className="text-text-muted" title="Share this feed" aria-label="Share this feed">
                  {shareCopied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSelectMode((v) => !v)} className={selectMode ? "text-primary" : "text-text-muted"} title="Multi-select mode" aria-label="Multi-select mode" aria-pressed={selectMode}><CheckSquare className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={markAllAsRead} className="text-text-muted" title="Mark all as read" aria-label="Mark all as read" disabled={displayItems.length === 0}><CheckCheck className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setCompactView((v) => !v)} className="text-text-muted" title={compactView ? "Comfortable view" : "Compact view"} aria-label={compactView ? "Switch to comfortable view" : "Switch to compact view"} aria-pressed={compactView}>{compactView ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}</Button>
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)} className="text-text-muted" aria-label={showSearch ? "Close search" : "Search feed items"} aria-expanded={showSearch}><Search className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => activeTabId === "all" ? refreshAllTabs() : refreshTab(activeTabId)} className="text-text-muted" disabled={activeTabId === "all" ? tabs.some((t) => t.loading) : activeTab.loading} aria-label={activeTabId === "all" ? "Refresh all feeds" : `Refresh ${activeTab.name} feed`}>
              <RefreshCw className={`h-4 w-4 ${(activeTabId === "all" ? tabs.some((t) => t.loading) : activeTab.loading) ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className="mb-4">
          <input type="text" placeholder="Search feed items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none" autoFocus aria-label="Search feed items" />
        </div>
      )}

      {/* Multi-Select Toolbar */}
      {selectMode && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-sm text-text-muted">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={bulkMarkRead} disabled={selectedIds.size === 0}><CheckCheck className="h-3.5 w-3.5" />Mark Read</Button>
          <Button size="sm" variant="ghost" onClick={bulkBookmark} disabled={selectedIds.size === 0}><Bookmark className="h-3.5 w-3.5" />Bookmark</Button>
          <Button size="sm" variant="ghost" onClick={() => { const all = new Set(filteredItems.slice(0, visibleCount).map((i) => i.id)); setSelectedIds((prev) => (prev.size === all.size ? new Set() : all)); }}><CheckSquare className="h-3.5 w-3.5" />{selectedIds.size === filteredItems.slice(0, visibleCount).length ? "Deselect All" : "Select All"}</Button>
          <Button size="sm" variant="ghost" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}><X className="h-3.5 w-3.5" />Cancel</Button>
        </div>
      )}

      {/* Error Banner */}
      {activeTab.error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3" role="alert" aria-live="assertive">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          <p className="flex-1 text-sm text-red-300">{activeTab.error}</p>
          <Button variant="ghost" size="sm" onClick={() => activeTabId === "all" ? refreshAllTabs() : refreshTab(activeTabId)} className="shrink-0 text-red-300 hover:text-red-200" disabled={activeTab.loading} aria-label="Retry loading feed"><RefreshCw className={`mr-1 h-3 w-3 ${activeTab.loading ? "animate-spin" : ""}`} />Retry</Button>
        </div>
      )}

      {/* Trending Header */}
      {activeTabId === "trending" && trendingItems.length > 0 && <TrendingHeader count={trendingItems.length} />}

      {/* Filter Chips + Smart Sort + Mute */}
      {displayItems.length > 0 && !activeTab.loading && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterChips active={activeFilter} onChange={setActiveFilter} unreadCount={unreadCount} todayCount={todayCount} />
          <div className="flex items-center gap-1 ml-auto">
            <CatchMeUp unreadItems={displayItems.filter((i) => !readIds.has(i.id)).map((i) => ({ title: i.title, summary: i.summary, source: i.source }))} />
            <SmartSortButton active={sortMode} onChange={setSortMode} />
            <button onClick={() => setShowClusters((v) => !v)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${showClusters ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg-hover hover:text-text"}`} title="Group by topic">Topics</button>
            <SourceMuteManager mutedSources={mutedSources} onUpdateMuted={updateMutedSources} />
            <FeedTimeline items={displayItems} onSelectItem={(item) => setReaderItem(item as FeedItem)} readIds={readIds} />
            <FeedComparisonButton tabs={tabs.filter((t) => t.id !== "all")} readIds={readIds} />
            {activeTab.id !== "all" && <ShareFeed feedName={activeTab.name} feedPrompt={activeTab.prompt} items={activeTab.items} />}
            {activeTab.id !== "all" && <FeedHealthScore items={activeTab.items} lastRefresh={activeTab.lastRefresh || ""} name={activeTab.name} readIds={readIds} />}
          </div>
        </div>
      )}

      {/* Content Type Filter */}
      {displayItems.length > 3 && !activeTab.loading && (
        <div className="mb-3">
          <ContentTypeFilter active={contentTypeFilter as "news" | "tutorial" | "opinion" | "analysis" | null} onChange={setContentTypeFilter as (t: "news" | "tutorial" | "opinion" | "analysis" | null) => void} items={displayItems} />
        </div>
      )}

      {/* Sentiment Tracker */}
      {allItems.length > 3 && <SentimentTracker items={allItems} />}

      {/* Content Highlights */}
      {activeTabId === "all" && allItems.length > 8 && <ContentHighlights items={allItems.map((i) => ({ id: i.id, title: i.title, summary: i.summary, source: i.source }))} />}

      {/* Feed Suggestions */}
      {activeTabId === "all" && tabs.filter((t) => t.id !== "all").length > 0 && (
        <FeedSuggestions existingFeeds={tabs.filter((t) => t.id !== "all").map((t) => ({ id: t.id, name: t.name, prompt: t.prompt }))} onCreateFeed={async (name, prompt) => { const feedId = await createFeed(name, prompt); if (feedId) { setActiveTabId(feedId); toast(`"${name}" feed created`, "success"); } }} />
      )}

      {/* Saved Collections */}
      {activeTabId === "saved" && <SavedCollections collections={savedCollections} onUpdate={updateCollections} activeCollectionId={activeCollectionId} onSelectCollection={setActiveCollectionId} bookmarkCount={bookmarkedIds.size} />}

      {/* Read Later Queue */}
      <ReadLaterQueue onOpenReader={setReaderItem} />

      {/* Pinned Articles */}
      {pinnedIds.size > 0 && <PinnedArticles pinnedIds={pinnedIds} allItems={allItems} onUnpin={togglePin} onOpenReader={setReaderItem} />}

      {/* Reading History */}
      {activeTabId === "all" && allItems.length > 0 && readIds.size > 0 && <ReadingHistory readIds={readIds} allItems={allItems} onOpenReader={setReaderItem} onClearHistory={clearReadingHistory} />}

      {/* Topic Clusters */}
      {showClusters && (
        <TopicClusterView items={filteredItems} enabled={showClusters} renderItem={(item) => (
          <FeedCard title={item.title} summary={item.summary} source={item.source} url={item.url} publishedAt={item.publishedAt} sourceIcon={item.sourceIcon} compact={compactView} />
        )} />
      )}

      {/* Feed Items */}
      <ErrorBoundary name="Feed">
      <FeedItemList
        activeTab={activeTab}
        activeTabId={activeTabId}
        filteredItems={filteredItems}
        visibleCount={visibleCount}
        focusedIndex={focusedIndex}
        compactView={compactView}
        selectMode={selectMode}
        selectedIds={selectedIds}
        bookmarkedIds={bookmarkedIds}
        readIds={readIds}
        itemNotes={itemNotes}
        trendingMap={trendingMap}
        pinnedIds={pinnedIds}
        reactions={reactions}
        feedTemplates={FEED_TEMPLATES}
        loadMoreRef={loadMoreRef}
        onMarkAsRead={markAsRead}
        onToggleBookmark={toggleBookmark}
        onToggleSelect={toggleSelect}
        onSaveNote={saveNote}
        onOpenReader={setReaderItem}
        onTogglePin={togglePin}
        onFindSimilar={setSimilarTarget}
        onToggleReaction={toggleReaction}
        onRefreshTab={refreshTab}
        onShowNewTab={() => setShowNewTab(true)}
        onCreateFeed={createFeed}
        onSetActiveTab={setActiveTabId}
        isInQueue={isInQueue}
        addToQueue={addToQueue}
        removeFromQueue={removeFromQueue}
        isPinned={isPinned}
        getTagsForItem={getTagsForItem}
      />
      </ErrorBoundary>

      {/* Modals */}
      <ErrorBoundary name="Modals">
      <DashboardModals
        tabs={tabs}
        activeTab={activeTab}
        allItems={allItems}
        readerItem={readerItem}
        readingModeItem={readingModeItem}
        similarTarget={similarTarget}
        showGlobalSearch={showGlobalSearch}
        showShortcuts={showShortcuts}
        compareItems={compareItems}
        bookmarkedIds={bookmarkedIds}
        readIds={readIds}
        tabItemMap={tabItemMap}
        onSetReaderItem={setReaderItem}
        onSetReadingModeItem={setReadingModeItem}
        onSetSimilarTarget={setSimilarTarget}
        onSetShowGlobalSearch={setShowGlobalSearch}
        onSetShowShortcuts={setShowShortcuts}
        onSetCompareItems={setCompareItems}
        onSetCompareMode={setCompareMode}
        onToggleBookmark={toggleBookmark}
        onMarkAsRead={markAsRead}
        onSetActiveTab={setActiveTabId}
        onShowNewTab={() => setShowNewTab(true)}
        onFocusMode={() => setFocusMode((v) => !v)}
        onImport={() => fileInputRef.current?.click()}
        onDiscover={() => setShowDiscover(true)}
        fileInputRef={fileInputRef}
      />
      </ErrorBoundary>
    </div>
  );
}
