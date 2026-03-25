"use client";

import { useState, useMemo } from "react";
import { Activity, ChevronDown, ChevronUp, Lightbulb, Clock, Layers, Users, BookOpen } from "lucide-react";

interface FeedItem {
  id: string;
  publishedAt: string;
  source: string;
  read?: boolean;
}

interface FeedHealthScoreProps {
  items: FeedItem[];
  lastRefresh: string; // ISO timestamp
  name: string;
  readIds?: Set<string>;
}

interface SubScore {
  label: string;
  value: number;
  icon: typeof Clock;
}

function computeFreshness(items: FeedItem[], lastRefresh: string): number {
  if (items.length === 0) return 0;

  const now = Date.now();
  const refreshAge = now - new Date(lastRefresh).getTime();
  const hourMs = 3600000;

  // Score based on how recently the feed refreshed (100 if <1hr, decays over 24hrs)
  if (refreshAge <= hourMs) return 100;
  if (refreshAge >= 24 * hourMs) return 0;
  return Math.round(100 * (1 - refreshAge / (24 * hourMs)));
}

function computeVolume(items: FeedItem[]): number {
  if (items.length >= 10) return 100;
  return Math.round((items.length / 10) * 100);
}

function computeDiversity(items: FeedItem[]): number {
  const sources = new Set(items.map((i) => i.source));
  if (sources.size >= 5) return 100;
  return Math.round((sources.size / 5) * 100);
}

function computeEngagement(items: FeedItem[], readIds?: Set<string>): number {
  if (items.length === 0) return 0;
  const readCount = readIds
    ? items.filter((i) => readIds.has(i.id)).length
    : items.filter((i) => i.read).length;
  const ratio = readCount / items.length;
  if (ratio >= 0.5) return 100;
  return Math.round((ratio / 0.5) * 100);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getScoreStroke(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getBarBg(score: number): string {
  if (score >= 80) return "bg-green-400";
  if (score >= 50) return "bg-yellow-400";
  return "bg-red-400";
}

function getBadgeBg(score: number): string {
  if (score >= 80) return "bg-green-400/20 text-green-400";
  if (score >= 50) return "bg-yellow-400/20 text-yellow-400";
  return "bg-red-400/20 text-red-400";
}

function generateTips(subScores: SubScore[]): string[] {
  const sorted = [...subScores].sort((a, b) => a.value - b.value);
  const tips: string[] = [];

  for (const s of sorted) {
    if (tips.length >= 2) break;
    if (s.value >= 80) continue;

    if (s.label === "Freshness") {
      tips.push("Your feed hasn't refreshed in a while -- try refreshing to get the latest content.");
    } else if (s.label === "Volume") {
      tips.push("Add more subscriptions to increase the amount of content in your feed.");
    } else if (s.label === "Diversity") {
      tips.push("Add more sources for diversity -- a wider range keeps your perspective balanced.");
    } else if (s.label === "Engagement") {
      tips.push("Try reading more articles to stay on top of your feed.");
    }
  }

  return tips;
}

export function FeedHealthScore({ items, lastRefresh, name, readIds }: FeedHealthScoreProps) {
  const [expanded, setExpanded] = useState(false);

  const subScores: SubScore[] = useMemo(() => [
    { label: "Freshness", value: computeFreshness(items, lastRefresh), icon: Clock },
    { label: "Volume", value: computeVolume(items), icon: Layers },
    { label: "Diversity", value: computeDiversity(items), icon: Users },
    { label: "Engagement", value: computeEngagement(items, readIds), icon: BookOpen },
  ], [items, lastRefresh, readIds]);

  const overallScore = useMemo(
    () => Math.round(subScores.reduce((sum, s) => sum + s.value, 0) / subScores.length),
    [subScores]
  );

  const tips = useMemo(() => generateTips(subScores), [subScores]);

  const circumference = 2 * Math.PI * 15.5;
  const progress = overallScore / 100;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3"
      >
        {/* Circular progress ring */}
        <div className="relative h-10 w-10 shrink-0">
          <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-border"
            />
            <circle
              cx="18" cy="18" r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${progress * circumference} ${circumference}`}
              strokeLinecap="round"
              className={getScoreStroke(overallScore)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-[10px] font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </span>
          </div>
        </div>

        {/* Label */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-sm font-medium text-text">Feed Health</span>
            <span className="text-xs text-text-muted">{name}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-text-muted">
            {overallScore >= 80
              ? "Your feed is in great shape"
              : overallScore >= 50
              ? "Your feed could use some attention"
              : "Your feed needs improvement"}
          </p>
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {/* Sub-score bars */}
          <div className="space-y-2.5">
            {subScores.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <s.icon className="h-3 w-3 text-text-muted" />
                    <span className="text-xs text-text-muted">{s.label}</span>
                  </div>
                  <span className={`text-xs font-medium ${getScoreColor(s.value)}`}>
                    {s.value}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-border">
                  <div
                    className={`h-1.5 rounded-full transition-all ${getBarBg(s.value)}`}
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          {tips.length > 0 && (
            <div className="mt-3 rounded-lg bg-bg p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-secondary" />
                <span className="text-xs font-semibold text-text">Tips</span>
              </div>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-text-muted">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Tiny inline badge showing just the score number with health color */
export function FeedHealthBadge({
  items,
  lastRefresh,
  readIds,
}: {
  items: FeedItem[];
  lastRefresh: string;
  readIds?: Set<string>;
}) {
  const score = useMemo(() => {
    const freshness = computeFreshness(items, lastRefresh);
    const volume = computeVolume(items);
    const diversity = computeDiversity(items);
    const engagement = computeEngagement(items, readIds);
    return Math.round((freshness + volume + diversity + engagement) / 4);
  }, [items, lastRefresh, readIds]);

  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${getBadgeBg(score)}`}
      title={`Feed health: ${score}/100`}
    >
      {score}
    </span>
  );
}
