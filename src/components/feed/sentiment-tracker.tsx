"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Smile,
  Frown,
  Meh,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import type { FeedItem } from "@/lib/feed-types";

// --- Types ---

interface SentimentTrackerProps {
  items: FeedItem[];
}

type SentimentLabel = "positive" | "neutral" | "negative";

interface ArticleSentiment {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  score: number; // -1 to 1
  label: SentimentLabel;
}

interface DaySentiment {
  date: string;
  avgScore: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
}

interface SourceSentiment {
  source: string;
  avgScore: number;
  count: number;
  positivePercent: number;
  negativePercent: number;
}

// --- Keyword lists ---

const POSITIVE_WORDS = new Set([
  "breakthrough", "success", "growth", "innovative", "record", "launch",
  "award", "improve", "profit", "advance", "milestone", "exciting",
]);

const NEGATIVE_WORDS = new Set([
  "crash", "decline", "layoff", "scandal", "crisis", "failure",
  "lawsuit", "controversy", "risk", "warning", "threat", "collapse",
]);

// --- Sentiment analysis ---

function analyzeSentiment(text: string): { score: number; label: SentimentLabel } {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter(Boolean);

  let positiveHits = 0;
  let negativeHits = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveHits++;
    if (NEGATIVE_WORDS.has(word)) negativeHits++;
  }

  const total = positiveHits + negativeHits;
  if (total === 0) return { score: 0, label: "neutral" };

  const score = (positiveHits - negativeHits) / total;
  const label: SentimentLabel =
    score > 0.1 ? "positive" : score < -0.1 ? "negative" : "neutral";

  return { score, label };
}

function analyzeArticles(items: FeedItem[]): ArticleSentiment[] {
  return items.map((item) => {
    const combined = `${item.title} ${item.summary}`;
    const { score, label } = analyzeSentiment(combined);
    return { id: item.id, title: item.title, source: item.source, publishedAt: item.publishedAt, score, label };
  });
}

function computeDailySentiment(articles: ArticleSentiment[]): DaySentiment[] {
  const today = new Date();
  const dayMap = new Map<string, ArticleSentiment[]>();

  for (const a of articles) {
    const day = a.publishedAt.split("T")[0];
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(a);
  }

  const days: DaySentiment[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const group = dayMap.get(key) || [];

    const avgScore = group.length > 0
      ? group.reduce((sum, a) => sum + a.score, 0) / group.length
      : 0;

    days.push({
      date: key,
      avgScore,
      positiveCount: group.filter((a) => a.label === "positive").length,
      neutralCount: group.filter((a) => a.label === "neutral").length,
      negativeCount: group.filter((a) => a.label === "negative").length,
    });
  }

  return days;
}

function computeSourceSentiment(articles: ArticleSentiment[]): SourceSentiment[] {
  const sourceMap = new Map<string, ArticleSentiment[]>();

  for (const a of articles) {
    if (!sourceMap.has(a.source)) sourceMap.set(a.source, []);
    sourceMap.get(a.source)!.push(a);
  }

  return Array.from(sourceMap.entries())
    .map(([source, group]) => {
      const avgScore = group.reduce((sum, a) => sum + a.score, 0) / group.length;
      const positivePercent = Math.round((group.filter((a) => a.label === "positive").length / group.length) * 100);
      const negativePercent = Math.round((group.filter((a) => a.label === "negative").length / group.length) * 100);
      return { source, avgScore, count: group.length, positivePercent, negativePercent };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function generateAlerts(
  articles: ArticleSentiment[],
  dailySentiment: DaySentiment[]
): string[] {
  const alerts: string[] = [];

  // Today's sentiment
  const todayKey = new Date().toISOString().split("T")[0];
  const todayArticles = articles.filter((a) => a.publishedAt.startsWith(todayKey));
  if (todayArticles.length >= 3) {
    const negativeRatio = todayArticles.filter((a) => a.label === "negative").length / todayArticles.length;
    const positiveRatio = todayArticles.filter((a) => a.label === "positive").length / todayArticles.length;
    if (negativeRatio > 0.5) {
      alerts.push("Your feed is unusually negative today");
    } else if (positiveRatio > 0.5) {
      alerts.push("Your feed is mostly positive today");
    }
  }

  // Weekly trend
  const recentDays = dailySentiment.slice(-7);
  const olderDays = dailySentiment.slice(0, 7);

  const recentAvg = recentDays.reduce((s, d) => s + d.avgScore, 0) / Math.max(recentDays.length, 1);
  const olderAvg = olderDays.reduce((s, d) => s + d.avgScore, 0) / Math.max(olderDays.length, 1);

  if (recentAvg - olderAvg > 0.15) {
    alerts.push("Positive sentiment trending up this week");
  } else if (olderAvg - recentAvg > 0.15) {
    alerts.push("Sentiment has been trending more negative this week");
  }

  return alerts;
}

// --- Sub-components ---

function SentimentTimeline({ days }: { days: DaySentiment[] }) {
  const width = 280;
  const height = 80;
  const padding = { top: 8, right: 8, bottom: 16, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const midY = padding.top + chartH / 2;

  const stepX = chartW / Math.max(days.length - 1, 1);

  const maxAbs = Math.max(...days.map((d) => Math.abs(d.avgScore)), 0.5);

  const points = days.map((d, i) => ({
    x: padding.left + i * stepX,
    y: midY - (d.avgScore / maxAbs) * (chartH / 2),
    score: d.avgScore,
    date: d.date,
  }));

  // Split into positive and negative paths
  const positivePath = points
    .map((p, i) => {
      const clampedY = Math.min(p.y, midY);
      return `${i === 0 ? "M" : "L"} ${p.x} ${clampedY}`;
    })
    .join(" ");

  const positiveArea = `${positivePath} L ${points[points.length - 1].x} ${midY} L ${points[0].x} ${midY} Z`;

  const negativePath = points
    .map((p, i) => {
      const clampedY = Math.max(p.y, midY);
      return `${i === 0 ? "M" : "L"} ${p.x} ${clampedY}`;
    })
    .join(" ");

  const negativeArea = `${negativePath} L ${points[points.length - 1].x} ${midY} L ${points[0].x} ${midY} Z`;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-xs font-medium text-text">Sentiment Timeline</span>
        <span className="text-[10px] text-text-muted">Last 14 days</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full">
        <defs>
          <linearGradient id="pos-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="neg-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {/* Neutral zone */}
        <rect
          x={padding.left}
          y={midY - 4}
          width={chartW}
          height={8}
          rx={2}
          fill="#94a3b8"
          opacity={0.08}
        />
        {/* Center line */}
        <line
          x1={padding.left}
          y1={midY}
          x2={padding.left + chartW}
          y2={midY}
          stroke="#94a3b8"
          strokeWidth="0.5"
          strokeDasharray="3 3"
        />
        {/* Positive area */}
        <path d={positiveArea} fill="url(#pos-gradient)" />
        {/* Negative area */}
        <path d={negativeArea} fill="url(#neg-gradient)" />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="2.5"
            fill="#6366f1"
          />
        )}
        {/* Labels */}
        <text x={padding.left} y={height - 2} className="fill-text-muted text-[7px]">
          14d ago
        </text>
        <text x={width - padding.right} y={height - 2} textAnchor="end" className="fill-text-muted text-[7px]">
          Today
        </text>
        <text x={padding.left - 2} y={padding.top + 4} className="fill-emerald-500 text-[6px]">
          +
        </text>
        <text x={padding.left - 2} y={height - padding.bottom - 1} className="fill-red-500 text-[6px]">
          -
        </text>
      </svg>
    </div>
  );
}

function SentimentDistribution({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const total = positive + neutral + negative;
  if (total === 0) return null;

  const pPct = Math.round((positive / total) * 100);
  const nPct = Math.round((negative / total) * 100);
  const neuPct = 100 - pPct - nPct;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Minus className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-medium text-text">Sentiment Distribution</span>
      </div>
      {/* Stacked bar */}
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        {pPct > 0 && (
          <div
            className="flex items-center justify-center bg-emerald-500 transition-all duration-500"
            style={{ width: `${pPct}%` }}
          >
            {pPct >= 10 && (
              <span className="text-[9px] font-medium text-white">{pPct}%</span>
            )}
          </div>
        )}
        {neuPct > 0 && (
          <div
            className="flex items-center justify-center bg-slate-300 dark:bg-slate-600 transition-all duration-500"
            style={{ width: `${neuPct}%` }}
          >
            {neuPct >= 10 && (
              <span className="text-[9px] font-medium text-slate-700 dark:text-slate-200">{neuPct}%</span>
            )}
          </div>
        )}
        {nPct > 0 && (
          <div
            className="flex items-center justify-center bg-red-500 transition-all duration-500"
            style={{ width: `${nPct}%` }}
          >
            {nPct >= 10 && (
              <span className="text-[9px] font-medium text-white">{nPct}%</span>
            )}
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Positive ({positive})
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          Neutral ({neutral})
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          Negative ({negative})
        </span>
      </div>
    </div>
  );
}

function MoodRing({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const total = positive + neutral + negative;
  if (total === 0) return null;

  const pPct = positive / total;
  const nPct = negative / total;

  // Dominant mood
  let mood: SentimentLabel = "neutral";
  let moodColor = "#94a3b8";
  let MoodIcon = Meh;

  if (pPct > nPct && pPct > 0.4) {
    mood = "positive";
    moodColor = "#10b981";
    MoodIcon = Smile;
  } else if (nPct > pPct && nPct > 0.4) {
    mood = "negative";
    moodColor = "#ef4444";
    MoodIcon = Frown;
  }

  // Build conic gradient segments
  const posAngle = pPct * 360;
  const neuAngle = (1 - pPct - nPct) * 360;
  const negAngle = nPct * 360;

  const size = 90;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 38;
  const innerR = 28;

  function polarToXY(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(startAngle: number, endAngle: number) {
    const oStart = polarToXY(startAngle, outerR);
    const oEnd = polarToXY(endAngle, outerR);
    const iEnd = polarToXY(endAngle, innerR);
    const iStart = polarToXY(startAngle, innerR);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${oStart.x} ${oStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${oEnd.x} ${oEnd.y}`,
      `L ${iEnd.x} ${iEnd.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${iStart.x} ${iStart.y}`,
      "Z",
    ].join(" ");
  }

  const segments: { color: string; start: number; end: number }[] = [];
  let cursor = 0;
  if (posAngle > 0.5) {
    segments.push({ color: "#10b981", start: cursor, end: cursor + posAngle });
    cursor += posAngle;
  }
  if (neuAngle > 0.5) {
    segments.push({ color: "#94a3b8", start: cursor, end: cursor + neuAngle });
    cursor += neuAngle;
  }
  if (negAngle > 0.5) {
    segments.push({ color: "#ef4444", start: cursor, end: cursor + negAngle });
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-24 w-24">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={arcPath(seg.start, seg.end)}
            fill={seg.color}
            opacity={0.75}
            className="transition-opacity hover:opacity-100"
          />
        ))}
        {/* Center icon + label */}
        <foreignObject x={cx - 14} y={cy - 14} width={28} height={28}>
          <div className="flex h-full w-full items-center justify-center">
            <MoodIcon className="h-5 w-5" style={{ color: moodColor }} />
          </div>
        </foreignObject>
      </svg>
      <span
        className="mt-1 text-xs font-semibold capitalize"
        style={{ color: moodColor }}
      >
        {mood}
      </span>
      <span className="text-[10px] text-text-muted">Overall Mood</span>
    </div>
  );
}

function SourceSentimentChart({ sources }: { sources: SourceSentiment[] }) {
  if (sources.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <TrendingDown className="h-3.5 w-3.5 text-red-400" />
        <span className="text-xs font-medium text-text">Source Sentiment</span>
      </div>
      <div className="space-y-2">
        {sources.map((s) => {
          const neutralPct = 100 - s.positivePercent - s.negativePercent;
          return (
            <div key={s.source}>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="truncate text-[11px] text-text-muted">{s.source}</span>
                <span className="ml-2 shrink-0 text-[10px] text-text-muted">{s.count} articles</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {s.positivePercent > 0 && (
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{ width: `${s.positivePercent}%` }}
                  />
                )}
                {neutralPct > 0 && (
                  <div
                    className="bg-slate-300 dark:bg-slate-600 transition-all duration-500"
                    style={{ width: `${neutralPct}%` }}
                  />
                )}
                {s.negativePercent > 0 && (
                  <div
                    className="bg-red-500 transition-all duration-500"
                    style={{ width: `${s.negativePercent}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SentimentAlerts({ alerts }: { alerts: string[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const isNegative = alert.toLowerCase().includes("negative");
        return (
          <div
            key={i}
            className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${
              isNegative
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{alert}</span>
          </div>
        );
      })}
    </div>
  );
}

// --- Main component ---

export function SentimentTracker({ items }: SentimentTrackerProps) {
  const [expanded, setExpanded] = useState(false);

  const analysis = useMemo(() => {
    const articles = analyzeArticles(items);
    const daily = computeDailySentiment(articles);
    const sources = computeSourceSentiment(articles);
    const alerts = generateAlerts(articles, daily);

    const positive = articles.filter((a) => a.label === "positive").length;
    const neutral = articles.filter((a) => a.label === "neutral").length;
    const negative = articles.filter((a) => a.label === "negative").length;

    return { articles, daily, sources, alerts, positive, neutral, negative };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header / toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-bg-hover/30"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10">
            <Smile className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <h3 className="text-sm font-semibold text-text">Sentiment Tracker</h3>
          <span className="text-[10px] text-text-muted">
            {analysis.positive}+ {analysis.neutral}= {analysis.negative}-
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-4 border-t border-border px-4 py-4">
          {/* Alerts */}
          <SentimentAlerts alerts={analysis.alerts} />

          {/* Mood Ring + Distribution row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-center rounded-xl border border-border bg-bg p-3">
              <MoodRing
                positive={analysis.positive}
                neutral={analysis.neutral}
                negative={analysis.negative}
              />
            </div>
            <div className="rounded-xl border border-border bg-bg p-3">
              <SentimentDistribution
                positive={analysis.positive}
                neutral={analysis.neutral}
                negative={analysis.negative}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-border bg-bg p-3">
            <SentimentTimeline days={analysis.daily} />
          </div>

          {/* Source sentiment */}
          <div className="rounded-xl border border-border bg-bg p-3">
            <SourceSentimentChart sources={analysis.sources} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Inline badge ---

export function SentimentBadge({ items }: { items: { title: string; summary: string }[] }) {
  const overall = useMemo(() => {
    if (items.length === 0) return null;

    let totalScore = 0;
    for (const item of items) {
      const { score } = analyzeSentiment(`${item.title} ${item.summary}`);
      totalScore += score;
    }

    const avg = totalScore / items.length;
    if (avg > 0.1) return { label: "Positive", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", Icon: Smile };
    if (avg < -0.1) return { label: "Negative", color: "bg-red-500/10 text-red-600 dark:text-red-400", Icon: Frown };
    return { label: "Neutral", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400", Icon: Meh };
  }, [items]);

  if (!overall) return null;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${overall.color}`}>
      <overall.Icon className="h-3 w-3" />
      {overall.label}
    </span>
  );
}
