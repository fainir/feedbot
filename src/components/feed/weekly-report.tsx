"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trophy,
  Award,
  Star,
  BarChart3,
  Calendar,
  Share2,
  X,
  BookOpen,
  Clock,
  Bookmark,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Moon,
  Sun,
  Compass,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";

// --- Types ---

interface ReadHistoryEntry {
  id: string;
  title: string;
  source: string;
  readAt: string; // ISO
}

interface BookmarkEntry {
  id: string;
  title?: string;
  source?: string;
  publishedAt?: string;
  bookmarkedAt?: string;
}

interface GoalData {
  dailyTarget: number;
  history: Record<string, number>;
}

interface DayData {
  date: string;
  dayLabel: string;
  count: number;
}

interface TopArticle {
  id: string;
  title: string;
  source: string;
}

interface SourceBreakdown {
  source: string;
  count: number;
  percent: number;
  color: string;
}

interface Badge {
  id: string;
  icon: React.ReactNode;
  name: string;
  description: string;
  unlocked: boolean;
}

interface WeekStats {
  articlesRead: number;
  timeSpentMin: number;
  streakDays: number;
  bookmarksSaved: number;
}

interface WowComparison {
  articlesRead: { current: number; previous: number; diff: number };
  timeSpent: { current: number; previous: number; diff: number };
  bookmarks: { current: number; previous: number; diff: number };
}

// --- Constants ---

const SOURCE_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#64748b", "#84cc16",
];

const AVG_READ_TIME_MIN = 4; // average minutes per article

// --- Helpers ---

function getWeekRange(weeksAgo: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - weeksAgo * 7);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDayLabel(d: Date): string {
  return d.toLocaleDateString("en", { weekday: "short" });
}

function loadReadHistory(): ReadHistoryEntry[] {
  try {
    const readRaw = localStorage.getItem("feedbot-read");
    const readIds: string[] = readRaw ? JSON.parse(readRaw) : [];

    const bookmarkRaw = localStorage.getItem("feedbot-bookmark-items");
    const bookmarks: BookmarkEntry[] = bookmarkRaw ? JSON.parse(bookmarkRaw) : [];

    const bookmarkMap = new Map<string, BookmarkEntry>();
    for (const b of bookmarks) bookmarkMap.set(b.id, b);

    const goalsRaw = localStorage.getItem("feedbot-reading-goals");
    const goalsData: GoalData = goalsRaw
      ? JSON.parse(goalsRaw)
      : { dailyTarget: 5, history: {} };

    // Build entries from read IDs, enriching with bookmark data when available
    const entries: ReadHistoryEntry[] = [];
    const historyDates = Object.keys(goalsData.history).sort();

    for (const id of readIds) {
      const bm = bookmarkMap.get(id);
      entries.push({
        id,
        title: bm?.title || "Untitled Article",
        source: bm?.source || "Unknown",
        readAt: bm?.publishedAt || bm?.bookmarkedAt || (historyDates.length > 0 ? historyDates[historyDates.length - 1] : new Date().toISOString()),
      });
    }

    return entries;
  } catch {
    return [];
  }
}

function loadBookmarks(): BookmarkEntry[] {
  try {
    const raw = localStorage.getItem("feedbot-bookmark-items");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadGoals(): GoalData {
  try {
    const raw = localStorage.getItem("feedbot-reading-goals");
    return raw ? JSON.parse(raw) : { dailyTarget: 5, history: {} };
  } catch {
    return { dailyTarget: 5, history: {} };
  }
}

function getWeekDays(start: Date): DayData[] {
  const days: DayData[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push({
      date: formatDate(d),
      dayLabel: getDayLabel(d),
      count: 0,
    });
  }
  return days;
}

function getStreakFromGoals(history: Record<string, number>, target: number): number {
  let streak = 0;
  const today = new Date();
  const todayKey = formatDate(today);

  if ((history[todayKey] || 0) >= target) {
    streak = 1;
  } else {
    today.setDate(today.getDate() - 1);
  }

  const start = new Date(today);
  if (streak > 0) start.setDate(start.getDate() - 1);

  for (let d = new Date(start); ; d.setDate(d.getDate() - 1)) {
    const key = formatDate(d);
    if ((history[key] || 0) >= target) {
      streak++;
    } else {
      break;
    }
    if (streak > 365) break;
  }

  return streak;
}

// --- Component ---

interface WeeklyReportProps {
  onClose: () => void;
}

export function WeeklyReport({ onClose }: WeeklyReportProps) {
  const [copied, setCopied] = useState(false);

  const data = useMemo(() => {
    const history = loadReadHistory();
    const bookmarks = loadBookmarks();
    const goals = loadGoals();
    const { start, end } = getWeekRange(0);
    const { start: prevStart, end: prevEnd } = getWeekRange(1);

    // Filter to this week
    const thisWeek = history.filter((e) => {
      const d = new Date(e.readAt);
      return d >= start && d <= end;
    });

    const prevWeek = history.filter((e) => {
      const d = new Date(e.readAt);
      return d >= prevStart && d <= prevEnd;
    });

    const thisWeekBookmarks = bookmarks.filter((b) => {
      const d = new Date(b.bookmarkedAt || b.publishedAt || "");
      return d >= start && d <= end;
    });

    const prevWeekBookmarks = bookmarks.filter((b) => {
      const d = new Date(b.bookmarkedAt || b.publishedAt || "");
      return d >= prevStart && d <= prevEnd;
    });

    // Day-by-day data using goals history for accuracy
    const dayData = getWeekDays(start);
    for (const day of dayData) {
      day.count = goals.history[day.date] || 0;
    }
    // Also count from read history as fallback
    for (const entry of thisWeek) {
      const key = formatDate(new Date(entry.readAt));
      const dayItem = dayData.find((d) => d.date === key);
      if (dayItem && dayItem.count === 0) {
        dayItem.count++;
      }
    }

    // Stats
    const articlesRead = dayData.reduce((sum, d) => sum + d.count, 0) || thisWeek.length;
    const timeSpentMin = articlesRead * AVG_READ_TIME_MIN;
    const streakDays = getStreakFromGoals(goals.history, goals.dailyTarget);
    const bookmarksSaved = thisWeekBookmarks.length;

    const stats: WeekStats = { articlesRead, timeSpentMin, streakDays, bookmarksSaved };

    // Previous week stats for comparison
    const prevArticles = Object.entries(goals.history)
      .filter(([date]) => {
        const d = new Date(date);
        return d >= prevStart && d <= prevEnd;
      })
      .reduce((sum, [, count]) => sum + count, 0) || prevWeek.length;

    const wow: WowComparison = {
      articlesRead: {
        current: articlesRead,
        previous: prevArticles,
        diff: prevArticles > 0 ? Math.round(((articlesRead - prevArticles) / prevArticles) * 100) : 0,
      },
      timeSpent: {
        current: timeSpentMin,
        previous: prevArticles * AVG_READ_TIME_MIN,
        diff: prevArticles > 0 ? Math.round(((articlesRead - prevArticles) / prevArticles) * 100) : 0,
      },
      bookmarks: {
        current: bookmarksSaved,
        previous: prevWeekBookmarks.length,
        diff: prevWeekBookmarks.length > 0
          ? Math.round(((bookmarksSaved - prevWeekBookmarks.length) / prevWeekBookmarks.length) * 100)
          : 0,
      },
    };

    // Top articles (read + bookmarked get priority)
    const bookmarkIdSet = new Set(bookmarks.map((b) => b.id));
    const scored = thisWeek.map((e) => ({
      ...e,
      score: 1 + (bookmarkIdSet.has(e.id) ? 2 : 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    const topArticles: TopArticle[] = scored.slice(0, 3).map((e) => ({
      id: e.id,
      title: e.title,
      source: e.source,
    }));

    // Source breakdown
    const sourceCounts: Record<string, number> = {};
    for (const e of thisWeek) {
      sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
    }
    const totalSourced = Object.values(sourceCounts).reduce((a, b) => a + b, 0) || 1;
    const sources: SourceBreakdown[] = Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([source, count], i) => ({
        source,
        count,
        percent: Math.round((count / totalSourced) * 100),
        color: SOURCE_COLORS[i % SOURCE_COLORS.length],
      }));

    // Badges
    const maxInDay = Math.max(...dayData.map((d) => d.count), 0);
    const uniqueSources = new Set(thisWeek.map((e) => e.source)).size;

    const hasNightReads = thisWeek.some((e) => {
      const h = new Date(e.readAt).getHours();
      return h >= 22 || h < 4;
    });
    const hasEarlyReads = thisWeek.some((e) => {
      const h = new Date(e.readAt).getHours();
      return h >= 4 && h < 7;
    });

    const badges: Badge[] = [
      {
        id: "speed-reader",
        icon: <Zap className="h-5 w-5" />,
        name: "Speed Reader",
        description: "Read 10+ articles in a day",
        unlocked: maxInDay >= 10,
      },
      {
        id: "bookworm",
        icon: <Flame className="h-5 w-5" />,
        name: "Bookworm",
        description: "Maintain a 7-day streak",
        unlocked: streakDays >= 7,
      },
      {
        id: "explorer",
        icon: <Compass className="h-5 w-5" />,
        name: "Explorer",
        description: "Read from 5+ different sources",
        unlocked: uniqueSources >= 5,
      },
      {
        id: "night-owl",
        icon: <Moon className="h-5 w-5" />,
        name: "Night Owl",
        description: "Articles read after 10pm",
        unlocked: hasNightReads,
      },
      {
        id: "early-bird",
        icon: <Sun className="h-5 w-5" />,
        name: "Early Bird",
        description: "Articles read before 7am",
        unlocked: hasEarlyReads,
      },
      {
        id: "curator",
        icon: <Bookmark className="h-5 w-5" />,
        name: "Curator",
        description: "Save 10+ bookmarks",
        unlocked: bookmarksSaved >= 10,
      },
    ];

    // Fun fact
    const pages = Math.round(articlesRead * 2.5); // ~2.5 pages per article
    const funFacts = [
      `You read the equivalent of ${pages} pages this week`,
      `You spent about ${timeSpentMin} minutes reading this week`,
      `That's roughly ${Math.round(timeSpentMin / 60 * 10) / 10} hours of focused reading`,
      articlesRead > 0
        ? `You averaged ${Math.round((articlesRead / 7) * 10) / 10} articles per day`
        : "Start reading to unlock your weekly stats!",
    ];
    const funFact = funFacts[Math.floor(Math.random() * funFacts.length)];

    return { stats, dayData, topArticles, sources, badges, wow, funFact, start, end };
  }, []);

  const handleShare = useCallback(() => {
    const { stats, badges } = data;
    const unlockedBadges = badges.filter((b) => b.unlocked).map((b) => b.name);
    const lines = [
      "My FeedBot Weekly Reading Report",
      `Articles read: ${stats.articlesRead}`,
      `Time spent: ${stats.timeSpentMin} min`,
      `Streak: ${stats.streakDays} days`,
      `Bookmarks: ${stats.bookmarksSaved}`,
      unlockedBadges.length > 0 ? `Badges: ${unlockedBadges.join(", ")}` : "",
      `${data.funFact}`,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  const maxDayCount = Math.max(...data.dayData.map((d) => d.count), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-bg-card shadow-2xl">
        {/* Header gradient */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 px-5 pb-4 pt-5">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-text">Weekly Reading Report</h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {data.start.toLocaleDateString("en", { month: "short", day: "numeric" })} &ndash;{" "}
            {data.end.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="space-y-4 p-5">
          {/* Hero Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Articles Read", value: data.stats.articlesRead, icon: <BookOpen className="h-4 w-4" />, color: "text-primary" },
              { label: "Time Spent", value: `${data.stats.timeSpentMin}m`, icon: <Clock className="h-4 w-4" />, color: "text-emerald-400" },
              { label: "Streak Days", value: data.stats.streakDays, icon: <Flame className="h-4 w-4" />, color: "text-orange-400" },
              { label: "Bookmarks", value: data.stats.bookmarksSaved, icon: <Bookmark className="h-4 w-4" />, color: "text-yellow-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-bg-hover/30 p-3 transition-colors hover:bg-bg-hover/50"
              >
                <div className={`mb-1 ${stat.color}`}>{stat.icon}</div>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
                <p className="text-[10px] text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Week-over-Week Comparison */}
          <div className="rounded-xl border border-border p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              vs Last Week
            </p>
            <div className="flex items-center justify-between gap-2">
              {[
                { label: "Articles", ...data.wow.articlesRead },
                { label: "Time", ...data.wow.timeSpent },
                { label: "Bookmarks", ...data.wow.bookmarks },
              ].map((item) => (
                <div key={item.label} className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {item.diff > 0 ? (
                      <ArrowUp className="h-3 w-3 text-green-400" />
                    ) : item.diff < 0 ? (
                      <ArrowDown className="h-3 w-3 text-red-400" />
                    ) : (
                      <Minus className="h-3 w-3 text-text-muted" />
                    )}
                    <span
                      className={`text-xs font-bold ${
                        item.diff > 0
                          ? "text-green-400"
                          : item.diff < 0
                          ? "text-red-400"
                          : "text-text-muted"
                      }`}
                    >
                      {item.diff > 0 ? "+" : ""}
                      {item.diff}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reading Calendar (Bar Chart) */}
          <div className="rounded-xl border border-border p-3">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Reading Calendar
              </p>
            </div>
            <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
              {data.dayData.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] font-medium text-text-muted">{day.count}</span>
                  <div
                    className={`w-full rounded-md transition-all ${
                      day.count > 0
                        ? "bg-gradient-to-t from-primary to-primary/60"
                        : "bg-border"
                    }`}
                    style={{
                      height: `${Math.max(4, (day.count / maxDayCount) * 56)}px`,
                    }}
                  />
                  <span className="text-[9px] text-text-muted">{day.dayLabel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Articles */}
          {data.topArticles.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-yellow-400" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Top Articles
                </p>
              </div>
              <div className="space-y-2">
                {data.topArticles.map((article, i) => (
                  <div key={article.id} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-text">{article.title}</p>
                      <p className="text-[10px] text-text-muted">{article.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Breakdown */}
          {data.sources.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Source Breakdown
                </p>
              </div>
              {/* Pie-style bar visualization */}
              <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full">
                {data.sources.map((src) => (
                  <div
                    key={src.source}
                    className="h-full transition-all"
                    style={{ width: `${src.percent}%`, backgroundColor: src.color }}
                    title={`${src.source}: ${src.percent}%`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {data.sources.map((src) => (
                  <div key={src.source} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: src.color }}
                    />
                    <span className="text-[11px] text-text">{src.source}</span>
                    <span className="text-[10px] text-text-muted">{src.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievement Badges */}
          <div className="rounded-xl border border-border p-3">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" />
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Achievement Badges
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {data.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center rounded-lg border p-2 text-center transition-all ${
                    badge.unlocked
                      ? "border-yellow-400/30 bg-yellow-400/5"
                      : "border-border bg-bg-hover/20 opacity-40 grayscale"
                  }`}
                >
                  <div
                    className={`mb-1 ${
                      badge.unlocked ? "text-yellow-400" : "text-text-muted"
                    }`}
                  >
                    {badge.icon}
                  </div>
                  <p className="text-[10px] font-semibold text-text">{badge.name}</p>
                  <p className="text-[8px] leading-tight text-text-muted">{badge.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fun Fact */}
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-xs text-text">{data.funFact}</p>
            </div>
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            <Share2 className="h-4 w-4" />
            {copied ? "Copied to clipboard!" : "Share My Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Button to open the report ---

export function WeeklyReportButton() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Weekly reading report"
      >
        <Award className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Weekly Report</span>
      </button>
      {show && <WeeklyReport onClose={() => setShow(false)} />}
    </>
  );
}
