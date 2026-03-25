"use client";

import { ArrowUpDown, Brain, Clock, TrendingUp, Star } from "lucide-react";

export type SortMode = "smart" | "newest" | "oldest" | "trending";

interface SmartSortProps {
  active: SortMode;
  onChange: (mode: SortMode) => void;
}

const SORT_OPTIONS: { id: SortMode; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "smart", label: "Smart", icon: <Brain className="h-3.5 w-3.5" />, description: "Personalized based on your reading habits" },
  { id: "newest", label: "Newest", icon: <Clock className="h-3.5 w-3.5" />, description: "Most recent first" },
  { id: "oldest", label: "Oldest", icon: <Clock className="h-3.5 w-3.5 rotate-180" />, description: "Oldest first" },
  { id: "trending", label: "Popular", icon: <TrendingUp className="h-3.5 w-3.5" />, description: "Trending and engaging content" },
];

export function SmartSortButton({ active, onChange }: SmartSortProps) {
  return (
    <div className="group/sort relative">
      <button
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Sort order"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {SORT_OPTIONS.find((o) => o.id === active)?.label}
        </span>
      </button>
      <div className="absolute right-0 top-full z-20 mt-1 hidden w-56 rounded-xl border border-border bg-bg-card p-1.5 shadow-xl group-hover/sort:block">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
              active === opt.id
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-bg-hover hover:text-text"
            }`}
          >
            {opt.icon}
            <div>
              <div className="text-xs font-medium">{opt.label}</div>
              <div className="text-[10px] text-text-muted">{opt.description}</div>
            </div>
            {active === opt.id && <Star className="ml-auto h-3 w-3 fill-primary text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}

interface BaseFeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface UserPreferences {
  bookmarkedIds: Set<string>;
  readIds: Set<string>;
}

export function smartSort<T extends BaseFeedItem>(items: T[], mode: SortMode, prefs: UserPreferences): T[] {
  if (items.length === 0) return items;

  switch (mode) {
    case "newest":
      return [...items].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    case "oldest":
      return [...items].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    case "trending":
      return sortByTrending(items, prefs);
    case "smart":
    default:
      return sortSmart(items, prefs);
  }
}

function sortByTrending<T extends BaseFeedItem>(items: T[], prefs: UserPreferences): T[] {
  const now = Date.now();
  return [...items].sort((a, b) => {
    const scoreA = trendScore(a, now, prefs);
    const scoreB = trendScore(b, now, prefs);
    return scoreB - scoreA;
  });
}

function trendScore(item: BaseFeedItem, now: number, prefs: UserPreferences): number {
  let score = 0;
  const ageHours = (now - new Date(item.publishedAt).getTime()) / 3600000;
  score += Math.max(0, 50 - ageHours * 2);
  if (prefs.bookmarkedIds.has(item.id)) score += 20;
  if (!prefs.readIds.has(item.id)) score += 15;
  const wordCount = item.summary.split(/\s+/).length;
  if (wordCount > 30) score += 10;
  return score;
}

function sortSmart<T extends BaseFeedItem>(items: T[], prefs: UserPreferences): T[] {
  // Learn source preferences from bookmarks
  const sourceScores: Record<string, number> = {};
  const allItemsBySource: Record<string, number> = {};

  for (const item of items) {
    let domain = item.source;
    try { domain = new URL(item.url).hostname.replace("www.", ""); } catch {}
    allItemsBySource[domain] = (allItemsBySource[domain] || 0) + 1;
    if (prefs.bookmarkedIds.has(item.id)) {
      sourceScores[domain] = (sourceScores[domain] || 0) + 10;
    }
    if (prefs.readIds.has(item.id)) {
      sourceScores[domain] = (sourceScores[domain] || 0) + 2;
    }
  }

  const now = Date.now();
  return [...items].sort((a, b) => {
    const scoreA = personalScore(a, now, prefs, sourceScores);
    const scoreB = personalScore(b, now, prefs, sourceScores);
    return scoreB - scoreA;
  });
}

function personalScore(
  item: BaseFeedItem,
  now: number,
  prefs: UserPreferences,
  sourceScores: Record<string, number>
): number {
  let score = 0;

  // Recency (0-40)
  const ageHours = (now - new Date(item.publishedAt).getTime()) / 3600000;
  score += Math.max(0, 40 - ageHours * 1.5);

  // Unread boost (0-20)
  if (!prefs.readIds.has(item.id)) score += 20;

  // Source affinity from bookmarks (0-30)
  let domain = item.source;
  try { domain = new URL(item.url).hostname.replace("www.", ""); } catch {}
  score += Math.min(30, sourceScores[domain] || 0);

  // Content depth bonus
  const wordCount = item.summary.split(/\s+/).length;
  if (wordCount > 30) score += 5;

  // Engagement title signals
  if (/breaking|launch|release|announce|new\s/i.test(item.title)) score += 8;

  return score;
}
