"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Clock,
  BookOpen,
  Bookmark,
  TrendingUp,
  X,
} from "lucide-react";

interface CalendarItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
}

interface ContentCalendarProps {
  items: CalendarItem[];
  onSelectItem?: (item: CalendarItem) => void;
  readIds?: Set<string>;
  bookmarkedIds?: Set<string>;
}

type ViewMode = "month" | "week";

// --- Helpers ---

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getHeatColor(count: number, max: number): string {
  if (count === 0) return "bg-transparent";
  const ratio = max > 0 ? count / max : 0;
  if (ratio <= 0.25) return "bg-primary/10 dark:bg-primary/15";
  if (ratio <= 0.5) return "bg-primary/20 dark:bg-primary/25";
  if (ratio <= 0.75) return "bg-primary/35 dark:bg-primary/40";
  return "bg-primary/50 dark:bg-primary/55";
}

function getWeekDates(centerDate: Date): Date[] {
  const start = new Date(centerDate);
  start.setDate(start.getDate() - start.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

// --- Calendar Toggle Button ---

export function CalendarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
      title="Calendar view"
    >
      <Calendar className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Calendar</span>
    </button>
  );
}

// --- Main Component ---

export function ContentCalendar({
  items,
  onSelectItem,
  readIds = new Set(),
  bookmarkedIds = new Set(),
}: ContentCalendarProps) {
  const today = getToday();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [weekCenter, setWeekCenter] = useState(today);

  // Responsive: default to week view on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    if (mq.matches) setViewMode("week");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setViewMode("week");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Group items by date key
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const d = new Date(item.publishedAt);
      const key = dateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    // Sort each day's items by time desc
    for (const [, arr] of map) {
      arr.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }
    return map;
  }, [items]);

  // Stats for current month
  const monthStats = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    let totalArticles = 0;
    let busiestDay = "";
    let busiestCount = 0;
    let daysWithArticles = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(new Date(viewYear, viewMonth, d));
      const count = itemsByDate.get(key)?.length || 0;
      totalArticles += count;
      if (count > 0) daysWithArticles++;
      if (count > busiestCount) {
        busiestCount = count;
        busiestDay = new Date(viewYear, viewMonth, d).toLocaleDateString(
          "en-US",
          { weekday: "short", month: "short", day: "numeric" }
        );
      }
    }

    const avg =
      daysWithArticles > 0 ? (totalArticles / daysInMonth).toFixed(1) : "0";

    // Trend: compare first half vs second half of month
    let firstHalf = 0;
    let secondHalf = 0;
    const midpoint = Math.floor(daysInMonth / 2);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(new Date(viewYear, viewMonth, d));
      const count = itemsByDate.get(key)?.length || 0;
      if (d <= midpoint) firstHalf += count;
      else secondHalf += count;
    }
    const trend =
      secondHalf > firstHalf ? "up" : secondHalf < firstHalf ? "down" : "flat";

    return { totalArticles, busiestDay, busiestCount, avg, trend };
  }, [viewYear, viewMonth, itemsByDate]);

  // Max articles in a single day this month (for heatmap scaling)
  const maxInDay = useMemo(() => {
    let max = 0;
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(new Date(viewYear, viewMonth, d));
      const count = itemsByDate.get(key)?.length || 0;
      if (count > max) max = count;
    }
    return max;
  }, [viewYear, viewMonth, itemsByDate]);

  // Navigation
  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDate(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDate(null);
  }, []);

  const goToToday = useCallback(() => {
    const t = getToday();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setWeekCenter(t);
    setSelectedDate(null);
  }, []);

  const goToPrevWeek = useCallback(() => {
    setWeekCenter((c) => {
      const d = new Date(c);
      d.setDate(d.getDate() - 7);
      return d;
    });
    setSelectedDate(null);
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekCenter((c) => {
      const d = new Date(c);
      d.setDate(d.getDate() + 7);
      return d;
    });
    setSelectedDate(null);
  }, []);

  // Build month grid cells
  const monthGrid = useMemo(() => {
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const cells: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }
    // Pad to full weeks
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [viewYear, viewMonth]);

  const weekDays = useMemo(() => getWeekDates(weekCenter), [weekCenter]);

  const selectedItems = selectedDate ? itemsByDate.get(selectedDate) || [] : [];

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Content Calendar</h3>
        </div>
        <div className="flex items-center gap-1">
          {/* View toggle */}
          <div className="mr-2 flex items-center rounded-lg border border-border">
            <button
              onClick={() => setViewMode("month")}
              className={`rounded-l-lg p-1.5 transition-colors ${
                viewMode === "month"
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:text-text"
              }`}
              title="Month view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`rounded-r-lg p-1.5 transition-colors ${
                viewMode === "week"
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:text-text"
              }`}
              title="Week view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Navigation */}
          <button
            onClick={viewMode === "month" ? goToPrevMonth : goToPrevWeek}
            className="rounded-lg p-1 text-text-muted transition-colors hover:text-text"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            Today
          </button>
          <button
            onClick={viewMode === "month" ? goToNextMonth : goToNextWeek}
            className="rounded-lg p-1 text-text-muted transition-colors hover:text-text"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Month/Year label */}
      <div className="px-4 pt-3 pb-2">
        <h4 className="text-xs font-semibold text-text">
          {viewMode === "month"
            ? formatMonthYear(new Date(viewYear, viewMonth))
            : `Week of ${weekDays[0].toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })} – ${weekDays[6].toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`}
        </h4>
      </div>

      {/* Stats Bar */}
      <div className="mx-4 mb-3 flex items-center gap-3 overflow-x-auto rounded-lg bg-bg p-2 text-[10px] text-text-muted">
        <div className="flex shrink-0 items-center gap-1">
          <BookOpen className="h-3 w-3" />
          <span>
            <span className="font-semibold text-text">
              {monthStats.totalArticles}
            </span>{" "}
            this month
          </span>
        </div>
        <div className="h-3 w-px shrink-0 bg-border" />
        <div className="shrink-0">
          Busiest:{" "}
          <span className="font-medium text-text">
            {monthStats.busiestDay || "–"}
          </span>{" "}
          ({monthStats.busiestCount})
        </div>
        <div className="h-3 w-px shrink-0 bg-border" />
        <div className="shrink-0">
          Avg: <span className="font-medium text-text">{monthStats.avg}</span>
          /day
        </div>
        <div className="h-3 w-px shrink-0 bg-border" />
        <div className="flex shrink-0 items-center gap-1">
          <TrendingUp
            className={`h-3 w-3 ${
              monthStats.trend === "up"
                ? "text-green-400"
                : monthStats.trend === "down"
                ? "rotate-180 text-red-400"
                : "text-text-muted"
            }`}
          />
          <span className="capitalize">{monthStats.trend}</span>
        </div>
      </div>

      {/* Month View */}
      {viewMode === "month" && (
        <div className="px-4 pb-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[10px] font-medium text-text-muted"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px">
            {monthGrid.map((date, i) => {
              if (!date) {
                return (
                  <div key={`empty-${i}`} className="min-h-[72px] rounded-md" />
                );
              }
              const key = dateKey(date);
              const dayItems = itemsByDate.get(key) || [];
              const count = dayItems.length;
              const isToday = isSameDay(date, today);
              const isSelected = selectedDate === key;

              return (
                <button
                  key={key}
                  onClick={() =>
                    setSelectedDate(isSelected ? null : key)
                  }
                  className={`min-h-[72px] rounded-md p-1 text-left transition-colors ${getHeatColor(
                    count,
                    maxInDay
                  )} ${
                    isToday
                      ? "ring-1 ring-primary ring-inset"
                      : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-primary ring-inset bg-primary/15 dark:bg-primary/20"
                      : "hover:bg-bg-hover/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-medium ${
                        isToday ? "text-primary" : "text-text"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {count > 0 && (
                      <span className="rounded-full bg-primary/20 px-1 py-px text-[9px] font-semibold text-primary">
                        {count}
                      </span>
                    )}
                  </div>
                  {/* Article snippets */}
                  <div className="mt-0.5 space-y-px">
                    {dayItems.slice(0, 3).map((item) => (
                      <p
                        key={item.id}
                        className="line-clamp-1 text-[9px] leading-tight text-text-muted"
                      >
                        {item.title}
                      </p>
                    ))}
                    {count > 3 && (
                      <p className="text-[8px] text-text-muted/60">
                        +{count - 3} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <div className="px-4 pb-3">
          <div className="flex gap-1 overflow-x-auto">
            {weekDays.map((date) => {
              const key = dateKey(date);
              const dayItems = itemsByDate.get(key) || [];
              const count = dayItems.length;
              const isToday = isSameDay(date, today);
              const isSelected = selectedDate === key;

              return (
                <button
                  key={key}
                  onClick={() =>
                    setSelectedDate(isSelected ? null : key)
                  }
                  className={`flex min-w-[100px] flex-1 flex-col rounded-lg p-2 text-left transition-colors ${
                    isToday
                      ? "ring-1 ring-primary ring-inset"
                      : ""
                  } ${
                    isSelected
                      ? "bg-primary/10 ring-2 ring-primary ring-inset"
                      : "bg-bg hover:bg-bg-hover/50"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase text-text-muted">
                        {date.toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </span>
                      <p
                        className={`text-sm font-semibold ${
                          isToday ? "text-primary" : "text-text"
                        }`}
                      >
                        {date.getDate()}
                      </p>
                    </div>
                    {count > 0 && (
                      <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {count}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 5).map((item) => {
                      const isRead = readIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`rounded bg-bg-card px-1.5 py-1 ${
                            isRead ? "opacity-50" : ""
                          }`}
                        >
                          <p className="line-clamp-2 text-[10px] font-medium leading-tight text-text">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-[9px] text-text-muted">
                            {item.source}
                          </p>
                        </div>
                      );
                    })}
                    {count > 5 && (
                      <p className="text-center text-[9px] text-text-muted">
                        +{count - 5} more
                      </p>
                    )}
                    {count === 0 && (
                      <p className="py-2 text-center text-[9px] text-text-muted/50">
                        No articles
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Detail Panel */}
      {selectedDate && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-text">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }
              )}
            </h4>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {selectedItems.length} article
                {selectedItems.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {selectedItems.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">
              No articles published on this day.
            </p>
          ) : (
            <div className="space-y-1">
              {selectedItems.map((item) => {
                const isRead = readIds.has(item.id);
                const isBookmarked = bookmarkedIds.has(item.id);
                const time = new Date(item.publishedAt).toLocaleTimeString(
                  "en-US",
                  { hour: "numeric", minute: "2-digit" }
                );

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem?.(item)}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-bg-hover ${
                      isRead ? "opacity-50" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-medium text-text group-hover:text-primary">
                        {item.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted">
                        <span>{item.source}</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {time}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isRead && (
                        <span className="rounded-full bg-green-400/10 px-1.5 py-0.5 text-[9px] font-medium text-green-400">
                          Read
                        </span>
                      )}
                      {isBookmarked && (
                        <Bookmark className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
