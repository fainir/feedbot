"use client";

import { useState, useMemo } from "react";
import { Clock, Search, Calendar, BookOpen, ExternalLink, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { FeedItem } from "@/lib/feed-types";

interface ReadingHistoryProps {
  readIds: Set<string>;
  allItems: FeedItem[];
  onOpenReader: (item: FeedItem) => void;
  onClearHistory: () => void;
}

interface HistoryGroup {
  label: string;
  date: string;
  items: FeedItem[];
}

export function ReadingHistory({ readIds, allItems, onOpenReader, onClearHistory }: ReadingHistoryProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const readItems = useMemo(() => {
    return allItems
      .filter((item) => readIds.has(item.id))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [allItems, readIds]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return readItems;
    const q = searchQuery.toLowerCase();
    return readItems.filter(
      (item) => item.title.toLowerCase().includes(q) || item.source.toLowerCase().includes(q)
    );
  }, [readItems, searchQuery]);

  const groupedItems = useMemo((): HistoryGroup[] => {
    const groups = new Map<string, FeedItem[]>();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const item of filteredItems) {
      const date = new Date(item.publishedAt);
      let label: string;
      const dateStr = date.toISOString().split("T")[0];

      if (dateStr === today.toISOString().split("T")[0]) {
        label = "Today";
      } else if (dateStr === yesterday.toISOString().split("T")[0]) {
        label = "Yesterday";
      } else {
        label = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      }

      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(item);
    }

    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      date: items[0].publishedAt,
      items,
    }));
  }, [filteredItems]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  if (!showHistory) {
    return (
      <button
        onClick={() => setShowHistory(true)}
        className="mb-4 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted transition-colors hover:border-primary/40 hover:text-text"
      >
        <Clock className="h-3.5 w-3.5" />
        Reading History ({readIds.size} articles)
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Reading History</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {readIds.size} articles
          </span>
        </div>
        <div className="flex items-center gap-1">
          {readIds.size > 0 && (
            <button
              onClick={onClearHistory}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:text-red-400"
              title="Clear history"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowHistory(false)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:text-text"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-bg px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-text placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="max-h-80 overflow-y-auto">
        {groupedItems.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <BookOpen className="mb-2 h-6 w-6 text-text-muted" />
            <p className="text-xs text-text-muted">
              {searchQuery ? "No matches found" : "No reading history yet"}
            </p>
          </div>
        ) : (
          groupedItems.map((group) => {
            const isExpanded = !expandedGroups.has(group.label);
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center gap-2 bg-bg-hover/50 px-4 py-2 text-left"
                >
                  <Calendar className="h-3 w-3 text-text-muted" />
                  <span className="flex-1 text-xs font-medium text-text">{group.label}</span>
                  <span className="text-[10px] text-text-muted">{group.items.length}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-text-muted" />
                  ) : (
                    <ChevronUp className="h-3 w-3 text-text-muted" />
                  )}
                </button>
                {isExpanded && (
                  <div className="divide-y divide-border/50">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-bg-hover/30"
                      >
                        {item.sourceIcon ? (
                          <img src={item.sourceIcon} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
                        ) : (
                          <div className="h-4 w-4 shrink-0 rounded-sm bg-bg-hover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-text">{item.title}</p>
                          <p className="text-[10px] text-text-muted">{item.source}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => onOpenReader(item)}
                            className="rounded p-1 text-text-muted hover:text-primary"
                            title="Read again"
                          >
                            <BookOpen className="h-3 w-3" />
                          </button>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded p-1 text-text-muted hover:text-primary"
                            title="Open original"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
