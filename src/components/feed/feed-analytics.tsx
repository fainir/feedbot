"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  X,
  BookOpen,
  TrendingUp,
  Flame,
  Star,
  Clock,
  Hash,
  Activity,
} from "lucide-react";

// --- Types ---

interface ReadHistoryEntry {
  id: string;
  title: string;
  source: string;
  readAt: string; // ISO date
}

interface AnalyticsData {
  // Heatmap
  heatmap: { date: string; count: number }[];
  // Top sources
  topSources: { source: string; count: number; color: string }[];
  // Stats
  totalArticles: number;
  avgPerDay: number;
  longestStreak: number;
  favoriteSource: string;
  // Topic distribution
  topics: { label: string; count: number; color: string; percent: number }[];
  // Velocity (articles per day, last 14 days)
  velocity: number[];
}

// --- Topic keywords ---

const TOPIC_MAP: Record<string, string[]> = {
  AI: ["ai", "machine learning", "llm", "gpt", "neural", "deep learning", "model", "openai", "anthropic", "chatgpt"],
  Dev: ["developer", "programming", "code", "github", "api", "framework", "typescript", "javascript", "rust", "python"],
  Startup: ["startup", "funding", "series", "venture", "founder", "launch", "seed", "valuation", "ipo", "unicorn"],
  Crypto: ["crypto", "bitcoin", "ethereum", "blockchain", "web3", "defi", "nft", "token"],
  Science: ["research", "study", "scientist", "discovery", "space", "quantum", "physics", "biology", "climate"],
  Business: ["business", "revenue", "market", "acquisition", "profit", "ceo", "enterprise", "saas", "growth"],
  Design: ["design", "ui", "ux", "figma", "css", "interface", "typography", "accessibility"],
  Security: ["security", "hack", "vulnerability", "breach", "privacy", "encryption", "malware", "cyber"],
};

const SOURCE_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316",
];

const TOPIC_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

// --- Helper functions ---

function getReadHistory(): ReadHistoryEntry[] {
  try {
    // Try feedbot-read (set of IDs) + feedbot-bookmark-items (array with metadata)
    const readRaw = localStorage.getItem("feedbot-read");
    const readIds: string[] = readRaw ? JSON.parse(readRaw) : [];

    // Try to get item details from bookmark storage and reading goals history
    const bookmarkRaw = localStorage.getItem("feedbot-bookmark-items");
    const bookmarks: { id: string; title?: string; source?: string; publishedAt?: string }[] =
      bookmarkRaw ? JSON.parse(bookmarkRaw) : [];

    // Try reading goals history for date info
    const goalsRaw = localStorage.getItem("feedbot-reading-goals");
    const goalsData: { history?: Record<string, number> } = goalsRaw ? JSON.parse(goalsRaw) : {};

    // Build a map of known items from bookmarks
    const itemMap = new Map<string, { title: string; source: string; readAt: string }>();
    for (const bm of bookmarks) {
      if (bm.id) {
        itemMap.set(bm.id, {
          title: bm.title || "Untitled",
          source: bm.source || "Unknown",
          readAt: bm.publishedAt || new Date().toISOString(),
        });
      }
    }

    // Build history entries from readIds
    const entries: ReadHistoryEntry[] = [];
    for (const id of readIds) {
      const known = itemMap.get(id);
      entries.push({
        id,
        title: known?.title || "Article",
        source: known?.source || "Unknown",
        readAt: known?.readAt || new Date().toISOString(),
      });
    }

    // If we have goals history but few entries, synthesize from goals
    if (entries.length < 5 && goalsData.history) {
      for (const [date, count] of Object.entries(goalsData.history)) {
        for (let i = 0; i < count; i++) {
          const syntheticId = `synth-${date}-${i}`;
          if (!entries.find((e) => e.id === syntheticId)) {
            entries.push({
              id: syntheticId,
              title: "Article",
              source: "Various",
              readAt: `${date}T12:00:00Z`,
            });
          }
        }
      }
    }

    // If still empty, generate demo data for a good first experience
    if (entries.length === 0) {
      return generateDemoData();
    }

    return entries;
  } catch {
    return generateDemoData();
  }
}

function generateDemoData(): ReadHistoryEntry[] {
  const entries: ReadHistoryEntry[] = [];
  const sources = ["TechCrunch", "Hacker News", "The Verge", "Ars Technica", "Wired", "MIT Tech Review"];
  const topics = [
    "New AI model breaks benchmarks",
    "Startup raises $50M Series B",
    "Developer tools for TypeScript",
    "Quantum computing breakthrough",
    "Blockchain adoption in enterprise",
    "Design systems at scale",
    "Security vulnerability in npm",
    "Climate research findings",
    "Machine learning in healthcare",
    "Python 4.0 release notes",
    "React Server Components deep dive",
    "Rust adoption at Google",
  ];
  const today = new Date();

  for (let d = 0; d < 30; d++) {
    const count = Math.floor(Math.random() * 6) + (d % 7 === 0 ? 0 : 1);
    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      entries.push({
        id: `demo-${d}-${i}`,
        title: topics[Math.floor(Math.random() * topics.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        readAt: date.toISOString(),
      });
    }
  }
  return entries;
}

function computeAnalytics(entries: ReadHistoryEntry[]): AnalyticsData {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // --- Heatmap: last 30 days ---
  const dayCounts: Record<string, number> = {};
  for (const entry of entries) {
    const day = entry.readAt.split("T")[0];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }

  const heatmap: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    heatmap.push({ date: key, count: dayCounts[key] || 0 });
  }

  // --- Top sources ---
  const sourceCounts: Record<string, number> = {};
  for (const entry of entries) {
    sourceCounts[entry.source] = (sourceCounts[entry.source] || 0) + 1;
  }
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count], i) => ({
      source,
      count,
      color: SOURCE_COLORS[i % SOURCE_COLORS.length],
    }));

  // --- Stats ---
  const totalArticles = entries.length;
  const daysWithReads = new Set(entries.map((e) => e.readAt.split("T")[0])).size;
  const avgPerDay = daysWithReads > 0 ? Math.round((totalArticles / Math.max(daysWithReads, 1)) * 10) / 10 : 0;

  // Longest streak
  const sortedDays = [...new Set(entries.map((e) => e.readAt.split("T")[0]))].sort();
  let longestStreak = 0;
  let currentStreak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);
  if (sortedDays.length === 0) longestStreak = 0;

  const favoriteSource = topSources.length > 0 ? topSources[0].source : "N/A";

  // --- Topics ---
  const topicCounts: Record<string, number> = {};
  for (const entry of entries) {
    const lower = entry.title.toLowerCase();
    let matched = false;
    for (const [topic, keywords] of Object.entries(TOPIC_MAP)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      topicCounts["Other"] = (topicCounts["Other"] || 0) + 1;
    }
  }
  const topicTotal = Object.values(topicCounts).reduce((a, b) => a + b, 0);
  const topics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count], i) => ({
      label,
      count,
      color: TOPIC_COLORS[i % TOPIC_COLORS.length],
      percent: topicTotal > 0 ? Math.round((count / topicTotal) * 100) : 0,
    }));

  // --- Velocity: last 14 days ---
  const velocity: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    velocity.push(dayCounts[key] || 0);
  }

  return { heatmap, topSources, totalArticles, avgPerDay, longestStreak, favoriteSource, topics, velocity };
}

// --- Sub-components ---

function Heatmap({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  function getLevel(count: number): number {
    if (count === 0) return 0;
    if (count <= maxCount * 0.25) return 1;
    if (count <= maxCount * 0.5) return 2;
    if (count <= maxCount * 0.75) return 3;
    return 4;
  }

  const levelColors = [
    "bg-border dark:bg-zinc-800",
    "bg-emerald-200 dark:bg-emerald-900",
    "bg-emerald-300 dark:bg-emerald-700",
    "bg-emerald-400 dark:bg-emerald-500",
    "bg-emerald-500 dark:bg-emerald-400",
  ];

  // Arrange into rows of 7 (weeks)
  const rows: { date: string; count: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    rows.push(data.slice(i, i + 7));
  }
  // Pad last row if needed
  while (rows.length > 0 && rows[rows.length - 1].length < 7) {
    rows[rows.length - 1].push({ date: "", count: 0 });
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-xs font-medium text-text">Reading Activity</span>
        <span className="text-[10px] text-text-muted">Last 30 days</span>
      </div>
      <div className="flex flex-col gap-[3px]">
        {/* Transpose: show 7 rows (days) x N columns (weeks) for GitHub-style */}
        {Array.from({ length: 7 }, (_, dayIdx) => (
          <div key={dayIdx} className="flex gap-[3px]">
            {rows.map((week, weekIdx) => {
              const cell = week[dayIdx];
              if (!cell || !cell.date) {
                return <div key={weekIdx} className="h-3 w-3 rounded-[2px] bg-transparent" />;
              }
              const level = getLevel(cell.count);
              return (
                <div
                  key={weekIdx}
                  className={`h-3 w-3 rounded-[2px] transition-colors ${levelColors[level]}`}
                  title={`${cell.date}: ${cell.count} articles`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-end gap-1 text-[9px] text-text-muted">
        <span>Less</span>
        {levelColors.map((c, i) => (
          <div key={i} className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function TopSourcesChart({ sources }: { sources: { source: string; count: number; color: string }[] }) {
  const maxCount = Math.max(...sources.map((s) => s.count), 1);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Star className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-medium text-text">Top Sources</span>
      </div>
      <div className="space-y-2">
        {sources.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-20 truncate text-[11px] text-text-muted">{s.source}</span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-border/50 dark:bg-zinc-800">
              <div
                className="absolute inset-y-0 left-0 rounded-md transition-all duration-700 ease-out"
                style={{
                  width: `${(s.count / maxCount) * 100}%`,
                  backgroundColor: s.color,
                  opacity: 0.8,
                }}
              />
            </div>
            <span className="w-6 text-right text-[11px] font-medium text-text">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsCards({
  totalArticles,
  avgPerDay,
  longestStreak,
  favoriteSource,
}: {
  totalArticles: number;
  avgPerDay: number;
  longestStreak: number;
  favoriteSource: string;
}) {
  const stats = [
    { label: "Total Read", value: totalArticles.toString(), icon: BookOpen, color: "text-indigo-500" },
    { label: "Avg / Day", value: avgPerDay.toString(), icon: Clock, color: "text-cyan-500" },
    { label: "Longest Streak", value: `${longestStreak}d`, icon: Flame, color: "text-orange-500" },
    { label: "Top Source", value: favoriteSource, icon: Star, color: "text-amber-500", truncate: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-bg p-2.5 transition-colors hover:bg-bg-hover/50"
        >
          <div className={`shrink-0 ${s.color}`}>
            <s.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-semibold text-text ${s.truncate ? "truncate" : ""}`}>{s.value}</div>
            <div className="text-[10px] text-text-muted">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopicDonut({ topics }: { topics: { label: string; count: number; color: string; percent: number }[] }) {
  // Build SVG donut chart
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 40;
  const innerR = 26;

  let currentAngle = -90; // Start from top
  const segments = topics.map((t) => {
    const angle = (t.percent / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...t, startAngle, angle };
  });

  function polarToCartesian(centerX: number, centerY: number, radius: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: centerX + radius * Math.cos(rad), y: centerY + radius * Math.sin(rad) };
  }

  function describeArc(startAngle: number, endAngle: number, outerRadius: number, innerRadius: number) {
    const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
    const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
    const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Hash className="h-3.5 w-3.5 text-violet-500" />
        <span className="text-xs font-medium text-text">Topic Breakdown</span>
      </div>
      <div className="flex items-center gap-4">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-24 w-24 shrink-0">
          {segments.map((seg, i) => {
            if (seg.angle < 0.5) return null;
            // Add small gap between segments
            const gap = 1;
            const endAngle = seg.startAngle + seg.angle - gap;
            return (
              <path
                key={i}
                d={describeArc(seg.startAngle + gap / 2, endAngle, outerR, innerR)}
                fill={seg.color}
                opacity={0.85}
                className="transition-opacity hover:opacity-100"
              >
                <title>{`${seg.label}: ${seg.percent}%`}</title>
              </path>
            );
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" className="fill-text text-[10px] font-bold">
            {topics.reduce((a, t) => a + t.count, 0)}
          </text>
          <text x={cx} y={cy + 7} textAnchor="middle" className="fill-text-muted text-[7px]">
            articles
          </text>
        </svg>
        <div className="flex flex-1 flex-col gap-1.5">
          {topics.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: t.color }} />
              <span className="flex-1 truncate text-[11px] text-text">{t.label}</span>
              <span className="text-[10px] font-medium text-text-muted">{t.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const width = 200;
  const height = 40;
  const padding = 2;
  const stepX = (width - padding * 2) / (data.length - 1);

  const points = data.map((v, i) => ({
    x: padding + i * stepX,
    y: height - padding - ((v / max) * (height - padding * 2)),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-cyan-500" />
        <span className="text-xs font-medium text-text">Reading Velocity</span>
        <span className="text-[10px] text-text-muted">Last 14 days</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full">
        <defs>
          <linearGradient id="sparkline-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkline-gradient)" />
        <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill="#06b6d4" />
      </svg>
      <div className="flex items-center justify-between text-[9px] text-text-muted">
        <span>14d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

// --- Main component ---

export function FeedAnalytics() {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (open) {
      const entries = getReadHistory();
      setAnalytics(computeAnalytics(entries));
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative mx-4 max-h-[85vh] w-full max-w-lg animate-in fade-in zoom-in-95 overflow-y-auto rounded-2xl border border-border bg-bg-card p-5 shadow-2xl duration-200">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text">Feed Analytics</h2>
              <p className="text-[10px] text-text-muted">Your reading habits at a glance</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {analytics ? (
          <div className="space-y-5">
            {/* Stats Cards */}
            <StatsCards
              totalArticles={analytics.totalArticles}
              avgPerDay={analytics.avgPerDay}
              longestStreak={analytics.longestStreak}
              favoriteSource={analytics.favoriteSource}
            />

            {/* Heatmap */}
            <div className="rounded-xl border border-border bg-bg p-3">
              <Heatmap data={analytics.heatmap} />
            </div>

            {/* Two-column: Sources + Topics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-bg p-3">
                <TopSourcesChart sources={analytics.topSources} />
              </div>
              <div className="rounded-xl border border-border bg-bg p-3">
                <TopicDonut topics={analytics.topics} />
              </div>
            </div>

            {/* Sparkline */}
            <div className="rounded-xl border border-border bg-bg p-3">
              <Sparkline data={analytics.velocity} />
            </div>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

// --- Trigger button ---

export function FeedAnalyticsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:text-indigo-500"
    >
      <BarChart3 className="h-3.5 w-3.5" />
      Analytics
    </button>
  );
}

// --- Combined export with internal state ---

export function FeedAnalyticsPanel() {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (open) {
      const entries = getReadHistory();
      setAnalytics(computeAnalytics(entries));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <FeedAnalyticsButton onClick={() => setOpen(true)} />

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative mx-4 max-h-[85vh] w-full max-w-lg animate-in fade-in zoom-in-95 overflow-y-auto rounded-2xl border border-border bg-bg-card p-5 shadow-2xl duration-200">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text">Feed Analytics</h2>
                  <p className="text-[10px] text-text-muted">Your reading habits at a glance</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {analytics ? (
              <div className="space-y-5">
                <StatsCards
                  totalArticles={analytics.totalArticles}
                  avgPerDay={analytics.avgPerDay}
                  longestStreak={analytics.longestStreak}
                  favoriteSource={analytics.favoriteSource}
                />

                <div className="rounded-xl border border-border bg-bg p-3">
                  <Heatmap data={analytics.heatmap} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-bg p-3">
                    <TopSourcesChart sources={analytics.topSources} />
                  </div>
                  <div className="rounded-xl border border-border bg-bg p-3">
                    <TopicDonut topics={analytics.topics} />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-bg p-3">
                  <Sparkline data={analytics.velocity} />
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
