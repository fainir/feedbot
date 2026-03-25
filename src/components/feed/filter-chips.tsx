"use client";

import { Clock, BookOpen, Eye, Zap, Filter } from "lucide-react";

export type FilterChipType = "all" | "today" | "this-week" | "unread" | "long-reads" | "quick-reads";

interface FilterChipsProps {
  active: FilterChipType;
  onChange: (filter: FilterChipType) => void;
  unreadCount: number;
  todayCount: number;
}

const CHIPS: { id: FilterChipType; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All", icon: <Filter className="h-3 w-3" /> },
  { id: "today", label: "Today", icon: <Clock className="h-3 w-3" /> },
  { id: "this-week", label: "This Week", icon: <Clock className="h-3 w-3" /> },
  { id: "unread", label: "Unread", icon: <Eye className="h-3 w-3" /> },
  { id: "long-reads", label: "Long Reads", icon: <BookOpen className="h-3 w-3" /> },
  { id: "quick-reads", label: "Quick", icon: <Zap className="h-3 w-3" /> },
];

export function FilterChips({ active, onChange, unreadCount, todayCount }: FilterChipsProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {CHIPS.map((chip) => {
        const count = chip.id === "unread" ? unreadCount : chip.id === "today" ? todayCount : undefined;
        return (
          <button
            key={chip.id}
            onClick={() => onChange(chip.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              active === chip.id
                ? "bg-primary text-white shadow-sm"
                : "bg-bg-card text-text-muted border border-border hover:border-primary/40 hover:text-text"
            }`}
          >
            {chip.icon}
            {chip.label}
            {count !== undefined && count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                active === chip.id ? "bg-white/20" : "bg-bg-hover"
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function applyFilter<T extends { id: string; summary: string; publishedAt: string }>(
  items: T[],
  filter: FilterChipType,
  readIds: Set<string>
): T[] {
  const now = Date.now();
  switch (filter) {
    case "today":
      return items.filter((i) => now - new Date(i.publishedAt).getTime() < 24 * 60 * 60 * 1000);
    case "this-week":
      return items.filter((i) => now - new Date(i.publishedAt).getTime() < 7 * 24 * 60 * 60 * 1000);
    case "unread":
      return items.filter((i) => !readIds.has(i.id));
    case "long-reads":
      return items.filter((i) => i.summary.split(/\s+/).length > 40);
    case "quick-reads":
      return items.filter((i) => i.summary.split(/\s+/).length <= 40);
    default:
      return items;
  }
}
