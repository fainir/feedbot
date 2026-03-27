"use client";

import { useRef } from "react";
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

  return (
    <>
      <nav className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-border pb-2" aria-label="Feed tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSetActiveTab(tab.id)}
            draggable={tab.id !== "all"}
            onDragStart={() => onDragStart(tab.id)}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => onDrop(tab.id)}
            onDragEnd={onDragEnd}
            aria-current={activeTabId === tab.id ? "page" : undefined}
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
                  onDeleteTab(tab.id);
                }}
                className={`ml-1 rounded p-0.5 hover:bg-white/20 ${
                  activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                } transition-opacity`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Delete {tab.name} tab</span>
              </button>
            )}
          </button>
        ))}
        <button
          onClick={() => onSetActiveTab("saved")}
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
            onClick={() => onSetActiveTab("trending")}
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
      </nav>

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
