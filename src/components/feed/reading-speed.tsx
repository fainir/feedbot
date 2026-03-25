"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Gauge, Timer, TrendingUp, Zap, Award, ChevronDown, ChevronUp, BookOpen, BarChart3, Lightbulb, Play, Pause, RotateCcw } from "lucide-react";

// --- Types ---

interface ReadingEntry {
  articleId: string;
  title: string;
  wpm: number;
  wordCount: number;
  duration: number; // seconds
  timestamp: number;
}

interface ReadingSpeedData {
  entries: ReadingEntry[];
}

interface ActiveReading {
  articleId: string;
  title: string;
  wordCount: number;
  startTime: number;
}

// --- Storage key ---

const STORAGE_KEY = "feedbot-reading-speed";

// --- Hook: useReadingSpeed ---

export function useReadingSpeed() {
  const [data, setData] = useState<ReadingSpeedData>({ entries: [] });
  const activeRef = useRef<ActiveReading | null>(null);
  const [challengeMode, setChallengeMode] = useState(false);
  const [challengeElapsed, setChallengeElapsed] = useState(0);
  const challengeInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setData(JSON.parse(saved));
    } catch {}
  }, []);

  const save = useCallback((next: ReadingSpeedData) => {
    setData(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const startReading = useCallback(
    (articleId: string, title: string, wordCount: number) => {
      activeRef.current = { articleId, title, wordCount, startTime: Date.now() };
      if (challengeMode) {
        setChallengeElapsed(0);
        challengeInterval.current = setInterval(() => {
          setChallengeElapsed((v) => v + 1);
        }, 1000);
      }
    },
    [challengeMode]
  );

  const stopReading = useCallback(() => {
    const active = activeRef.current;
    if (!active) return null;

    const duration = (Date.now() - active.startTime) / 1000;
    const minutes = duration / 60;
    const wpm = minutes > 0 ? Math.round(active.wordCount / minutes) : 0;

    // Only record if they spent at least 5 seconds and wpm is plausible
    if (duration >= 5 && wpm > 0 && wpm <= 2000) {
      const entry: ReadingEntry = {
        articleId: active.articleId,
        title: active.title,
        wpm,
        wordCount: active.wordCount,
        duration: Math.round(duration),
        timestamp: Date.now(),
      };
      const next = { entries: [...data.entries, entry] };
      save(next);
    }

    activeRef.current = null;
    if (challengeInterval.current) {
      clearInterval(challengeInterval.current);
      challengeInterval.current = null;
    }
    setChallengeElapsed(0);

    return wpm;
  }, [data.entries, save]);

  const toggleChallengeMode = useCallback(() => {
    setChallengeMode((v) => !v);
    if (challengeInterval.current) {
      clearInterval(challengeInterval.current);
      challengeInterval.current = null;
    }
    setChallengeElapsed(0);
  }, []);

  const averageWpm = useMemo(() => {
    if (data.entries.length === 0) return 0;
    const sum = data.entries.reduce((a, e) => a + e.wpm, 0);
    return Math.round(sum / data.entries.length);
  }, [data.entries]);

  return {
    entries: data.entries,
    averageWpm,
    startReading,
    stopReading,
    challengeMode,
    challengeElapsed,
    toggleChallengeMode,
  };
}

// --- Speed zone helpers ---

function getSpeedZone(wpm: number): { label: string; color: string; textColor: string } {
  if (wpm < 150) return { label: "Slow", color: "#ef4444", textColor: "text-red-400" };
  if (wpm < 250) return { label: "Average", color: "#f59e0b", textColor: "text-amber-400" };
  if (wpm < 400) return { label: "Fast", color: "#22c55e", textColor: "text-green-400" };
  return { label: "Speed Reader", color: "#8b5cf6", textColor: "text-violet-400" };
}

function getTips(wpm: number): string[] {
  if (wpm === 0) return ["Start reading articles to track your speed!"];
  if (wpm < 150)
    return [
      "Try skimming headers first to get an overview",
      "Focus on topic sentences — usually the first in each paragraph",
      "Reduce subvocalization by following text with your finger",
      "Practice with shorter, familiar-topic articles first",
    ];
  if (wpm < 250)
    return [
      "Good pace! Try chunking — read groups of 3-4 words at once",
      "Minimize backtracking — trust your comprehension",
      "Use a pointer (cursor or finger) to guide your eyes",
    ];
  if (wpm < 400)
    return [
      "Great speed! Consider slowing down for dense or technical material",
      "Vary your speed — skim intros, slow down for key arguments",
      "Try summarizing articles in your head after reading to check comprehension",
    ];
  return [
    "Exceptional speed! Make sure comprehension stays high",
    "Use speed reading for news, slow down for deep research",
    "Consider taking notes on complex articles to retain more",
  ];
}

// --- SpeedBadge ---

export function SpeedBadge({ wpm }: { wpm: number }) {
  if (wpm === 0) return null;
  const zone = getSpeedZone(wpm);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${zone.textColor}`}
      style={{ backgroundColor: `${zone.color}15` }}
    >
      <Zap className="h-2.5 w-2.5" />
      {wpm} WPM
    </span>
  );
}

// --- Speed Gauge (SVG semi-circle) ---

function SpeedGauge({ wpm, size = 160 }: { wpm: number; size?: number }) {
  const maxWpm = 600;
  const clampedWpm = Math.min(wpm, maxWpm);
  const ratio = clampedWpm / maxWpm;
  const zone = getSpeedZone(wpm);

  // Semi-circle arc
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 16;
  const startAngle = Math.PI;
  const endAngle = 0;
  const sweepAngle = startAngle - (startAngle - endAngle) * ratio;

  const arcPath = (startA: number, endA: number) => {
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy - r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy - r * Math.sin(endA);
    const largeArc = startA - endA > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Zone arcs: Slow 0-150, Average 150-250, Fast 250-400, Speed Reader 400-600
  const zones = [
    { start: 0, end: 150 / maxWpm, color: "#ef4444" },
    { start: 150 / maxWpm, end: 250 / maxWpm, color: "#f59e0b" },
    { start: 250 / maxWpm, end: 400 / maxWpm, color: "#22c55e" },
    { start: 400 / maxWpm, end: 1, color: "#8b5cf6" },
  ];

  // Needle angle
  const needleAngle = Math.PI - ratio * Math.PI;
  const needleLen = r - 10;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Zone background arcs */}
        {zones.map((z, i) => {
          const a1 = Math.PI - z.start * Math.PI;
          const a2 = Math.PI - z.end * Math.PI;
          return (
            <path
              key={i}
              d={arcPath(a1, a2)}
              fill="none"
              stroke={z.color}
              strokeWidth="8"
              strokeLinecap="round"
              opacity={0.2}
            />
          );
        })}

        {/* Active arc */}
        {wpm > 0 && (
          <path
            d={arcPath(Math.PI, sweepAngle)}
            fill="none"
            stroke={zone.color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        )}

        {/* Needle */}
        {wpm > 0 && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke="currentColor"
              strokeWidth="2"
              className="text-text"
            />
            <circle cx={cx} cy={cy} r="4" fill="currentColor" className="text-text" />
          </>
        )}

        {/* Labels */}
        <text x={16} y={cy + 16} fill="currentColor" className="text-text-muted" fontSize="9" textAnchor="start">
          0
        </text>
        <text x={size - 16} y={cy + 16} fill="currentColor" className="text-text-muted" fontSize="9" textAnchor="end">
          600
        </text>
      </svg>

      <div className="mt-1 text-center">
        <div className="text-2xl font-bold text-text">{wpm}</div>
        <div className={`text-xs font-medium ${zone.textColor}`}>{zone.label}</div>
      </div>
    </div>
  );
}

// --- Speed History (line chart) ---

function SpeedHistory({ entries }: { entries: ReadingEntry[] }) {
  const recent = entries.slice(-20);
  if (recent.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-text-muted">
        Read at least 2 articles to see your speed trend
      </div>
    );
  }

  const maxWpm = Math.max(...recent.map((e) => e.wpm));
  const minWpm = Math.min(...recent.map((e) => e.wpm));
  const range = maxWpm - minWpm || 1;
  const w = 280;
  const h = 80;
  const pad = 4;

  const points = recent.map((e, i) => {
    const x = pad + (i / (recent.length - 1)) * (w - pad * 2);
    const y = h - pad - ((e.wpm - minWpm) / range) * (h - pad * 2);
    return { x, y, wpm: e.wpm };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line
            key={i}
            x1={pad}
            y1={h - pad - t * (h - pad * 2)}
            x2={w - pad}
            y2={h - pad - t * (h - pad * 2)}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-border"
          />
        ))}

        {/* Line */}
        <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#3b82f6" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-text-muted">
        <span>{minWpm} WPM</span>
        <span>{maxWpm} WPM</span>
      </div>
    </div>
  );
}

// --- Speed Distribution (histogram) ---

function SpeedDistribution({ entries }: { entries: ReadingEntry[] }) {
  if (entries.length < 3) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-text-muted">
        Read at least 3 articles to see distribution
      </div>
    );
  }

  const buckets = [
    { label: "<100", min: 0, max: 100, count: 0, color: "#ef4444" },
    { label: "100-150", min: 100, max: 150, count: 0, color: "#f97316" },
    { label: "150-200", min: 150, max: 200, count: 0, color: "#f59e0b" },
    { label: "200-250", min: 200, max: 250, count: 0, color: "#eab308" },
    { label: "250-300", min: 250, max: 300, count: 0, color: "#84cc16" },
    { label: "300-400", min: 300, max: 400, count: 0, color: "#22c55e" },
    { label: "400+", min: 400, max: Infinity, count: 0, color: "#8b5cf6" },
  ];

  for (const entry of entries) {
    for (const bucket of buckets) {
      if (entry.wpm >= bucket.min && entry.wpm < bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  const maxCount = Math.max(...buckets.map((b) => b.count));

  return (
    <div className="flex items-end gap-1.5" style={{ height: 80 }}>
      {buckets.map((b, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: maxCount > 0 ? `${Math.max(4, (b.count / maxCount) * 60)}px` : "4px",
              backgroundColor: b.count > 0 ? b.color : "var(--color-border, #333)",
              opacity: b.count > 0 ? 0.8 : 0.3,
            }}
          />
          <span className="text-[8px] text-text-muted">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

// --- Efficiency Score ---

function computeEfficiencyScore(entries: ReadingEntry[]): {
  score: number;
  speedScore: number;
  consistencyScore: number;
  volumeScore: number;
} {
  if (entries.length === 0)
    return { score: 0, speedScore: 0, consistencyScore: 0, volumeScore: 0 };

  const wpms = entries.map((e) => e.wpm);
  const avgWpm = wpms.reduce((a, b) => a + b, 0) / wpms.length;

  // Speed score: 0-40 points, optimal at ~300 wpm
  const speedScore = Math.min(40, Math.round((avgWpm / 300) * 40));

  // Consistency score: 0-30 points, based on low standard deviation
  const mean = avgWpm;
  const variance = wpms.reduce((sum, w) => sum + (w - mean) ** 2, 0) / wpms.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 1; // coefficient of variation
  const consistencyScore = Math.min(30, Math.round((1 - Math.min(cv, 1)) * 30));

  // Volume score: 0-30 points, based on number of articles read (up to 50)
  const volumeScore = Math.min(30, Math.round((entries.length / 50) * 30));

  const score = speedScore + consistencyScore + volumeScore;

  return { score, speedScore, consistencyScore, volumeScore };
}

// --- Main Component ---

export function ReadingSpeedAnalyzer() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "tips" | "challenge">("overview");
  const { entries, averageWpm, challengeMode, challengeElapsed, toggleChallengeMode } =
    useReadingSpeed();

  const zone = getSpeedZone(averageWpm);
  const tips = useMemo(() => getTips(averageWpm), [averageWpm]);
  const efficiency = useMemo(() => computeEfficiencyScore(entries), [entries]);

  const fastest = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.reduce((best, e) => (e.wpm > best.wpm ? e : best), entries[0]);
  }, [entries]);

  const slowest = useMemo(() => {
    if (entries.length === 0) return null;
    return entries.reduce((worst, e) => (e.wpm < worst.wpm ? e : worst), entries[0]);
  }, [entries]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Gauge },
    { id: "history" as const, label: "History", icon: TrendingUp },
    { id: "tips" as const, label: "Tips", icon: Lightbulb },
    { id: "challenge" as const, label: "Challenge", icon: Timer },
  ];

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
          <Gauge className="h-4 w-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text">Reading Speed</span>
            {averageWpm > 0 && <SpeedBadge wpm={averageWpm} />}
          </div>
          <p className="text-[11px] text-text-muted">
            {entries.length === 0
              ? "Start reading to track your speed"
              : `${entries.length} article${entries.length !== 1 ? "s" : ""} tracked`}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {/* Tabs */}
          <div className="mb-3 flex gap-1 rounded-lg bg-bg p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-bg-card text-text shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <tab.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Speed Gauge */}
              <SpeedGauge wpm={averageWpm} />

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-bg p-2.5">
                  <div className="text-[10px] text-text-muted">Avg Speed</div>
                  <div className="text-lg font-bold text-text">{averageWpm}</div>
                  <div className={`text-[10px] font-medium ${zone.textColor}`}>{zone.label}</div>
                </div>
                <div className="rounded-lg bg-bg p-2.5">
                  <div className="text-[10px] text-text-muted">Articles Read</div>
                  <div className="text-lg font-bold text-text">{entries.length}</div>
                  <div className="text-[10px] text-text-muted">
                    {entries.length > 0
                      ? `${Math.round(entries.reduce((a, e) => a + e.wordCount, 0) / 1000)}k words total`
                      : "no data yet"}
                  </div>
                </div>
              </div>

              {/* Efficiency score */}
              <div className="rounded-lg bg-bg p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-text">Efficiency Score</span>
                  </div>
                  <span className="text-lg font-bold text-text">{efficiency.score}/100</span>
                </div>
                <div className="h-2 w-full rounded-full bg-border">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-green-400 transition-all"
                    style={{ width: `${efficiency.score}%` }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-text-muted">Speed</div>
                    <div className="text-xs font-semibold text-text">{efficiency.speedScore}/40</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted">Consistency</div>
                    <div className="text-xs font-semibold text-text">{efficiency.consistencyScore}/30</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted">Volume</div>
                    <div className="text-xs font-semibold text-text">{efficiency.volumeScore}/30</div>
                  </div>
                </div>
              </div>

              {/* Personal records */}
              {fastest && slowest && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                    Personal Records
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-bg p-2.5">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-green-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-text">{fastest.title}</p>
                      <p className="text-[10px] text-text-muted">
                        Fastest: {fastest.wpm} WPM · {fastest.wordCount} words in {formatDuration(fastest.duration)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-bg p-2.5">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-text">{slowest.title}</p>
                      <p className="text-[10px] text-text-muted">
                        Slowest: {slowest.wpm} WPM · {slowest.wordCount} words in {formatDuration(slowest.duration)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Speed distribution */}
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-xs font-medium text-text">Speed Distribution</span>
                </div>
                <SpeedDistribution entries={entries} />
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs font-medium text-text">Speed Trend (last 20)</span>
                </div>
                <SpeedHistory entries={entries} />
              </div>

              {/* Recent readings list */}
              <div>
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  Recent Readings
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {entries.length === 0 ? (
                    <p className="py-4 text-center text-xs text-text-muted">No readings recorded yet</p>
                  ) : (
                    [...entries]
                      .reverse()
                      .slice(0, 20)
                      .map((entry, i) => {
                        const entryZone = getSpeedZone(entry.wpm);
                        return (
                          <div
                            key={`${entry.articleId}-${entry.timestamp}-${i}`}
                            className="flex items-center gap-2 rounded-lg bg-bg p-2"
                          >
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: entryZone.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] text-text">{entry.title}</p>
                              <p className="text-[10px] text-text-muted">
                                {entry.wpm} WPM · {entry.wordCount} words · {formatDuration(entry.duration)}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-text-muted">
                              {new Date(entry.timestamp).toLocaleDateString("en", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tips Tab */}
          {activeTab === "tips" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-bg p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-text">
                    Personalized Tips
                    {averageWpm > 0 && (
                      <span className={`ml-1.5 ${zone.textColor}`}>({zone.label} reader)</span>
                    )}
                  </span>
                </div>
                <div className="space-y-2">
                  {tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-[10px] text-primary">•</span>
                      <p className="text-[11px] leading-relaxed text-text-muted">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Speed benchmarks */}
              <div className="rounded-lg bg-bg p-3">
                <div className="mb-2 text-xs font-medium text-text">Speed Benchmarks</div>
                <div className="space-y-1.5">
                  {[
                    { label: "Slow", range: "<150 WPM", color: "#ef4444" },
                    { label: "Average", range: "150-250 WPM", color: "#f59e0b" },
                    { label: "Fast", range: "250-400 WPM", color: "#22c55e" },
                    { label: "Speed Reader", range: "400+ WPM", color: "#8b5cf6" },
                  ].map((bench, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: bench.color }}
                      />
                      <span className="text-[11px] text-text">{bench.label}</span>
                      <span className="text-[10px] text-text-muted">{bench.range}</span>
                      {averageWpm > 0 && bench.label === zone.label && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                          You
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Challenge Tab */}
          {activeTab === "challenge" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-bg p-4 text-center">
                <Timer className="mx-auto mb-2 h-8 w-8 text-primary" />
                <h4 className="text-sm font-semibold text-text">Speed Reading Challenge</h4>
                <p className="mt-1 text-[11px] text-text-muted">
                  Enable challenge mode to see a live timer while reading articles.
                  Push yourself to read faster!
                </p>

                {/* Timer display */}
                <div className="mx-auto my-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-border">
                  <span className="font-mono text-xl font-bold text-text">
                    {Math.floor(challengeElapsed / 60)
                      .toString()
                      .padStart(2, "0")}
                    :
                    {(challengeElapsed % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                <button
                  onClick={toggleChallengeMode}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                    challengeMode
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {challengeMode ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Disable Challenge Mode
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Enable Challenge Mode
                    </>
                  )}
                </button>

                {challengeMode && (
                  <p className="mt-2 text-[10px] text-green-400">
                    Challenge mode active — timer starts when you open an article
                  </p>
                )}
              </div>

              {/* Challenge stats */}
              {entries.length > 0 && (
                <div className="rounded-lg bg-bg p-3">
                  <div className="mb-2 text-xs font-medium text-text">Your Stats</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-text">{averageWpm}</div>
                      <div className="text-[10px] text-text-muted">Avg WPM</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text">{fastest?.wpm || 0}</div>
                      <div className="text-[10px] text-text-muted">Best WPM</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text">
                        {Math.round(entries.reduce((a, e) => a + e.duration, 0) / 60)}m
                      </div>
                      <div className="text-[10px] text-text-muted">Total Time</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
