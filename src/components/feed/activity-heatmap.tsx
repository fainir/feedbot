"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface ActivityHeatmapProps {
  readDates: string[]; // ISO date strings of when articles were read
}

function getWeeksData(readDates: string[], weeksBack: number) {
  const today = new Date();
  const dayCount: Record<string, number> = {};

  // Count reads per day
  for (const dateStr of readDates) {
    const day = dateStr.split("T")[0];
    dayCount[day] = (dayCount[day] || 0) + 1;
  }

  // Build grid: 7 rows (days) x N columns (weeks)
  const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];

  for (let w = weeksBack - 1; w >= 0; w--) {
    const week: { date: string; count: number; dayOfWeek: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      // Adjust to start from Sunday
      const dayOffset = date.getDay();
      date.setDate(date.getDate() - dayOffset + d);
      const key = date.toISOString().split("T")[0];
      week.push({
        date: key,
        count: dayCount[key] || 0,
        dayOfWeek: d,
      });
    }
    weeks.push(week);
  }

  // Simpler approach: just go back N*7 days
  const result: { date: string; count: number }[][] = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - weeksBack * 7);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  for (let w = 0; w < weeksBack; w++) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7 + d);
      const key = date.toISOString().split("T")[0];
      const isFuture = date > today;
      week.push({ date: key, count: isFuture ? -1 : dayCount[key] || 0 });
    }
    result.push(week);
  }

  return result;
}

function getIntensity(count: number, max: number): string {
  if (count < 0) return "bg-transparent";
  if (count === 0) return "bg-bg-hover";
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25) return "bg-primary/20";
  if (ratio < 0.5) return "bg-primary/40";
  if (ratio < 0.75) return "bg-primary/60";
  return "bg-primary";
}

export function ActivityHeatmap({ readDates }: ActivityHeatmapProps) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const WEEKS = 12;

  const weeks = useMemo(() => getWeeksData(readDates, WEEKS), [readDates]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const week of weeks) {
      for (const day of week) {
        if (day.count > max) max = day.count;
      }
    }
    return max;
  }, [weeks]);

  const totalReads = readDates.length;
  const daysActive = useMemo(() => {
    const unique = new Set(readDates.map((d) => d.split("T")[0]));
    return unique.size;
  }, [readDates]);

  if (!showHeatmap) {
    return (
      <button
        onClick={() => setShowHeatmap(true)}
        className="mb-4 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted transition-colors hover:border-primary/40 hover:text-text"
      >
        <Calendar className="h-3.5 w-3.5" />
        Activity Heatmap · {totalReads} articles read
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Reading Activity</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {WEEKS} weeks
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-muted">
          <span>{totalReads} articles</span>
          <span>{daysActive} active days</span>
          <button
            onClick={() => setShowHeatmap(false)}
            className="rounded p-0.5 hover:text-text"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-[3px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] pr-1">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
            <div key={i} className="flex h-[13px] items-center text-[9px] text-text-muted">
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={di}
                className={`h-[13px] w-[13px] rounded-sm ${getIntensity(day.count, maxCount)} transition-colors`}
                title={day.count >= 0 ? `${day.date}: ${day.count} article${day.count !== 1 ? "s" : ""}` : ""}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1 text-[9px] text-text-muted">
        <span>Less</span>
        <div className="h-[10px] w-[10px] rounded-sm bg-bg-hover" />
        <div className="h-[10px] w-[10px] rounded-sm bg-primary/20" />
        <div className="h-[10px] w-[10px] rounded-sm bg-primary/40" />
        <div className="h-[10px] w-[10px] rounded-sm bg-primary/60" />
        <div className="h-[10px] w-[10px] rounded-sm bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
}
