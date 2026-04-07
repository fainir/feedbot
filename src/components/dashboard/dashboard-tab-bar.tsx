"use client";

import { useRef, useCallback } from "react";
import { Plus, X, RefreshCw, Bookmark, TrendingUp, Link2, Upload } from "lucide-react";
import type { Tab, FeedItem } from "@/lib/feed-types";

interface DashboardTabBarProps {
  tabs: Tab[];
  activeTabId: string;
  allItems: FeedItem[];
  bookmarkedIds: Set<string>;
  dragTabId: string | null;
  importing: boolean;
  onSetActiveTab: (id: string) => void;
  onDeleteTab: (id: string) => void;
  onShowNewTab: () => void;
  onShowDiscover: () => void;
  onImportOPML: (file: File) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string) => void;
}

export function DashboardTabBar({
  tabs,
  activeTabId,
  allItems,
  bookmarkedIds,
  dragTabId,
  importing,
  onSetActiveTab,
  onDeleteTab,
  onShowNewTab,
  onShowDiscover,
  onImportOPML,
  onDragStart,
  onDragEnd,
  onDrop,
}: DashboardTabBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  // Build all tab IDs for arrow key navigation
  const allTabIds = [
    ...tabs.map((t) => t.id),
    "saved",
    ...(allItems.length > 5 ? ["trending"] : []),
  ];

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, tabId: string) => {
    const currentIndex = allTabIds.indexOf(tabId);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % allTabIds.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + allTabIds.length) % allTabIds.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = allTabIds.length - 1;
    }

    if (nextIndex >= 0) {
      const nextId = allTabIds[nextIndex];
      onSetActiveTab(nextId);
      const nextButton = tabListRef.current?.querySelector<HTMLElement>(`[data-tab-id="${nextId}"]`);
      nextButton?.focus();
    }
  }, [allTabIds, onSetActiveTab]);

  return (
    <>
      <div ref={tabListRef} role="tablist" className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-border pb-2" aria-label="Feed tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex shrink-0 cursor-grab select-none items-center rounded-lg transition-colors active:cursor-grabbing ${
              activeTabId === tab.id
                ? "bg-primary text-white"
                : "text-text-muted hover:bg-surface hover:text-text"
            } ${dragTabId === tab.id ? "opacity-50" : ""}`}
          >
            <button
              role="tab"
              data-tab-id={tab.id}
              tabIndex={activeTabId === tab.id ? 0 : -1}
              aria-selected={activeTabId === tab.id}
              onClick={() => onSetActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
              draggable={tab.id !== "all"}
              onDragStart={() => onDragStart(tab.id)}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={() => onDrop(tab.id)}
              onDragEnd={onDragEnd}
              className="flex items-center gap-2 rounded-l-lg py-2 pl-4 pr-1 text-sm font-medium"
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
            </button>
            {tab.id !== "all" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTab(tab.id);
                }}
                draggable={false}
                className={`mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md opacity-60 transition-all hover:opacity-100 focus-visible:opacity-100 ${
                  activeTabId === tab.id
                    ? "text-white/80 hover:bg-white/20 hover:text-white"
                    : "text-text-muted hover:bg-bg-hover hover:text-text"
                }`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Delete {tab.name} tab</span>
              </button>
            )}
          </div>
        ))}
        <button
          role="tab"
          data-tab-id="saved"
          tabIndex={activeTabId === "saved" ? 0 : -1}
          aria-selected={activeTabId === "saved"}
          onClick={() => onSetActiveTab("saved")}
          onKeyDown={(e) => handleTabKeyDown(e, "saved")}
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
            role="tab"
            data-tab-id="trending"
            tabIndex={activeTabId === "trending" ? 0 : -1}
            aria-selected={activeTabId === "trending"}
            onClick={() => onSetActiveTab("trending")}
            onKeyDown={(e) => handleTabKeyDown(e, "trending")}
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
          onClick={onShowNewTab}
          className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
        >
          <Plus className="h-4 w-4" />
          New Tab
        </button>
        <button
          onClick={onShowDiscover}
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
            if (file) onImportOPML(file);
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
    </>
  );
}
