"use client";

import { useMemo } from "react";
import { TrendingUp, Clock, Flame, BarChart2 } from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

interface TrendingTabProps {
  allItems: FeedItem[];
  readIds: Set<string>;
  bookmarkedIds: Set<string>;
}

interface TrendingItem extends FeedItem {
  score: number;
  reasons: string[];
}

export function computeTrending(
  allItems: FeedItem[],
  readIds: Set<string>,
  bookmarkedIds: Set<string>
): TrendingItem[] {
  if (allItems.length === 0) return [];

  const now = Date.now();
  const scored: TrendingItem[] = allItems.map((item) => {
    let score = 0;
    const reasons: string[] = [];

    // Recency boost — newer items score higher (0-40 points)
    const ageHours = (now - new Date(item.publishedAt).getTime()) / 3600000;
    const recencyScore = Math.max(0, 40 - ageHours * 2);
    score += recencyScore;
    if (recencyScore > 30) reasons.push("Just published");

    // Engagement signal — bookmarked items indicate quality sources
    if (bookmarkedIds.has(item.id)) {
      score += 15;
      reasons.push("Bookmarked");
    }

    // Unread boost — prioritize items user hasn't seen
    if (!readIds.has(item.id)) {
      score += 10;
      reasons.push("Unread");
    }

    // Source diversity — items from sources with fewer items get a boost
    // (handled outside this map)

    // Content quality signals
    const wordCount = item.summary.split(/\s+/).length;
    if (wordCount > 30) {
      score += 10;
      reasons.push("In-depth");
    }

    // Title engagement — questions, how-tos, numbers tend to be more engaging
    const engagingPatterns = [
      /^how\s+to\b/i,
      /^why\s+/i,
      /^what\s+/i,
      /\d+\s+(?:ways|tips|things|reasons|steps)/i,
      /breaking/i,
      /exclusive/i,
      /launch/i,
      /announce/i,
      /release/i,
      /new\s+/i,
    ];
    for (const pattern of engagingPatterns) {
      if (pattern.test(item.title)) {
        score += 5;
        if (!reasons.includes("Engaging title")) reasons.push("Engaging title");
        break;
      }
    }

    return { ...item, score, reasons };
  });

  // Source diversity bonus — less common sources get boosted
  const sourceCounts: Record<string, number> = {};
  for (const item of scored) {
    let domain = item.source;
    try { domain = new URL(item.url).hostname; } catch {}
    sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
  }
  const maxSourceCount = Math.max(...Object.values(sourceCounts));
  for (const item of scored) {
    let domain = item.source;
    try { domain = new URL(item.url).hostname; } catch {}
    const count = sourceCounts[domain] || 1;
    const diversityBonus = Math.round((1 - count / maxSourceCount) * 15);
    if (diversityBonus > 5) {
      item.score += diversityBonus;
      item.reasons.push("Unique source");
    }
  }

  // Sort by score, take top items
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

export function TrendingBadge({ reasons }: { reasons: string[] }) {
  const primary = reasons[0];
  if (!primary) return null;

  const icon = primary === "Just published" ? (
    <Clock className="h-3 w-3" />
  ) : primary === "Bookmarked" ? (
    <Flame className="h-3 w-3" />
  ) : primary === "In-depth" ? (
    <BarChart2 className="h-3 w-3" />
  ) : (
    <TrendingUp className="h-3 w-3" />
  );

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
      {icon}
      {primary}
    </span>
  );
}

export function TrendingHeader({ count }: { count: number }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <TrendingUp className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold text-text">Trending</span>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
        {count} items
      </span>
    </div>
  );
}
