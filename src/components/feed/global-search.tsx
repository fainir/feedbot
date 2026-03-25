"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, X, Calendar, Globe, Filter, ChevronDown } from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

interface GlobalSearchProps {
  allItems: FeedItem[];
  tabs: { id: string; name: string }[];
  tabItemMap: Map<string, Set<string>>; // tabId -> set of item ids
  onOpenReader: (item: FeedItem) => void;
  onMarkRead: (id: string) => void;
  readIds: Set<string>;
  open: boolean;
  onClose: () => void;
}

type DateRange = "any" | "today" | "week" | "month";

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-primary/20 px-0.5 text-primary">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function GlobalSearch({
  allItems,
  tabs,
  tabItemMap,
  onOpenReader,
  onMarkRead,
  readIds,
  open,
  onClose,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("any");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open with Cmd+Shift+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        // handled externally
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Get unique sources
  const sources = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of allItems) {
      let domain = item.source;
      try { domain = new URL(item.url).hostname.replace("www.", ""); } catch {}
      map.set(domain, (map.get(domain) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [allItems]);

  const results = useMemo(() => {
    if (!query.trim() && dateRange === "any" && !sourceFilter) return [];

    let items = allItems;

    // Date filter
    if (dateRange !== "any") {
      const now = Date.now();
      const cutoffs: Record<string, number> = {
        today: 24 * 3600000,
        week: 7 * 24 * 3600000,
        month: 30 * 24 * 3600000,
      };
      const cutoff = now - (cutoffs[dateRange] || 0);
      items = items.filter((i) => new Date(i.publishedAt).getTime() > cutoff);
    }

    // Source filter
    if (sourceFilter) {
      items = items.filter((i) => {
        let domain = i.source;
        try { domain = new URL(i.url).hostname.replace("www.", ""); } catch {}
        return domain === sourceFilter;
      });
    }

    // Text search
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q)
      );
    }

    return items.slice(0, 50);
  }, [allItems, query, dateRange, sourceFilter]);

  const getItemFeed = useCallback(
    (itemId: string): string | null => {
      for (const [tabId, ids] of tabItemMap) {
        if (ids.has(itemId)) {
          const tab = tabs.find((t) => t.id === tabId);
          return tab?.name || null;
        }
      }
      return null;
    },
    [tabItemMap, tabs]
  );

  const clearFilters = () => {
    setQuery("");
    setDateRange("any");
    setSourceFilter(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[10vh] backdrop-blur-sm"
      onClick={() => onClose()}
    >
      <div
        className="mx-4 flex max-h-[70vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search across all feeds..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
          />
          {(query || dateRange !== "any" || sourceFilter) && (
            <button onClick={clearFilters} className="text-text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              showFilters || dateRange !== "any" || sourceFilter
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-bg-hover hover:text-text"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </button>
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted">Esc</kbd>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-xs text-text-muted">Date:</span>
              {(["any", "today", "week", "month"] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    dateRange === range
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:bg-bg-hover hover:text-text"
                  }`}
                >
                  {range === "any" ? "All time" : range === "today" ? "Today" : range === "week" ? "This week" : "This month"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-xs text-text-muted">Source:</span>
              <div className="relative">
                <button
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-hover hover:text-text"
                  onClick={(e) => {
                    const menu = (e.currentTarget.nextSibling as HTMLElement);
                    menu.classList.toggle("hidden");
                  }}
                >
                  {sourceFilter || "All sources"}
                  <ChevronDown className="h-3 w-3" />
                </button>
                <div className="absolute left-0 top-full z-10 mt-1 hidden max-h-40 w-48 overflow-y-auto rounded-lg border border-border bg-bg-card p-1 shadow-lg">
                  <button
                    onClick={() => setSourceFilter(null)}
                    className={`block w-full rounded-md px-3 py-1.5 text-left text-xs ${
                      !sourceFilter ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg-hover"
                    }`}
                  >
                    All sources
                  </button>
                  {sources.slice(0, 15).map(([domain, count]) => (
                    <button
                      key={domain}
                      onClick={() => setSourceFilter(domain)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs ${
                        sourceFilter === domain ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg-hover"
                      }`}
                    >
                      <span className="truncate">{domain}</span>
                      <span className="shrink-0 text-text-muted/50">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {results.length === 0 && (query || dateRange !== "any" || sourceFilter) ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="mb-2 h-8 w-8 text-text-muted/30" />
              <p className="text-sm text-text-muted">No results found</p>
              <p className="text-xs text-text-muted/60">Try different keywords or filters</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="mb-2 h-8 w-8 text-text-muted/30" />
              <p className="text-sm text-text-muted">Search across all your feeds</p>
              <p className="text-xs text-text-muted/60">Type a keyword or use filters</p>
            </div>
          ) : (
            <div className="p-2">
              <p className="mb-2 px-2 text-xs text-text-muted">
                {results.length}{results.length === 50 ? "+" : ""} results
              </p>
              {results.map((item) => {
                const feedName = getItemFeed(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onOpenReader(item);
                      onMarkRead(item.id);
                    }}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-bg-hover ${
                      readIds.has(item.id) ? "opacity-60" : ""
                    }`}
                  >
                    {item.sourceIcon && (
                      <img
                        src={item.sourceIcon}
                        alt=""
                        className="mt-0.5 h-4 w-4 shrink-0 rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text line-clamp-1">
                        {highlightMatch(item.title, query)}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted line-clamp-1">
                        {highlightMatch(item.summary, query)}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted/60">
                        {feedName && <span className="rounded bg-bg-hover px-1.5 py-0.5">{feedName}</span>}
                        <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 text-center text-[10px] text-text-muted/50">
          <kbd className="rounded border border-border/50 px-1 py-0.5">Cmd+Shift+F</kbd> to open &middot;{" "}
          <kbd className="rounded border border-border/50 px-1 py-0.5">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}

export function GlobalSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-bg-card/50 px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-border hover:bg-bg-hover hover:text-text"
      title="Global search (Cmd+Shift+F)"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search all feeds</span>
      <kbd className="hidden rounded border border-border/50 px-1 py-0.5 text-[10px] sm:inline">
        ⌘⇧F
      </kbd>
    </button>
  );
}
