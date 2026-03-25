"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  RefreshCw,
  FileText,
  Bookmark,
  Trash2,
  AlertTriangle,
  Trophy,
  Settings,
  Clock,
  Download,
  ChevronDown,
  Filter,
  X,
  Search,
  Calendar,
  Activity,
} from "lucide-react";

// --- Types ---

type EventType =
  | "feed_created"
  | "feed_refreshed"
  | "new_articles"
  | "articles_bookmarked"
  | "feed_removed"
  | "source_offline"
  | "milestone"
  | "settings_changed";

interface ChangelogEvent {
  id: string;
  type: EventType;
  description: string;
  feedName?: string;
  timestamp: string; // ISO
  meta?: Record<string, string | number>;
}

interface ChangelogData {
  events: ChangelogEvent[];
  initialized: boolean;
}

// --- Constants ---

const STORAGE_KEY = "feedbot-changelog";
const EVENTS_PER_PAGE = 20;

const EVENT_CONFIG: Record<EventType, { icon: typeof Plus; color: string; bgColor: string; label: string }> = {
  feed_created: { icon: Plus, color: "text-green-400", bgColor: "bg-green-400/10", label: "Feed Created" },
  feed_refreshed: { icon: RefreshCw, color: "text-blue-400", bgColor: "bg-blue-400/10", label: "Feed Refreshed" },
  new_articles: { icon: FileText, color: "text-primary", bgColor: "bg-primary/10", label: "New Articles" },
  articles_bookmarked: { icon: Bookmark, color: "text-amber-400", bgColor: "bg-amber-400/10", label: "Bookmarked" },
  feed_removed: { icon: Trash2, color: "text-red-400", bgColor: "bg-red-400/10", label: "Feed Removed" },
  source_offline: { icon: AlertTriangle, color: "text-red-400", bgColor: "bg-red-400/10", label: "Source Offline" },
  milestone: { icon: Trophy, color: "text-yellow-400", bgColor: "bg-yellow-400/10", label: "Milestone" },
  settings_changed: { icon: Settings, color: "text-gray-400", bgColor: "bg-gray-400/10", label: "Settings Changed" },
};

// --- Helpers ---

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayKey = today.toISOString().split("T")[0];
  const yesterdayKey = yesterday.toISOString().split("T")[0];

  if (dateStr === todayKey) return "Today";
  if (dateStr === yesterdayKey) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function loadChangelog(): ChangelogData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { events: [], initialized: false };
}

function saveChangelog(data: ChangelogData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function randomTime(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(Math.floor(Math.random() * 14) + 7, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

function generateDemoEvents(): ChangelogEvent[] {
  const feedNames = ["TechCrunch", "Hacker News", "The Verge", "Ars Technica", "CSS-Tricks"];
  const events: ChangelogEvent[] = [];

  // Milestone
  events.push({
    id: generateId(),
    type: "milestone",
    description: "100th article read! You're on a roll.",
    timestamp: randomTime(0),
  });

  // Today's events
  for (const name of feedNames.slice(0, 3)) {
    events.push({
      id: generateId(),
      type: "feed_refreshed",
      description: `${name} was refreshed`,
      feedName: name,
      timestamp: randomTime(0),
    });
    events.push({
      id: generateId(),
      type: "new_articles",
      description: `${Math.floor(Math.random() * 8) + 2} new articles from ${name}`,
      feedName: name,
      timestamp: randomTime(0),
    });
  }

  // Yesterday
  events.push({
    id: generateId(),
    type: "feed_created",
    description: "Added CSS-Tricks to your feeds",
    feedName: "CSS-Tricks",
    timestamp: randomTime(1),
  });
  events.push({
    id: generateId(),
    type: "articles_bookmarked",
    description: "Bookmarked 3 articles from Hacker News",
    feedName: "Hacker News",
    timestamp: randomTime(1),
  });
  events.push({
    id: generateId(),
    type: "settings_changed",
    description: "Changed refresh interval to every 30 minutes",
    timestamp: randomTime(1),
  });

  // 2 days ago
  events.push({
    id: generateId(),
    type: "source_offline",
    description: "Ars Technica feed returned an error",
    feedName: "Ars Technica",
    timestamp: randomTime(2),
  });
  events.push({
    id: generateId(),
    type: "new_articles",
    description: "12 new articles from The Verge",
    feedName: "The Verge",
    timestamp: randomTime(2),
  });

  // 3 days ago
  events.push({
    id: generateId(),
    type: "feed_created",
    description: "Added TechCrunch to your feeds",
    feedName: "TechCrunch",
    timestamp: randomTime(3),
  });
  events.push({
    id: generateId(),
    type: "feed_created",
    description: "Added Hacker News to your feeds",
    feedName: "Hacker News",
    timestamp: randomTime(3),
  });
  events.push({
    id: generateId(),
    type: "milestone",
    description: "10 feeds created! Building a great collection.",
    timestamp: randomTime(3),
  });

  // 5 days ago
  events.push({
    id: generateId(),
    type: "feed_removed",
    description: "Removed old blog feed",
    feedName: "Old Blog",
    timestamp: randomTime(5),
  });
  events.push({
    id: generateId(),
    type: "articles_bookmarked",
    description: "Bookmarked 5 articles from TechCrunch",
    feedName: "TechCrunch",
    timestamp: randomTime(5),
  });

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// --- Public API for adding events ---

export function addChangelogEvent(event: Omit<ChangelogEvent, "id" | "timestamp">): void {
  const data = loadChangelog();
  data.events.unshift({
    ...event,
    id: generateId(),
    timestamp: new Date().toISOString(),
  });
  // Keep max 500 events
  if (data.events.length > 500) data.events = data.events.slice(0, 500);
  saveChangelog(data);
}

// --- Components ---

export function ChangelogBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const data = loadChangelog();
    const todayKey = new Date().toISOString().split("T")[0];
    const todayCount = data.events.filter(
      (e) => e.timestamp.split("T")[0] === todayKey
    ).length;
    setCount(todayCount);
  }, []);

  if (count === 0) return null;

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
      {count}
    </span>
  );
}

export function FeedChangelog() {
  const [data, setData] = useState<ChangelogData>({ events: [], initialized: false });
  const [visibleCount, setVisibleCount] = useState(EVENTS_PER_PAGE);
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set());
  const [feedFilter, setFeedFilter] = useState("");
  const [showFeedSearch, setShowFeedSearch] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load + initialize demo data
  useEffect(() => {
    let loaded = loadChangelog();
    if (!loaded.initialized) {
      loaded = { events: generateDemoEvents(), initialized: true };
      saveChangelog(loaded);
    }
    setData(loaded);
  }, []);

  // Unique feed names for filtering
  const feedNames = useMemo(() => {
    const names = new Set<string>();
    for (const e of data.events) {
      if (e.feedName) names.add(e.feedName);
    }
    return Array.from(names).sort();
  }, [data.events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let events = data.events;

    if (activeTypes.size > 0) {
      events = events.filter((e) => activeTypes.has(e.type));
    }

    if (feedFilter) {
      events = events.filter(
        (e) => e.feedName && e.feedName.toLowerCase().includes(feedFilter.toLowerCase())
      );
    }

    if (dateFrom) {
      events = events.filter((e) => e.timestamp.split("T")[0] >= dateFrom);
    }
    if (dateTo) {
      events = events.filter((e) => e.timestamp.split("T")[0] <= dateTo);
    }

    return events;
  }, [data.events, activeTypes, feedFilter, dateFrom, dateTo]);

  // Group by date
  const dayGroups = useMemo(() => {
    const groups = new Map<string, ChangelogEvent[]>();
    for (const event of filteredEvents.slice(0, visibleCount)) {
      const key = event.timestamp.split("T")[0];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, events]) => ({ date, label: formatDateHeader(date), events }));
  }, [filteredEvents, visibleCount]);

  // Summary stats
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoIso = weekAgo.toISOString();

    const thisWeek = data.events.filter((e) => e.timestamp >= weekAgoIso);

    // Most active feed
    const feedCounts = new Map<string, number>();
    for (const e of thisWeek) {
      if (e.feedName) {
        feedCounts.set(e.feedName, (feedCounts.get(e.feedName) || 0) + 1);
      }
    }
    let mostActive = "—";
    let maxCount = 0;
    for (const [name, count] of feedCounts) {
      if (count > maxCount) {
        mostActive = name;
        maxCount = count;
      }
    }

    // Biggest day
    const dayCounts = new Map<string, number>();
    for (const e of thisWeek) {
      const key = e.timestamp.split("T")[0];
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }
    let biggestDay = "—";
    let biggestDayCount = 0;
    for (const [day, count] of dayCounts) {
      if (count > biggestDayCount) {
        biggestDay = formatDateHeader(day);
        biggestDayCount = count;
      }
    }

    return {
      thisWeekCount: thisWeek.length,
      mostActive,
      biggestDay,
      biggestDayCount,
    };
  }, [data.events]);

  const toggleType = useCallback((type: EventType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveTypes(new Set());
    setFeedFilter("");
    setDateFrom("");
    setDateTo("");
  }, []);

  const hasFilters = activeTypes.size > 0 || feedFilter || dateFrom || dateTo;

  const exportChangelog = useCallback(
    (format: "json" | "text") => {
      const events = filteredEvents;
      let content: string;
      let filename: string;
      let mime: string;

      if (format === "json") {
        content = JSON.stringify(events, null, 2);
        filename = "feedbot-changelog.json";
        mime = "application/json";
      } else {
        const lines = ["FeedBot Changelog", "=".repeat(40), ""];
        for (const event of events) {
          const date = new Date(event.timestamp).toLocaleString();
          const feed = event.feedName ? ` [${event.feedName}]` : "";
          lines.push(`${date}${feed}`);
          lines.push(`  ${EVENT_CONFIG[event.type].label}: ${event.description}`);
          lines.push("");
        }
        content = lines.join("\n");
        filename = "feedbot-changelog.txt";
        mime = "text/plain";
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportMenu(false);
    },
    [filteredEvents]
  );

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Feed Changelog</h3>
          <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-medium text-text-muted">
            {filteredEvents.length} events
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              title="Export changelog"
            >
              <Download className="h-4 w-4" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-border bg-bg-card shadow-lg">
                <button
                  onClick={() => exportChangelog("json")}
                  className="w-full px-3 py-2 text-left text-xs text-text hover:bg-bg-hover"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => exportChangelog("text")}
                  className="w-full px-3 py-2 text-left text-xs text-text hover:bg-bg-hover"
                >
                  Export as Text
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-0 divide-x divide-border border-b border-border">
        <div className="px-4 py-2.5 text-center">
          <p className="text-lg font-bold text-text">{stats.thisWeekCount}</p>
          <p className="text-[10px] text-text-muted">Events this week</p>
        </div>
        <div className="px-4 py-2.5 text-center">
          <p className="truncate text-sm font-bold text-text">{stats.mostActive}</p>
          <p className="text-[10px] text-text-muted">Most active feed</p>
        </div>
        <div className="px-4 py-2.5 text-center">
          <p className="text-sm font-bold text-text">
            {stats.biggestDay}
            {stats.biggestDayCount > 0 && (
              <span className="ml-1 text-[10px] font-normal text-text-muted">
                ({stats.biggestDayCount})
              </span>
            )}
          </p>
          <p className="text-[10px] text-text-muted">Biggest day</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2 border-b border-border px-4 py-3">
        {/* Event type pills */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(EVENT_CONFIG) as [EventType, typeof EVENT_CONFIG[EventType]][]).map(
            ([type, config]) => {
              const Icon = config.icon;
              const active = activeTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? `${config.bgColor} ${config.color}`
                      : "bg-bg-hover text-text-muted hover:text-text"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </button>
              );
            }
          )}
        </div>

        {/* Feed search + date range */}
        <div className="flex items-center gap-2">
          {showFeedSearch ? (
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={feedFilter}
                onChange={(e) => setFeedFilter(e.target.value)}
                placeholder="Filter by feed name..."
                className="h-7 w-full rounded-lg border border-border bg-bg pl-7 pr-7 text-xs text-text placeholder-text-muted focus:border-primary focus:outline-none"
                autoFocus
                list="feed-names"
              />
              <datalist id="feed-names">
                {feedNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <button
                onClick={() => {
                  setFeedFilter("");
                  setShowFeedSearch(false);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowFeedSearch(true)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            >
              <Filter className="h-3 w-3" />
              Filter by feed
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-text-muted" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-7 rounded-lg border border-border bg-bg px-2 text-[11px] text-text focus:border-primary focus:outline-none"
              title="From date"
            />
            <span className="text-[10px] text-text-muted">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-7 rounded-lg border border-border bg-bg px-2 text-[11px] text-text focus:border-primary focus:outline-none"
              title="To date"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="rounded-lg px-2 py-1 text-[11px] text-red-400 transition-colors hover:bg-red-400/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3">
        {dayGroups.length === 0 ? (
          <p className="py-8 text-center text-xs text-text-muted">No events match your filters.</p>
        ) : (
          <div className="space-y-4">
            {dayGroups.map((group) => (
              <div key={group.date}>
                {/* Date header */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-text">{group.label}</span>
                  <div className="h-px flex-1 bg-border" />
                  <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] text-text-muted">
                    {group.events.length}
                  </span>
                </div>

                {/* Events */}
                <div className="relative ml-3">
                  {/* Connection line */}
                  <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

                  {group.events.map((event, i) => {
                    const config = EVENT_CONFIG[event.type];
                    const Icon = config.icon;
                    return (
                      <div key={event.id} className="relative flex items-start gap-3 py-1.5">
                        {/* Icon dot */}
                        <div
                          className={`relative z-10 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
                        >
                          <Icon className={`h-2.5 w-2.5 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 pb-1">
                          <p className="text-xs text-text">{event.description}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[10px] text-text-muted">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTime(event.timestamp)}
                            </span>
                            {event.feedName && (
                              <span className="rounded bg-bg-hover px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                                {event.feedName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {visibleCount < filteredEvents.length && (
          <button
            onClick={() => setVisibleCount((v) => v + EVENTS_PER_PAGE)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Load more ({filteredEvents.length - visibleCount} remaining)
          </button>
        )}
      </div>
    </div>
  );
}
