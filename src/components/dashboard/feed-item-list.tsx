"use client";

import { RefObject } from "react";
import { Rss, Plus, RefreshCw, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedCard } from "@/components/feed/feed-card";
import { SkeletonFeed } from "@/components/feed/skeleton-card";
import { EmojiReactions } from "@/components/feed/emoji-reactions";
import { ReadLaterButton } from "@/components/feed/read-later-queue";
import type { Tab, FeedItem, FEED_TEMPLATES as FeedTemplatesType } from "@/lib/feed-types";

interface FeedItemListProps {
  activeTab: Tab;
  activeTabId: string;
  filteredItems: FeedItem[];
  visibleCount: number;
  focusedIndex: number;
  compactView: boolean;
  selectMode: boolean;
  selectedIds: Set<string>;
  bookmarkedIds: Set<string>;
  readIds: Set<string>;
  itemNotes: Record<string, string>;
  trendingMap: Map<string, string[]>;
  pinnedIds: Set<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reactions: any;
  feedTemplates: typeof FeedTemplatesType;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  onMarkAsRead: (id: string) => void;
  onToggleBookmark: (item: FeedItem) => void;
  onToggleSelect: (id: string) => void;
  onSaveNote: (id: string, note: string) => void;
  onOpenReader: (item: FeedItem) => void;
  onTogglePin: (id: string) => void;
  onFindSimilar: (item: FeedItem) => void;
  onToggleReaction: (itemId: string, emoji: string) => void;
  onRefreshTab: (id: string) => void;
  onShowNewTab: () => void;
  onCreateFeed: (name: string, prompt: string) => Promise<string | null>;
  onSetActiveTab: (id: string) => void;
  isInQueue: (id: string) => boolean;
  addToQueue: (item: FeedItem, minutes?: number) => void;
  removeFromQueue: (id: string) => void;
  isPinned: (id: string) => boolean;
  getTagsForItem: (id: string) => string[];
}

export function FeedItemList({
  activeTab,
  activeTabId,
  filteredItems,
  visibleCount,
  focusedIndex,
  compactView,
  selectMode,
  selectedIds,
  bookmarkedIds,
  readIds,
  itemNotes,
  trendingMap,
  reactions,
  feedTemplates,
  loadMoreRef,
  onMarkAsRead,
  onToggleBookmark,
  onToggleSelect,
  onSaveNote,
  onOpenReader,
  onTogglePin,
  onFindSimilar,
  onToggleReaction,
  onRefreshTab,
  onShowNewTab,
  onCreateFeed,
  onSetActiveTab,
  isInQueue,
  addToQueue,
  removeFromQueue,
  isPinned,
  getTagsForItem,
}: FeedItemListProps) {
  if (activeTab.loading) {
    return <SkeletonFeed count={5} />;
  }

  if (filteredItems.length === 0) {
    return (
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
              {feedTemplates.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={async () => {
                    const feedId = await onCreateFeed(tpl.name, tpl.prompt);
                    if (feedId) {
                      onSetActiveTab(feedId);
                    }
                  }}
                  className="flex flex-col items-start rounded-xl border border-border bg-bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-bg-hover/50"
                >
                  <span className="mb-1 text-lg">{tpl.emoji}</span>
                  <span className="text-sm font-medium text-text">{tpl.name}</span>
                  <span className="mt-0.5 text-xs text-text-muted line-clamp-1">{tpl.prompt}</span>
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={onShowNewTab}>
              <Plus className="h-4 w-4" />
              Custom Feed
            </Button>
          </>
        )}
        {activeTabId !== "all" && (
          <Button onClick={() => onRefreshTab(activeTabId)}>
            <RefreshCw className="h-4 w-4" />
            Generate Feed
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredItems.slice(0, visibleCount).map((item, idx) => {
        const isFocused = idx === focusedIndex;
        return (
          <div
            key={item.id}
            {...(isFocused ? { "data-focused-item": true, "data-item-id": item.id } : {})}
            ref={isFocused ? (el) => el?.scrollIntoView({ block: "nearest", behavior: "smooth" }) : undefined}
            onClick={() => onMarkAsRead(item.id)}
            className={selectMode ? "flex items-start gap-2" : ""}
          >
            {selectMode && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
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
                onToggleBookmark={() => onToggleBookmark(item)}
                isRead={readIds.has(item.id)}
                isFocused={isFocused}
                compact={compactView}
                note={itemNotes[item.id]}
                onSaveNote={(note) => onSaveNote(item.id, note)}
                onOpenReader={() => onOpenReader(item)}
                trendingReasons={trendingMap.get(item.id)}
                pinned={isPinned(item.id)}
                onTogglePin={() => onTogglePin(item.id)}
                onFindSimilar={() => onFindSimilar(item)}
                readLaterSlot={
                  <ReadLaterButton
                    inQueue={isInQueue(item.id)}
                    onAdd={(minutes) => addToQueue(item, minutes)}
                    onRemove={() => removeFromQueue(item.id)}
                  />
                }
                tagBadges={getTagsForItem(item.id)}
              />
              {!compactView && (
                <div className="mt-1 pl-1">
                  <EmojiReactions
                    itemId={item.id}
                    reactions={reactions}
                    onReact={onToggleReaction}
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
  );
}
