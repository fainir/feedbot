"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface TimelineItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

interface FeedTimelineProps {
  items: TimelineItem[];
  onSelectItem: (item: TimelineItem) => void;
  readIds: Set<string>;
}

export function FeedTimeline({ items, onSelectItem, readIds }: FeedTimelineProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);

  const dayGroups = useMemo(() => {
    const groups = new Map<string, TimelineItem[]>();
    for (const item of items) {
      const date = new Date(item.publishedAt);
      const key = date.toISOString().split("T")[0];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    // Sort by date desc
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        label: formatDateLabel(date),
        items: items.sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        ),
      }));
  }, [items]);

  const visibleDays = dayGroups.slice(dayOffset, dayOffset + 3);

  if (!showTimeline) {
    return (
      <button
        onClick={() => setShowTimeline(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Timeline view"
      >
        <Calendar className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Timeline</span>
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Timeline</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDayOffset((p) => Math.min(dayGroups.length - 3, p + 3))}
            disabled={dayOffset + 3 >= dayGroups.length}
            className="rounded-lg p-1 text-text-muted transition-colors hover:text-text disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDayOffset((p) => Math.max(0, p - 3))}
            disabled={dayOffset === 0}
            className="rounded-lg p-1 text-text-muted transition-colors hover:text-text disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowTimeline(false)}
            className="ml-1 rounded-lg px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {visibleDays.map((day) => (
          <div key={day.date} className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-text">{day.label}</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {day.items.length}
              </span>
            </div>
            <div className="relative space-y-0">
              {/* Vertical line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
              {day.items.slice(0, 8).map((item) => {
                const isRead = readIds.has(item.id);
                const time = new Date(item.publishedAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className={`group relative flex w-full items-start gap-2.5 rounded-lg py-1.5 pl-5 pr-2 text-left transition-colors hover:bg-bg-hover ${
                      isRead ? "opacity-50" : ""
                    }`}
                  >
                    {/* Dot on timeline */}
                    <div
                      className={`absolute left-0 top-3 h-[11px] w-[11px] rounded-full border-2 ${
                        isRead
                          ? "border-border bg-bg"
                          : "border-primary bg-primary/20"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[11px] font-medium text-text">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-2.5 w-2.5 text-text-muted" />
                        <span className="text-[10px] text-text-muted">{time}</span>
                        <span className="text-[10px] text-text-muted">· {item.source}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {day.items.length > 8 && (
                <p className="pl-5 text-[10px] text-text-muted">
                  +{day.items.length - 8} more
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
