"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Rss, Search, X, RefreshCw, AlertCircle, Sparkles, ArrowRight, LogOut, Crown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedCard } from "@/components/feed/feed-card";
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
  const searchParams = useSearchParams();

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

        setTabs([
          { id: "all", name: "All", prompt: "", items: [], loading: false, lastRefresh: null },
          ...feedTabs,
        ]);
      } catch (err) {
        console.error("Failed to load feeds:", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadFeeds();
  }, []);

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
      // Replace temp tab with real one
      setTabs((prev) => prev.filter((t) => t.id !== tempId));
      setActiveTabId(feedId);
    } else {
      // Remove temp tab on failure
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tempId
            ? { ...t, loading: false, error: "Failed to create feed. Try again." }
            : t
        )
      );
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
        <div className="flex flex-col items-center justify-center py-24">
          <RefreshCw className="mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-text-muted">Loading your feeds...</p>
        </div>
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
        <div className="flex items-center gap-2 sm:gap-3">
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Rss className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-text">
            {activeTabId === "all"
              ? "Create your first feed"
              : "No items yet"}
          </h2>
          <p className="mb-6 max-w-sm text-center text-sm text-text-muted">
            {activeTabId === "all"
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
