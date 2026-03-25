"use client";

import { useState, useMemo, useCallback } from "react";
import { Cloud, Hash, Filter, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface WordCloudItem {
  title: string;
  summary: string;
  publishedAt: string;
  source: string;
}

interface WordCloudProps {
  items: WordCloudItem[];
  onWordClick?: (word: string) => void;
}

const STOP_WORDS = new Set([
  "the", "is", "at", "a", "an", "and", "or", "but", "in", "on", "to", "for",
  "of", "with", "by", "from", "as", "into", "through", "during", "before",
  "after", "above", "below", "between", "out", "off", "over", "under", "again",
  "further", "then", "once", "here", "there", "when", "where", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "can", "will", "just", "should", "now", "also", "its", "it", "this",
  "that", "these", "those", "was", "were", "been", "being", "have", "has",
  "had", "having", "do", "does", "did", "doing", "would", "could", "might",
  "shall", "may", "must", "need", "about", "up", "if", "are", "be", "he",
  "she", "they", "we", "you", "what", "which", "who", "whom", "their",
  "his", "her", "my", "your", "our", "us", "me", "him", "them", "i",
  "new", "said", "says", "get", "got", "one", "two", "like", "much",
  "many", "still", "even", "back", "way", "well", "via", "per", "yet",
]);

const PALETTE = [
  "text-blue-400", "text-emerald-400", "text-violet-400", "text-amber-400",
  "text-rose-400", "text-cyan-400", "text-pink-400", "text-teal-400",
];

type TimeRange = "today" | "week" | "month" | "all";

function getTimeRangeStart(range: TimeRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "today") {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (range === "week") {
    now.setDate(now.getDate() - 7);
    return now;
  }
  // month
  now.setMonth(now.getMonth() - 1);
  return now;
}

function extractWords(
  items: WordCloudItem[],
  timeRange: TimeRange,
  sourceFilter: string,
  minFrequency: number
): { word: string; count: number }[] {
  const rangeStart = getTimeRangeStart(timeRange);

  const filtered = items.filter((item) => {
    if (sourceFilter && item.source !== sourceFilter) return false;
    if (rangeStart) {
      const pub = new Date(item.publishedAt);
      if (pub < rangeStart) return false;
    }
    return true;
  });

  const freq = new Map<string, number>();
  for (const item of filtered) {
    const text = `${item.title} ${item.summary}`;
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .filter(([, count]) => count >= minFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));
}

function mapSize(count: number, min: number, max: number): number {
  if (max === min) return 30;
  return 12 + ((count - min) / (max - min)) * 36;
}

// Deterministic pseudo-random rotation based on word string
function getRotation(word: string): number {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = (hash * 31 + word.charCodeAt(i)) | 0;
  }
  return ((hash % 31) / 31) * 30 - 15; // -15 to +15
}

export function WordCloud({ items, onWordClick }: WordCloudProps) {
  const [expanded, setExpanded] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [minFrequency, setMinFrequency] = useState(2);
  const [refreshKey, setRefreshKey] = useState(0);

  const sources = useMemo(() => {
    const s = new Set<string>();
    for (const item of items) s.add(item.source);
    return Array.from(s).sort();
  }, [items]);

  const words = useMemo(
    () => extractWords(items, timeRange, sourceFilter, minFrequency),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, timeRange, sourceFilter, minFrequency, refreshKey]
  );

  const { minCount, maxCount } = useMemo(() => {
    if (words.length === 0) return { minCount: 0, maxCount: 0 };
    const counts = words.map((w) => w.count);
    return { minCount: Math.min(...counts), maxCount: Math.max(...counts) };
  }, [words]);

  const uniqueWordCount = words.length;
  const topWord = words[0]?.word || "—";
  const diversityScore = useMemo(() => {
    if (words.length === 0) return 0;
    const totalOccurrences = words.reduce((sum, w) => sum + w.count, 0);
    // Shannon entropy normalized to 0-100
    let entropy = 0;
    for (const w of words) {
      const p = w.count / totalOccurrences;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(words.length || 1);
    return maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0;
  }, [words]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10">
            <Cloud className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-text">Word Cloud</h3>
          <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] text-text-muted">
            {uniqueWordCount} words
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2">
            {/* Time range */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-bg px-1 py-0.5">
              {(["today", "week", "month", "all"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    timeRange === range
                      ? "bg-primary/15 text-primary"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {range === "today" ? "Today" : range === "week" ? "Week" : range === "month" ? "Month" : "All"}
                </button>
              ))}
            </div>

            {/* Source filter */}
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-text-muted" />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="rounded-lg border border-border bg-bg px-2 py-1 text-[11px] text-text focus:border-primary focus:outline-none"
              >
                <option value="">All sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Min frequency slider */}
            <div className="flex items-center gap-1.5">
              <Hash className="h-3 w-3 text-text-muted" />
              <span className="text-[10px] text-text-muted">Min:</span>
              <input
                type="range"
                min={1}
                max={10}
                value={minFrequency}
                onChange={(e) => setMinFrequency(Number(e.target.value))}
                className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-border accent-primary"
              />
              <span className="w-4 text-[10px] font-medium text-text">{minFrequency}</span>
            </div>
          </div>

          {/* Word cloud display */}
          <div className="flex min-h-[180px] flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-5">
            {words.length === 0 ? (
              <p className="text-xs text-text-muted">No words found for the current filters.</p>
            ) : (
              words.map((w, i) => {
                const size = mapSize(w.count, minCount, maxCount);
                const rotation = getRotation(w.word);
                const color = PALETTE[i % PALETTE.length];

                return (
                  <button
                    key={w.word}
                    onClick={() => onWordClick?.(w.word)}
                    title={`"${w.word}" — ${w.count} occurrences`}
                    className={`inline-block cursor-pointer font-semibold opacity-0 transition-all duration-200 hover:scale-125 hover:brightness-125 ${color}`}
                    style={{
                      fontSize: `${size}px`,
                      transform: `rotate(${rotation}deg)`,
                      animation: `wordFadeIn 0.4s ease forwards ${i * 0.03}s`,
                    }}
                  >
                    {w.word}
                  </button>
                );
              })
            )}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-0 divide-x divide-border border-t border-border">
            <div className="p-2.5 text-center">
              <p className="text-sm font-bold text-text">{uniqueWordCount}</p>
              <p className="text-[10px] text-text-muted">Unique words</p>
            </div>
            <div className="p-2.5 text-center">
              <p className="truncate text-sm font-bold text-primary">{topWord}</p>
              <p className="text-[10px] text-text-muted">Most common</p>
            </div>
            <div className="p-2.5 text-center">
              <p className="text-sm font-bold text-text">{diversityScore}%</p>
              <p className="text-[10px] text-text-muted">Diversity</p>
            </div>
          </div>

          {/* CSS animation keyframes */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes wordFadeIn {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}} />
        </>
      )}
    </div>
  );
}

export function WordCloudButton({ items, onWordClick }: WordCloudProps) {
  const [showCloud, setShowCloud] = useState(false);

  if (!showCloud) {
    return (
      <button
        onClick={() => setShowCloud(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Word Cloud"
      >
        <Cloud className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Word Cloud</span>
      </button>
    );
  }

  return <WordCloud items={items} onWordClick={onWordClick} />;
}
