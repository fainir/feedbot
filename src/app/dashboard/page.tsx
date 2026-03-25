"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Rss, Search, X, RefreshCw, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedCard } from "@/components/feed/feed-card";
import { timeAgo } from "@/lib/utils";

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

const DEFAULT_TABS: Tab[] = [
  {
    id: "all",
    name: "All",
    prompt: "",
    items: [],
    loading: false,
    lastRefresh: null,
  },
];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function loadTabs(): Tab[] {
  if (typeof window === "undefined") return DEFAULT_TABS;
  try {
    const saved = localStorage.getItem("feedbot-tabs");
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_TABS;
}

function saveTabs(tabs: Tab[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("feedbot-tabs", JSON.stringify(tabs));
}

export default function DashboardPage() {
  const [tabs, setTabs] = useState<Tab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState("all");
  const [showNewTab, setShowNewTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [newTabPrompt, setNewTabPrompt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Load tabs from localStorage on mount
  useEffect(() => {
    setTabs(loadTabs());
  }, []);

  // Save tabs when they change
  useEffect(() => {
    if (tabs !== DEFAULT_TABS) saveTabs(tabs);
  }, [tabs]);

  // Keyboard shortcuts: Ctrl+1-9 to switch tabs, Ctrl+T for new tab
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
  }, [tabs, showNewTab]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Get all items across all tabs for the "All" view
  const allItems = tabs
    .filter((t) => t.id !== "all")
    .flatMap((t) => t.items)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const displayItems = activeTabId === "all" ? allItems : activeTab.items;
  const filteredItems = searchQuery
    ? displayItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.summary.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayItems;

  const addTab = () => {
    if (!newTabName.trim() || !newTabPrompt.trim()) return;
    const tab: Tab = {
      id: generateId(),
      name: newTabName.trim(),
      prompt: newTabPrompt.trim(),
      items: [],
      loading: true,
      lastRefresh: null,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setShowNewTab(false);
    setNewTabName("");
    setNewTabPrompt("");
    // Auto-generate feed for the new tab
    fetchFeedItems(tab.id, tab.prompt);
  };

  const deleteTab = (id: string) => {
    if (id === "all") return;
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeTabId === id) setActiveTabId("all");
  };

  const fetchFeedItems = useCallback(
    async (tabId: string, prompt: string) => {
      try {
        const res = await fetch("/api/feed/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        if (!res.ok) throw new Error("Failed to fetch feed");
        const data = await res.json();
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  items: data.items || [],
                  loading: false,
                  error: null,
                  lastRefresh: new Date().toISOString(),
                }
              : t
          )
        );
      } catch (e) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? { ...t, loading: false, error: "Failed to generate feed. Try again." }
              : t
          )
        );
      }
    },
    []
  );

  const refreshTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || !tab.prompt) return;
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, loading: true } : t))
      );
      fetchFeedItems(tabId, tab.prompt);
    },
    [tabs, fetchFeedItems]
  );

  const refreshAllTabs = useCallback(() => {
    const feedTabs = tabs.filter((t) => t.id !== "all" && t.prompt);
    if (feedTabs.length === 0) return;
    setTabs((prev) =>
      prev.map((t) => (t.id !== "all" && t.prompt ? { ...t, loading: true } : t))
    );
    feedTabs.forEach((t) => fetchFeedItems(t.id, t.prompt));
  }, [tabs, fetchFeedItems]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
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
        <div className="flex flex-col items-center justify-center py-24">
          <RefreshCw className="mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-text-muted">
            Generating your feed...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Rss className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-text">
            {activeTabId === "all"
              ? "Create your first tab"
              : "No items yet"}
          </h2>
          <p className="mb-6 max-w-sm text-center text-sm text-text-muted">
            {activeTabId === "all"
              ? "Click '+ New Tab' to create a custom feed with any topic."
              : "Click the refresh button to generate content for this tab."}
          </p>
          {activeTabId === "all" && (
            <Button onClick={() => setShowNewTab(true)}>
              <Plus className="h-4 w-4" />
              New Tab
            </Button>
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
          {filteredItems.map((item) => (
            <FeedCard
              key={item.id}
              title={item.title}
              summary={item.summary}
              source={item.source}
              url={item.url}
              publishedAt={item.publishedAt}
              sourceIcon={item.sourceIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
}
