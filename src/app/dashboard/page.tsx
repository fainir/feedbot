"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Rss, Search, X, RefreshCw, AlertCircle, Sparkles, ArrowRight, LogOut, Crown, CheckCircle2, Sun, Moon, Keyboard, Share2, Bookmark, Download, Settings, BarChart3, Upload, CheckCheck, LayoutList, LayoutGrid, CheckSquare, Square, Link2, GripVertical, Eye, EyeOff, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { FeedCard } from "@/components/feed/feed-card";
import { SkeletonFeed } from "@/components/feed/skeleton-card";
import { useToast } from "@/components/ui/toast";
import { CommandPalette } from "@/components/ui/command-palette";
import { ReadingStreak } from "@/components/feed/reading-streak";
import { ArticleReader } from "@/components/feed/article-reader";
import { computeTrending, TrendingHeader } from "@/components/feed/trending-tab";
import { DailyBrief } from "@/components/feed/daily-brief";
import { NewItemsBell } from "@/components/feed/new-items-bell";
import { FilterChips, applyFilter, type FilterChipType } from "@/components/feed/filter-chips";
import { FeedFolders, type FeedFolder } from "@/components/feed/feed-folders";
import { KeywordAlerts, type KeywordAlert, computeKeywordMatches, HighlightKeywords } from "@/components/feed/keyword-alerts";
import { CatchMeUp } from "@/components/feed/catch-me-up";
import { SmartSortButton, smartSort, type SortMode } from "@/components/feed/smart-sort";
import { TopicClusterView } from "@/components/feed/topic-clusters";
import { FeedSuggestions } from "@/components/feed/feed-suggestions";
import { ReadingHistory } from "@/components/feed/reading-history";
import { SavedCollections, type SavedCollection } from "@/components/feed/saved-collections";
import { SourceMuteManager, filterMutedSources, type MutedSource } from "@/components/feed/source-mute";
import { QuickShareMenu } from "@/components/feed/quick-share";
import { EmojiReactions, useReactions } from "@/components/feed/emoji-reactions";
import { PushNotificationToggle, sendKeywordNotification } from "@/components/feed/push-notifications";
import { ReadingProgressBar } from "@/components/feed/reading-progress";
import { FeedTimeline } from "@/components/feed/feed-timeline";
import { ContentHighlights } from "@/components/feed/content-highlights";
import { FeedComparisonButton } from "@/components/feed/feed-comparison";
import { ForYouRecommendations } from "@/components/feed/for-you-recommendations";
import { GlobalSearch } from "@/components/feed/global-search";
import { ReadingGoals } from "@/components/feed/reading-goals";
import { OnboardingTour } from "@/components/feed/onboarding-tour";
import { ActivityHeatmap } from "@/components/feed/activity-heatmap";
import { SentimentBadge } from "@/components/feed/sentiment-badge";
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
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showImport, setShowImport] = useState(false);
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
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Load bookmarks and read state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("feedbot-bookmarks");
      if (saved) setBookmarkedIds(new Set(JSON.parse(saved)));
    } catch {}
    try {
      const read = localStorage.getItem("feedbot-read");
      if (read) setReadIds(new Set(JSON.parse(read)));
    } catch {}
    try {
      const notes = localStorage.getItem("feedbot-notes");
      if (notes) setItemNotes(JSON.parse(notes));
    } catch {}
    try {
      const foldersData = localStorage.getItem("feedbot-folders");
      if (foldersData) setFolders(JSON.parse(foldersData));
    } catch {}
    try {
      const alertsData = localStorage.getItem("feedbot-alerts");
      if (alertsData) setKeywordAlerts(JSON.parse(alertsData));
    } catch {}
    try {
      const mutedData = localStorage.getItem("feedbot-muted-sources");
      if (mutedData) setMutedSources(JSON.parse(mutedData));
    } catch {}
    try {
      const collectionsData = localStorage.getItem("feedbot-collections");
      if (collectionsData) setSavedCollections(JSON.parse(collectionsData));
    } catch {}
    try {
      const notifEnabled = localStorage.getItem("feedbot-notifications");
      if (notifEnabled === "true") setNotificationsEnabled(true);
    } catch {}
  }, []);

  // Reset focused index on tab change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [activeTabId]);

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

  const markAsRead = useCallback((itemId: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      localStorage.setItem("feedbot-read", JSON.stringify([...next]));
      return next;
    });
  }, []);


  const importOPML = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/feeds/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Import failed", "error");
      } else {
        toast(`Imported ${data.imported} feeds (${data.skipped} skipped)`, "success");
        // Reload feeds
        window.location.reload();
      }
    } catch {
      toast("Failed to import OPML", "error");
    }
    setImporting(false);
    setShowImport(false);
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

      // Cmd+Shift+F for global search
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setShowGlobalSearch(true);
        return;
      }

      // Escape to close modals
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowSearch(false);
        setShowNewTab(false);
        setShowGlobalSearch(false);
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

      // f to toggle focus mode (only when not typing)
      if (e.key === "f" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFocusMode((v) => !v);
        return;
      }

      // j/k to navigate items, o to open, m to mark read
      if (e.key === "j" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFocusedIndex((prev) => prev + 1);
        return;
      }
      if (e.key === "k" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(-1, prev - 1));
        return;
      }
      if (e.key === "o" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Open focused item in new tab — will be handled by render
        const focusedEl = document.querySelector("[data-focused-item] a");
        if (focusedEl) (focusedEl as HTMLAnchorElement).click();
        return;
      }
      if (e.key === "m" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const focusedEl = document.querySelector("[data-focused-item]");
        const itemId = focusedEl?.getAttribute("data-item-id");
        if (itemId) markAsRead(itemId);
        return;
      }
      // r to open reader for focused item
      if (e.key === "r" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const focusedEl = document.querySelector("[data-focused-item]");
        const itemId = focusedEl?.getAttribute("data-item-id");
        if (itemId) {
          // Find item from all tabs
          const allTabItems = tabs.filter((t) => t.id !== "all").flatMap((t) => t.items);
          const item = allTabItems.find((i) => i.id === itemId);
          if (item) setReaderItem(item);
        }
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
  }, [tabs, showNewTab, theme, setTheme, markAsRead]);

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

  // Deduplicate items in "all" view — removes articles with very similar titles
  const dedupedAllItems = (() => {
    if (activeTabId !== "all") return allItems;
    const seen: string[] = [];
    return allItems.filter((item) => {
      const words = new Set(item.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 2));
      for (const prev of seen) {
        const prevWords = new Set(prev.split(/\s+/));
        const overlap = [...words].filter((w) => prevWords.has(w)).length;
        const similarity = overlap / Math.max(words.size, prevWords.size);
        if (similarity > 0.7) return false;
      }
      seen.push([...words].join(" "));
      return true;
    });
  })();

  // Compute trending items
  const trendingItems = useMemo(() => computeTrending(allItems, readIds, bookmarkedIds), [allItems, readIds, bookmarkedIds]);
  const trendingMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of trendingItems) {
      map.set(item.id, item.reasons);
    }
    return map;
  }, [trendingItems]);

  // Build tab-to-item-ids map for global search
  const tabItemMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const tab of tabs) {
      if (tab.id === "all") continue;
      map.set(tab.id, new Set(tab.items.map((i) => i.id)));
    }
    return map;
  }, [tabs]);

  // Apply folder filter if active
  const folderFilteredItems = useMemo(() => {
    const base = activeTabId === "all" ? dedupedAllItems : activeTabId === "saved" ? bookmarkedItems : activeTabId === "trending" ? trendingItems : activeTab.items;
    if (!activeFolderId) return base;
    const folder = folders.find((f) => f.id === activeFolderId);
    if (!folder) return base;
    // When folder is active and viewing "all", only show items from feeds in that folder
    if (activeTabId === "all") {
      const folderFeedIds = new Set(folder.feedIds);
      return allItems.filter((item) => {
        const feedTab = tabs.find((t) => t.items.some((i) => i.id === item.id) && folderFeedIds.has(t.id));
        return !!feedTab;
      });
    }
    return base;
  }, [activeTabId, dedupedAllItems, bookmarkedItems, trendingItems, activeTab.items, activeFolderId, folders, allItems, tabs]);

  // Apply source muting
  const unmutedItems = useMemo(
    () => filterMutedSources(folderFilteredItems, mutedSources),
    [folderFilteredItems, mutedSources]
  );

  // Apply smart sort
  const sortedItems = useMemo(
    () => smartSort(unmutedItems, sortMode, { bookmarkedIds, readIds }),
    [unmutedItems, sortMode, bookmarkedIds, readIds]
  );

  const displayItems = sortedItems;

  // Compute keyword alert matches
  const keywordMatchedIds = useMemo(
    () => computeKeywordMatches(displayItems, keywordAlerts),
    [displayItems, keywordAlerts]
  );

  const chipFilteredItems = applyFilter(displayItems, activeFilter, readIds);
  const filteredItems = searchQuery
    ? chipFilteredItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.summary.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chipFilteredItems;

  // Counts for filter chips
  const todayCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return displayItems.filter((i) => new Date(i.publishedAt).getTime() > cutoff).length;
  }, [displayItems]);
  const unreadCount = useMemo(() => displayItems.filter((i) => !readIds.has(i.id)).length, [displayItems, readIds]);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const item of displayItems) next.add(item.id);
      localStorage.setItem("feedbot-read", JSON.stringify([...next]));
      return next;
    });
    toast("All items marked as read", "success");
  }, [displayItems, toast]);

  const toggleSelect = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const bulkMarkRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) next.add(id);
      localStorage.setItem("feedbot-read", JSON.stringify([...next]));
      return next;
    });
    toast(`${selectedIds.size} items marked as read`, "success");
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds, toast]);

  const bulkBookmark = useCallback(() => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) next.add(id);
      // Also save item data
      try {
        const savedItems = JSON.parse(localStorage.getItem("feedbot-bookmark-items") || "{}");
        for (const item of displayItems) {
          if (selectedIds.has(item.id)) savedItems[item.id] = item;
        }
        localStorage.setItem("feedbot-bookmark-items", JSON.stringify(savedItems));
      } catch {}
      localStorage.setItem("feedbot-bookmarks", JSON.stringify([...next]));
      return next;
    });
    toast(`${selectedIds.size} items bookmarked`, "success");
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds, displayItems, toast]);

  const discoverFeedsFromUrl = useCallback(async () => {
    if (!discoverUrl.trim()) return;
    setDiscovering(true);
    setDiscoveredFeeds([]);
    try {
      const res = await fetch("/api/feeds/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: discoverUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Discovery failed", "error");
      } else if (data.feeds.length === 0) {
        toast("No RSS feeds found at this URL", "info");
      } else {
        setDiscoveredFeeds(data.feeds);
        toast(`Found ${data.feeds.length} feed(s)`, "success");
      }
    } catch {
      toast("Failed to discover feeds", "error");
    }
    setDiscovering(false);
  }, [discoverUrl, toast]);

  const saveNote = useCallback((itemId: string, note: string) => {
    setItemNotes((prev) => {
      const next = { ...prev };
      if (note.trim()) next[itemId] = note.trim();
      else delete next[itemId];
      localStorage.setItem("feedbot-notes", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateFolders = useCallback((newFolders: FeedFolder[]) => {
    setFolders(newFolders);
    localStorage.setItem("feedbot-folders", JSON.stringify(newFolders));
  }, []);

  const updateAlerts = useCallback((newAlerts: KeywordAlert[]) => {
    setKeywordAlerts(newAlerts);
    localStorage.setItem("feedbot-alerts", JSON.stringify(newAlerts));
  }, []);

  const updateMutedSources = useCallback((sources: MutedSource[]) => {
    setMutedSources(sources);
    localStorage.setItem("feedbot-muted-sources", JSON.stringify(sources));
  }, []);

  const updateCollections = useCallback((collections: SavedCollection[]) => {
    setSavedCollections(collections);
    localStorage.setItem("feedbot-collections", JSON.stringify(collections));
  }, []);

  const addToCollection = useCallback((collectionId: string, itemId: string) => {
    setSavedCollections((prev) => {
      const next = prev.map((c) =>
        c.id === collectionId && !c.itemIds.includes(itemId)
          ? { ...c, itemIds: [...c.itemIds, itemId] }
          : c
      );
      localStorage.setItem("feedbot-collections", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromCollection = useCallback((collectionId: string, itemId: string) => {
    setSavedCollections((prev) => {
      const next = prev.map((c) =>
        c.id === collectionId
          ? { ...c, itemIds: c.itemIds.filter((id) => id !== itemId) }
          : c
      );
      localStorage.setItem("feedbot-collections", JSON.stringify(next));
      return next;
    });
  }, []);

  const muteSource = useCallback((domain: string, hours: number) => {
    const clean = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
    if (!clean) return;
    setMutedSources((prev) => {
      const existing = prev.filter((s) => s.domain !== clean);
      const muteUntil = hours > 0 ? new Date(Date.now() + hours * 3600000).toISOString() : null;
      const next = [...existing, { domain: clean, muteUntil, mutedAt: new Date().toISOString() }];
      localStorage.setItem("feedbot-muted-sources", JSON.stringify(next));
      return next;
    });
  }, []);

  const unmuteSource = useCallback((domain: string) => {
    setMutedSources((prev) => {
      const next = prev.filter((s) => s.domain !== domain);
      localStorage.setItem("feedbot-muted-sources", JSON.stringify(next));
      return next;
    });
  }, []);

  const clearReadingHistory = useCallback(() => {
    setReadIds(new Set());
    localStorage.setItem("feedbot-read", "[]");
  }, []);

  const toggleNotifications = useCallback((enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem("feedbot-notifications", enabled ? "true" : "false");
  }, []);

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
    <div className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${focusMode ? "max-w-2xl" : "max-w-4xl"}`}>
      {/* Focus Mode Bar */}
      {focusMode && (
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-text">{activeTab.name}</h1>
          <button
            onClick={() => setFocusMode(false)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Exit Focus
          </button>
        </div>
      )}

      {/* User Header */}
      {!focusMode && (
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
          <NewItemsBell allItems={allItems} onOpenReader={(item) => setReaderItem(item)} />
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="hidden items-center gap-1 rounded-lg border border-border/50 px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text sm:flex"
            title="Search all feeds (Cmd+Shift+F)"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="text-[10px]">⌘⇧F</kbd>
          </button>
          <PushNotificationToggle
            enabled={notificationsEnabled}
            onToggle={toggleNotifications}
          />
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
      )}

      {!focusMode && (
      <>
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

      {/* Reading Progress + Streak */}
      {allItems.length > 0 && !initialLoading && (
        <>
          <ReadingProgressBar
            totalItems={allItems.length}
            readCount={allItems.filter((i) => readIds.has(i.id)).length}
            bookmarkCount={bookmarkedIds.size}
          />
          <ReadingStreak readCount={readIds.size} bookmarkCount={bookmarkedIds.size} />
          <ActivityHeatmap readDates={Array.from(readIds).map(() => new Date().toISOString())} />
        </>
      )}

      {/* Reading Goals */}
      {allItems.length > 0 && !initialLoading && (
        <ReadingGoals readIds={readIds} allItems={allItems} />
      )}

      {/* For You Recommendations */}
      {allItems.length > 0 && !initialLoading && activeTabId === "all" && (
        <ForYouRecommendations
          allItems={allItems}
          readIds={readIds}
          bookmarkedIds={bookmarkedIds}
          onOpenReader={(item) => setReaderItem(item)}
          onMarkRead={markAsRead}
        />
      )}

      {/* Feed Folders */}
      <FeedFolders
        folders={folders}
        feeds={tabs.filter((t) => t.id !== "all").map((t) => ({ id: t.id, name: t.name }))}
        activeFolderId={activeFolderId}
        onSelectFolder={setActiveFolderId}
        onUpdateFolders={updateFolders}
      />

      {/* Keyword Alerts */}
      <KeywordAlerts
        alerts={keywordAlerts}
        onUpdateAlerts={updateAlerts}
        matchedItemIds={keywordMatchedIds}
      />

      {/* Daily Brief */}
      {allItems.length > 0 && !initialLoading && activeTabId === "all" && (
        <DailyBrief allItems={allItems} onOpenReader={(item) => setReaderItem(item)} />
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
            draggable={tab.id !== "all"}
            onDragStart={() => setDragTabId(tab.id)}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => {
              if (!dragTabId || dragTabId === tab.id) return;
              setTabs((prev) => {
                const fromIdx = prev.findIndex((t) => t.id === dragTabId);
                const toIdx = prev.findIndex((t) => t.id === tab.id);
                if (fromIdx < 0 || toIdx < 0 || fromIdx === 0 || toIdx === 0) return prev;
                const next = [...prev];
                const [moved] = next.splice(fromIdx, 1);
                next.splice(toIdx, 0, moved);
                return next;
              });
              setDragTabId(null);
            }}
            onDragEnd={() => setDragTabId(null)}
            className={`group relative flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTabId === tab.id
                ? "bg-primary text-white"
                : "text-text-muted hover:bg-surface hover:text-text"
            } ${dragTabId === tab.id ? "opacity-50" : ""}`}
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
        {allItems.length > 5 && (
          <button
            onClick={() => setActiveTabId("trending")}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTabId === "trending"
                ? "bg-gradient-to-r from-primary to-orange-500 text-white"
                : "text-text-muted hover:bg-surface hover:text-text"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Trending
          </button>
        )}
        <button
          onClick={() => setShowNewTab(true)}
          className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
        >
          <Plus className="h-4 w-4" />
          New Tab
        </button>
        <button
          onClick={() => setShowDiscover(true)}
          className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
          title="Discover RSS feeds from any URL"
        >
          <Link2 className="h-4 w-4" />
          <span className="hidden sm:inline">Discover</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
          title="Import feeds from OPML file"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".opml,.xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importOPML(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Import Progress */}
      {importing && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm text-text-muted">Importing feeds from OPML...</p>
        </div>
      )}

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

      </>
      )}

      {/* Discover from URL */}
      {showDiscover && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-text">Discover Feeds from URL</h3>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste any website URL (e.g., https://techcrunch.com)"
              value={discoverUrl}
              onChange={(e) => setDiscoverUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && discoverFeedsFromUrl()}
              className="flex-1 rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              autoFocus
            />
            <Button onClick={discoverFeedsFromUrl} disabled={discovering || !discoverUrl.trim()}>
              {discovering ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {discovering ? "Scanning..." : "Discover"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowDiscover(false); setDiscoveredFeeds([]); setDiscoverUrl(""); }}>
              Cancel
            </Button>
          </div>
          {discoveredFeeds.length > 0 && (
            <div className="mt-3 space-y-2">
              {discoveredFeeds.map((feed) => (
                <div key={feed.url} className="flex items-center justify-between rounded-lg border border-border bg-bg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text">{feed.title}</p>
                    <p className="truncate text-xs text-text-muted">{feed.url}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const feedId = await createFeed(feed.title, feed.title);
                      if (feedId) {
                        toast(`Added "${feed.title}"`, "success");
                        setActiveTabId(feedId);
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      {!focusMode && (
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
            onClick={() => setSelectMode((v) => !v)}
            className={selectMode ? "text-primary" : "text-text-muted"}
            title="Multi-select mode"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={markAllAsRead}
            className="text-text-muted"
            title="Mark all as read"
            disabled={displayItems.length === 0}
          >
            <CheckCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCompactView((v) => !v)}
            className="text-text-muted"
            title={compactView ? "Comfortable view" : "Compact view"}
          >
            {compactView ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
          </Button>
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
      )}

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

      {/* Multi-Select Toolbar */}
      {selectMode && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-sm text-text-muted">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={bulkMarkRead} disabled={selectedIds.size === 0}>
            <CheckCheck className="h-3.5 w-3.5" />
            Mark Read
          </Button>
          <Button size="sm" variant="ghost" onClick={bulkBookmark} disabled={selectedIds.size === 0}>
            <Bookmark className="h-3.5 w-3.5" />
            Bookmark
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const all = new Set(filteredItems.slice(0, visibleCount).map((i) => i.id));
              setSelectedIds((prev) => (prev.size === all.size ? new Set() : all));
            }}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectedIds.size === filteredItems.slice(0, visibleCount).length ? "Deselect All" : "Select All"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
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

      {/* Trending Header */}
      {activeTabId === "trending" && trendingItems.length > 0 && (
        <TrendingHeader count={trendingItems.length} />
      )}

      {/* Filter Chips + Smart Sort + Catch Me Up + Mute */}
      {displayItems.length > 0 && !activeTab.loading && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterChips
            active={activeFilter}
            onChange={setActiveFilter}
            unreadCount={unreadCount}
            todayCount={todayCount}
          />
          <div className="flex items-center gap-1 ml-auto">
            <CatchMeUp
              unreadItems={displayItems
                .filter((i) => !readIds.has(i.id))
                .map((i) => ({ title: i.title, summary: i.summary, source: i.source }))}
            />
            <SmartSortButton active={sortMode} onChange={setSortMode} />
            <button
              onClick={() => setShowClusters((v) => !v)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                showClusters
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
              title="Group by topic"
            >
              Topics
            </button>
            <SourceMuteManager
              mutedSources={mutedSources}
              onUpdateMuted={updateMutedSources}
            />
            <FeedTimeline
              items={displayItems}
              onSelectItem={(item) => setReaderItem(item as FeedItem)}
              readIds={readIds}
            />
            <FeedComparisonButton
              tabs={tabs.filter((t) => t.id !== "all")}
              readIds={readIds}
            />
          </div>
        </div>
      )}

      {/* Content Highlights */}
      {activeTabId === "all" && allItems.length > 8 && (
        <ContentHighlights
          items={allItems.map((i) => ({ id: i.id, title: i.title, summary: i.summary, source: i.source }))}
        />
      )}

      {/* Feed Suggestions */}
      {activeTabId === "all" && tabs.filter((t) => t.id !== "all").length > 0 && (
        <FeedSuggestions
          existingFeeds={tabs.filter((t) => t.id !== "all").map((t) => ({ id: t.id, name: t.name, prompt: t.prompt }))}
          onCreateFeed={async (name, prompt) => {
            const feedId = await createFeed(name, prompt);
            if (feedId) {
              setActiveTabId(feedId);
              toast(`"${name}" feed created`, "success");
            }
          }}
        />
      )}

      {/* Saved Collections (in Saved tab) */}
      {activeTabId === "saved" && (
        <SavedCollections
          collections={savedCollections}
          onUpdate={updateCollections}
          activeCollectionId={activeCollectionId}
          onSelectCollection={setActiveCollectionId}
          bookmarkCount={bookmarkedIds.size}
        />
      )}

      {/* Reading History */}
      {activeTabId === "all" && allItems.length > 0 && readIds.size > 0 && (
        <ReadingHistory
          readIds={readIds}
          allItems={allItems}
          onOpenReader={(item) => setReaderItem(item)}
          onClearHistory={clearReadingHistory}
        />
      )}

      {/* Topic Clusters */}
      {showClusters && (
        <TopicClusterView
          items={filteredItems}
          enabled={showClusters}
          renderItem={(item) => (
            <FeedCard
              title={item.title}
              summary={item.summary}
              source={item.source}
              url={item.url}
              publishedAt={item.publishedAt}
              sourceIcon={item.sourceIcon}
              compact={compactView}
            />
          )}
        />
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
          {filteredItems.slice(0, visibleCount).map((item, idx) => {
            const isFocused = idx === focusedIndex;
            return (
              <div
                key={item.id}
                {...(isFocused ? { "data-focused-item": true, "data-item-id": item.id } : {})}
                ref={isFocused ? (el) => el?.scrollIntoView({ block: "nearest", behavior: "smooth" }) : undefined}
                onClick={() => markAsRead(item.id)}
                className={selectMode ? "flex items-start gap-2" : ""}
              >
                {selectMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                    className="mt-4 shrink-0 text-text-muted hover:text-primary sm:mt-5"
                  >
                    {selectedIds.has(item.id) ? (
                      <CheckSquare className="h-5 w-5 text-primary" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                )}
                <div className={selectMode ? "flex-1 min-w-0" : ""}>
                <FeedCard
                  title={item.title}
                  summary={item.summary}
                  source={item.source}
                  url={item.url}
                  publishedAt={item.publishedAt}
                  sourceIcon={item.sourceIcon}
                  bookmarked={bookmarkedIds.has(item.id)}
                  onToggleBookmark={() => toggleBookmark(item)}
                  isRead={readIds.has(item.id)}
                  isFocused={isFocused}
                  compact={compactView}
                  note={itemNotes[item.id]}
                  onSaveNote={(note) => saveNote(item.id, note)}
                  onOpenReader={() => setReaderItem(item)}
                  trendingReasons={trendingMap.get(item.id)}
                />
                {!compactView && (
                  <div className="mt-1 pl-1">
                    <EmojiReactions
                      itemId={item.id}
                      reactions={reactions}
                      onReact={toggleReaction}
                    />
                  </div>
                )}
                </div>
              </div>
            );
          })}
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

      {/* Global Search */}
      {showGlobalSearch && (
        <GlobalSearch
          allItems={allItems}
          tabs={tabs.filter((t) => t.id !== "all").map((t) => ({ id: t.id, name: t.name }))}
          tabItemMap={tabItemMap}
          onOpenReader={(item) => { setReaderItem(item); setShowGlobalSearch(false); }}
          onMarkRead={markAsRead}
          readIds={readIds}
          open={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        feeds={tabs.filter((t) => t.id !== "all").map((t) => ({ id: t.id, name: t.name }))}
        onSwitchTab={setActiveTabId}
        onNewTab={() => setShowNewTab(true)}
        onFocusMode={() => setFocusMode((v) => !v)}
        onImport={() => fileInputRef.current?.click()}
        onDiscover={() => setShowDiscover(true)}
      />

      {/* Article Reader Overlay */}
      {readerItem && (
        <ArticleReader
          url={readerItem.url}
          title={readerItem.title}
          summary={readerItem.summary}
          source={readerItem.source}
          sourceIcon={readerItem.sourceIcon}
          publishedAt={readerItem.publishedAt}
          bookmarked={bookmarkedIds.has(readerItem.id)}
          onToggleBookmark={() => toggleBookmark(readerItem)}
          onClose={() => setReaderItem(null)}
        />
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
                { keys: "J / K", desc: "Navigate items down / up" },
                { keys: "O", desc: "Open focused item" },
                { keys: "M", desc: "Mark focused item as read" },
                { keys: "R", desc: "Open focused item in reader" },
                { keys: "F", desc: "Toggle focus/zen mode" },
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

      {/* Onboarding Tour */}
      <OnboardingTour />
    </div>
  );
}
