"use client";

import { Suspense, lazy } from "react";
import { ArticleReader } from "@/components/feed/article-reader";
import { SimilarArticles } from "@/components/feed/similar-articles";
import { GlobalSearch } from "@/components/feed/global-search";
import { CommandPalette } from "@/components/ui/command-palette";
import { KeyboardShortcutsModal } from "@/components/ui/keyboard-shortcuts-modal";
import { ArticleComparison } from "@/components/feed/article-comparison";
import { FeedbackWidget } from "@/components/feed/feedback-widget";
import { OnboardingTour } from "@/components/feed/onboarding-tour";
import { KeyboardPowerMode } from "@/components/feed/keyboard-power-mode";
import { FloatingActionMenu } from "@/components/feed/quick-actions-bar";
import { BookmarkTagPicker, useBookmarkTags } from "@/components/feed/bookmark-tags";
import type { Tab, FeedItem } from "@/lib/feed-types";

const ReadingMode = lazy(() =>
  import("@/components/feed/reading-mode").then((m) => ({ default: m.ReadingMode }))
);

interface DashboardModalsProps {
  tabs: Tab[];
  activeTab: Tab;
  allItems: FeedItem[];
  readerItem: FeedItem | null;
  readingModeItem: FeedItem | null;
  similarTarget: FeedItem | null;
  showGlobalSearch: boolean;
  showShortcuts: boolean;
  compareItems: FeedItem[];
  bookmarkedIds: Set<string>;
  readIds: Set<string>;
  tabItemMap: Map<string, Set<string>>;
  onSetReaderItem: (item: FeedItem | null) => void;
  onSetReadingModeItem: (item: FeedItem | null) => void;
  onSetSimilarTarget: (item: FeedItem | null) => void;
  onSetShowGlobalSearch: (v: boolean) => void;
  onSetShowShortcuts: (v: boolean) => void;
  onSetCompareItems: (items: FeedItem[]) => void;
  onSetCompareMode: (v: boolean) => void;
  onToggleBookmark: (item: FeedItem) => void;
  onMarkAsRead: (id: string) => void;
  onSetActiveTab: (id: string) => void;
  onShowNewTab: () => void;
  onFocusMode: () => void;
  onImport: () => void;
  onDiscover: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function DashboardModals({
  tabs,
  activeTab,
  allItems,
  readerItem,
  readingModeItem,
  similarTarget,
  showGlobalSearch,
  showShortcuts,
  compareItems,
  bookmarkedIds,
  readIds,
  tabItemMap,
  onSetReaderItem,
  onSetReadingModeItem,
  onSetSimilarTarget,
  onSetShowGlobalSearch,
  onSetShowShortcuts,
  onSetCompareItems,
  onSetCompareMode,
  onToggleBookmark,
  onMarkAsRead,
  onSetActiveTab,
  onShowNewTab,
  onFocusMode,
  onImport,
  onDiscover,
}: DashboardModalsProps) {
  const { getTagsForItem, addTag, removeTag, allTags } = useBookmarkTags();

  return (
    <>
      {/* Similar Articles Modal */}
      {similarTarget && (
        <SimilarArticles
          targetItem={similarTarget}
          allItems={allItems}
          onOpenReader={(item) => { onSetReaderItem(item); onSetSimilarTarget(null); }}
          onClose={() => onSetSimilarTarget(null)}
        />
      )}

      {/* Global Search */}
      {showGlobalSearch && (
        <GlobalSearch
          allItems={allItems}
          tabs={tabs.filter((t) => t.id !== "all").map((t) => ({ id: t.id, name: t.name }))}
          tabItemMap={tabItemMap}
          onOpenReader={(item) => { onSetReaderItem(item); onSetShowGlobalSearch(false); }}
          onMarkRead={onMarkAsRead}
          readIds={readIds}
          open={showGlobalSearch}
          onClose={() => onSetShowGlobalSearch(false)}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        feeds={tabs.filter((t) => t.id !== "all").map((t) => ({ id: t.id, name: t.name }))}
        onSwitchTab={onSetActiveTab}
        onNewTab={onShowNewTab}
        onFocusMode={onFocusMode}
        onImport={onImport}
        onDiscover={onDiscover}
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
          onToggleBookmark={() => onToggleBookmark(readerItem)}
          onClose={() => onSetReaderItem(null)}
          onOpenReadingMode={() => onSetReadingModeItem(readerItem)}
          tagSlot={
            <BookmarkTagPicker
              itemId={readerItem.id}
              tags={getTagsForItem(readerItem.id)}
              allTags={allTags}
              onAddTag={addTag}
              onRemoveTag={removeTag}
            />
          }
        />
      )}

      {/* Reading Mode */}
      {readingModeItem && (
        <Suspense>
          <ReadingMode
            title={readingModeItem.title}
            summary={readingModeItem.summary}
            content={readingModeItem.summary}
            source={readingModeItem.source}
            url={readingModeItem.url}
            onClose={() => onSetReadingModeItem(null)}
          />
        </Suspense>
      )}

      {/* Article Comparison */}
      {compareItems.length === 2 && (
        <ArticleComparison
          articles={compareItems as [FeedItem, FeedItem]}
          onClose={() => { onSetCompareItems([]); onSetCompareMode(false); }}
        />
      )}

      {/* Feedback Widget */}
      <FeedbackWidget />

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => onSetShowShortcuts(false)} />
      )}

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Keyboard Power Mode */}
      <KeyboardPowerMode
        totalItems={allItems.length}
        feedName={activeTab.name}
      />

      {/* Floating Action Menu (mobile) */}
      <FloatingActionMenu />
    </>
  );
}
