"use client";

import { Suspense, lazy } from "react";
import { CheckCircle2, X, BarChart3, Sparkles, ArrowRight } from "lucide-react";
import { ReadingProgressBar } from "@/components/feed/reading-progress";
import { ReadingStreak } from "@/components/feed/reading-streak";
import { ActivityHeatmap } from "@/components/feed/activity-heatmap";
import { ReadingGoals } from "@/components/feed/reading-goals";
import { DigestScheduler } from "@/components/feed/digest-scheduler";
import { TeamFeedsPanel } from "@/components/feed/team-feeds";
import { FeedRulesPanel } from "@/components/feed/feed-rules";
import { StoryTracker } from "@/components/feed/story-tracker";
import { FocusTimer } from "@/components/feed/focus-timer";
import { FeedWidgets } from "@/components/feed/feed-widgets";
import { ReadingSpeedAnalyzer } from "@/components/feed/reading-speed";
import { SmartReminders } from "@/components/feed/smart-reminders";
import { SocialImport } from "@/components/feed/social-import";
import { ReadingChallenges } from "@/components/feed/reading-challenges";
import { ArticleFlashcards } from "@/components/feed/article-flashcards";
import { MoodPlaylists } from "@/components/feed/mood-playlists";
import { WordCloud } from "@/components/feed/word-cloud";
import { FeedChangelog } from "@/components/feed/feed-changelog";
import { ContentCalendar } from "@/components/feed/content-calendar";
import { SourceCredibility } from "@/components/feed/source-credibility";
import { MilestoneCheck } from "@/components/feed/reading-milestones";
import { ReadingJournal } from "@/components/feed/reading-journal";
import { ArticleClustering } from "@/components/feed/article-clustering";
import { ArticleMindMap } from "@/components/feed/article-mind-map";
import { PrivacyDashboard } from "@/components/feed/privacy-dashboard";
import { ForYouRecommendations } from "@/components/feed/for-you-recommendations";
import { FeedFolders, type FeedFolder } from "@/components/feed/feed-folders";
import { KeywordAlerts, type KeywordAlert } from "@/components/feed/keyword-alerts";
import { DailyBrief } from "@/components/feed/daily-brief";
import { FeedBackup } from "@/components/feed/feed-backup";
import type { Tab, FeedItem } from "@/lib/feed-types";

const SourceAnalytics = lazy(() =>
  import("@/components/feed/source-analytics").then((m) => ({ default: m.SourceAnalytics }))
);

interface DashboardWidgetsProps {
  tabs: Tab[];
  activeTabId: string;
  allItems: FeedItem[];
  readIds: Set<string>;
  bookmarkedIds: Set<string>;
  initialLoading: boolean;
  showCheckoutSuccess: boolean;
  showAnalytics: boolean;
  folders: FeedFolder[];
  activeFolderId: string | null;
  keywordAlerts: KeywordAlert[];
  keywordMatchedIds: Map<string, string[]>;
  onSetShowCheckoutSuccess: (v: boolean) => void;
  onSetShowAnalytics: (v: boolean) => void;
  onSetActiveFolderId: (id: string | null) => void;
  onUpdateFolders: (folders: FeedFolder[]) => void;
  onUpdateAlerts: (alerts: KeywordAlert[]) => void;
  onOpenReader: (item: FeedItem) => void;
  onMarkAsRead: (id: string) => void;
}

export function DashboardWidgets({
  tabs,
  activeTabId,
  allItems,
  readIds,
  bookmarkedIds,
  initialLoading,
  showCheckoutSuccess,
  showAnalytics,
  folders,
  activeFolderId,
  keywordAlerts,
  keywordMatchedIds,
  onSetShowCheckoutSuccess,
  onSetShowAnalytics,
  onSetActiveFolderId,
  onUpdateFolders,
  onUpdateAlerts,
  onOpenReader,
  onMarkAsRead,
}: DashboardWidgetsProps) {
  return (
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
            onClick={() => onSetShowCheckoutSuccess(false)}
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
            onClick={() => onSetShowAnalytics(!showAnalytics)}
            className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-bg-hover hover:text-text"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {showAnalytics ? "Hide" : "Show"} Analytics
          </button>
          <FeedBackup onRestore={() => window.location.reload()} />
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

      {/* Digest Scheduler */}
      {allItems.length > 0 && !initialLoading && <DigestScheduler />}

      {/* Team Feeds */}
      {!initialLoading && <TeamFeedsPanel />}

      {/* Feed Automation Rules */}
      {allItems.length > 0 && !initialLoading && <FeedRulesPanel items={allItems} />}

      {/* Story Tracker */}
      {!initialLoading && <StoryTracker />}

      {/* Focus Timer */}
      {!initialLoading && <FocusTimer />}

      {/* Feed Widgets */}
      {!initialLoading && <FeedWidgets />}

      {/* Reading Speed Analyzer */}
      {!initialLoading && <ReadingSpeedAnalyzer />}

      {/* Smart Reminders */}
      {!initialLoading && (
        <SmartReminders
          unreadCount={allItems.length - readIds.size}
          todayReadCount={readIds.size}
        />
      )}

      {/* Social Import */}
      {!initialLoading && <SocialImport />}

      {/* Reading Challenges */}
      {!initialLoading && <ReadingChallenges readIds={readIds} />}

      {/* Article Flashcards */}
      {!initialLoading && <ArticleFlashcards />}

      {/* Mood Playlists */}
      {allItems.length > 0 && !initialLoading && <MoodPlaylists items={allItems} />}

      {/* Word Cloud */}
      {allItems.length > 5 && (
        <WordCloud items={allItems.map((i) => ({ title: i.title, summary: i.summary, publishedAt: i.publishedAt, source: i.source }))} />
      )}

      {/* Feed Changelog */}
      {!initialLoading && <FeedChangelog />}

      {/* Content Calendar */}
      {allItems.length > 0 && (
        <ContentCalendar
          items={allItems.map((i) => ({ id: i.id, title: i.title, source: i.source, publishedAt: i.publishedAt, url: i.url }))}
          onSelectItem={(item) => onOpenReader(item as FeedItem)}
          readIds={readIds}
          bookmarkedIds={bookmarkedIds}
        />
      )}

      {/* Source Credibility */}
      {allItems.length > 0 && (
        <SourceCredibility items={allItems.map((i) => ({ id: i.id, title: i.title, source: i.source, url: i.url }))} />
      )}

      {/* Milestone Celebrations */}
      <MilestoneCheck
        readIds={readIds}
        stats={{
          articlesRead: readIds.size,
          currentStreak: 0,
          uniqueSources: new Set(allItems.map((i) => i.source)).size,
          bookmarksCount: bookmarkedIds.size,
          readingHours: Math.round(readIds.size * 3 / 60),
        }}
      />

      {/* Reading Journal */}
      {!initialLoading && <ReadingJournal />}

      {/* Article Clustering */}
      {allItems.length > 3 && <ArticleClustering items={allItems} />}

      {/* Article Mind Map */}
      {allItems.length > 5 && (
        <ArticleMindMap items={allItems.map((i) => ({ id: i.id, title: i.title, summary: i.summary, source: i.source }))} />
      )}

      {/* Privacy Dashboard */}
      {!initialLoading && <PrivacyDashboard />}

      {/* For You Recommendations */}
      {allItems.length > 0 && !initialLoading && activeTabId === "all" && (
        <ForYouRecommendations
          allItems={allItems}
          readIds={readIds}
          bookmarkedIds={bookmarkedIds}
          onOpenReader={onOpenReader}
          onMarkRead={onMarkAsRead}
        />
      )}

      {/* Feed Folders */}
      <FeedFolders
        folders={folders}
        feeds={tabs.filter((t) => t.id !== "all").map((t) => ({ id: t.id, name: t.name }))}
        activeFolderId={activeFolderId}
        onSelectFolder={onSetActiveFolderId}
        onUpdateFolders={onUpdateFolders}
      />

      {/* Keyword Alerts */}
      <KeywordAlerts
        alerts={keywordAlerts}
        onUpdateAlerts={onUpdateAlerts}
        matchedItemIds={keywordMatchedIds}
      />

      {/* Daily Brief */}
      {allItems.length > 0 && !initialLoading && activeTabId === "all" && (
        <DailyBrief allItems={allItems} onOpenReader={onOpenReader} />
      )}

      {/* Source Analytics */}
      {showAnalytics && allItems.length > 0 && (
        <Suspense><SourceAnalytics items={allItems} /></Suspense>
      )}

      {/* Pro Upgrade Banner */}
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
    </>
  );
}
