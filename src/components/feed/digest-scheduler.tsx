"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Mail, Clock, Calendar, Bell, BellOff, Send, Eye, X, Star, BookOpen, TrendingUp, ExternalLink, ChevronDown, Settings, Zap } from "lucide-react";

// --- Types ---

type ScheduleFrequency = "daily" | "weekly" | "custom";
type DailyTime = "morning" | "evening";
type WeeklyDay = "monday" | "friday";
type DigestFormat = "top-stories" | "full-recap" | "unread-only";

interface DigestPrefs {
  enabled: boolean;
  frequency: ScheduleFrequency;
  dailyTime: DailyTime;
  weeklyDay: WeeklyDay;
  customIntervalHours: number;
  format: DigestFormat;
}

interface DigestArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  thumbnailUrl?: string;
  digestScore: number;
}

const STORAGE_KEY = "feedbot-digest-prefs";

const DEFAULT_PREFS: DigestPrefs = {
  enabled: false,
  frequency: "daily",
  dailyTime: "morning",
  weeklyDay: "monday",
  customIntervalHours: 12,
  format: "top-stories",
};

// --- Mock Data ---

const MOCK_ARTICLES: DigestArticle[] = [
  {
    id: "d1",
    title: "OpenAI Announces GPT-5 with Reasoning Capabilities",
    summary: "The latest model brings significant improvements to multi-step reasoning and code generation tasks.",
    source: "TechCrunch",
    url: "#",
    publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    thumbnailUrl: undefined,
    digestScore: 0.95,
  },
  {
    id: "d2",
    title: "React 20 Released with Built-in State Management",
    summary: "The React team ships a major update that eliminates the need for external state libraries in most apps.",
    source: "Vercel Blog",
    url: "#",
    publishedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    thumbnailUrl: undefined,
    digestScore: 0.88,
  },
  {
    id: "d3",
    title: "Rust Overtakes C++ in Systems Programming Survey",
    summary: "Annual developer survey shows Rust adoption doubling year-over-year in embedded and systems domains.",
    source: "InfoQ",
    url: "#",
    publishedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    thumbnailUrl: undefined,
    digestScore: 0.82,
  },
  {
    id: "d4",
    title: "GitHub Copilot Now Writes Full Test Suites",
    summary: "New Copilot update generates comprehensive test coverage from a single prompt, supporting 12 frameworks.",
    source: "GitHub Blog",
    url: "#",
    publishedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    thumbnailUrl: undefined,
    digestScore: 0.76,
  },
  {
    id: "d5",
    title: "Tailwind CSS v5 Introduces Dynamic Theming Engine",
    summary: "The popular utility-first framework adds runtime theme switching and CSS custom property integration.",
    source: "Tailwind Blog",
    url: "#",
    publishedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    thumbnailUrl: undefined,
    digestScore: 0.71,
  },
];

const MOCK_STATS = {
  articlesPublished: 47,
  readCount: 18,
  topSource: "TechCrunch",
};

// --- Helpers ---

function loadPrefs(): DigestPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

function savePrefs(prefs: DigestPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

function computeDigestScore(article: { publishedAt: string; source: string; title: string }, allSources: string[], keywords: string[]): number {
  // Recency: 0-0.4 (newer = higher)
  const ageHours = (Date.now() - new Date(article.publishedAt).getTime()) / 3600000;
  const recency = Math.max(0, 0.4 * (1 - ageHours / 48));

  // Source diversity: 0-0.3 (rarer sources score higher)
  const sourceCount = allSources.filter((s) => s === article.source).length;
  const diversity = 0.3 * (1 - Math.min(sourceCount / allSources.length, 1));

  // Keyword relevance: 0-0.3
  const titleLower = article.title.toLowerCase();
  const matchCount = keywords.filter((kw) => titleLower.includes(kw.toLowerCase())).length;
  const relevance = keywords.length > 0 ? 0.3 * Math.min(matchCount / keywords.length, 1) : 0.15;

  return Math.round((recency + diversity + relevance) * 100) / 100;
}

function formatScheduleLabel(prefs: DigestPrefs): string {
  if (!prefs.enabled) return "Disabled";
  if (prefs.frequency === "daily") {
    return prefs.dailyTime === "morning" ? "Daily at 8:00 AM" : "Daily at 6:00 PM";
  }
  if (prefs.frequency === "weekly") {
    return prefs.weeklyDay === "monday" ? "Every Monday at 9:00 AM" : "Every Friday at 9:00 AM";
  }
  return `Every ${prefs.customIntervalHours} hours`;
}

function formatTimeAgo(date: string): string {
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getSourceColor(source: string): string {
  const colors = [
    "bg-blue-500/20 text-blue-400",
    "bg-purple-500/20 text-purple-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-amber-500/20 text-amber-400",
    "bg-rose-500/20 text-rose-400",
  ];
  let hash = 0;
  for (const ch of source) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

// --- DigestPreview Component ---

export function DigestPreview({ articles, stats, format }: {
  articles?: DigestArticle[];
  stats?: { articlesPublished: number; readCount: number; topSource: string };
  format?: DigestFormat;
}) {
  const items = articles ?? MOCK_ARTICLES;
  const displayStats = stats ?? MOCK_STATS;
  const displayFormat = format ?? "top-stories";

  const filtered = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.digestScore - a.digestScore);
    if (displayFormat === "top-stories") return sorted.slice(0, 5);
    return sorted;
  }, [items, displayFormat]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-bg-card to-bg-card/80">
      {/* Email header */}
      <div className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Your FeedBot Digest</h3>
            <p className="text-[11px] text-text-muted">{today}</p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 border-b border-border/30 px-5 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <BookOpen className="h-3 w-3" />
          <span><strong className="text-text">{displayStats.articlesPublished}</strong> published</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Eye className="h-3 w-3" />
          <span><strong className="text-text">{displayStats.readCount}</strong> read</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <TrendingUp className="h-3 w-3" />
          <span>Top: <strong className="text-text">{displayStats.topSource}</strong></span>
        </div>
      </div>

      {/* Articles */}
      <div className="divide-y divide-border/30 px-5">
        {filtered.map((article, idx) => (
          <div key={article.id} className="flex gap-3 py-3">
            {/* Thumbnail placeholder */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-bg-hover/80 text-lg font-bold text-text-muted">
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-1 text-sm font-semibold text-text transition-colors hover:text-primary"
                >
                  {article.title}
                </a>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">{article.summary}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getSourceColor(article.source)}`}>
                  {article.source}
                </span>
                <span className="text-[10px] text-text-muted">{formatTimeAgo(article.publishedAt)}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {article.digestScore.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="border-t border-border/30 px-5 py-3">
        <button className="w-full rounded-lg bg-primary/10 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
          View in FeedBot
        </button>
      </div>
    </div>
  );
}

// --- DigestScheduler Component ---

export function DigestScheduler() {
  const [prefs, setPrefs] = useState<DigestPrefs>(DEFAULT_PREFS);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sendNowToast, setSendNowToast] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const updatePrefs = useCallback((partial: Partial<DigestPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      return next;
    });
  }, []);

  const handleSendNow = useCallback(() => {
    setShowPreview(true);
    setSendNowToast(true);
    setTimeout(() => setSendNowToast(false), 3000);
  }, []);

  return (
    <>
      <div className="mb-6 rounded-xl border border-border bg-bg-card">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text">Smart Digest</h3>
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Zap className="h-2.5 w-2.5" />
                {formatScheduleLabel(prefs)}
              </span>
            </div>
            <p className="text-xs text-text-muted">Curated feed digest delivered on your schedule</p>
          </div>

          {/* Toggle switch */}
          <button
            onClick={() => updatePrefs({ enabled: !prefs.enabled })}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              prefs.enabled ? "bg-primary" : "bg-bg-hover"
            }`}
            title={prefs.enabled ? "Disable digest" : "Enable digest"}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                prefs.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            <Settings className={`h-4 w-4 transition-transform ${showSettings ? "rotate-90" : ""}`} />
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-4">
            {/* Schedule frequency */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                <Clock className="mr-1 inline h-3 w-3" />
                Schedule
              </label>
              <div className="flex gap-1.5">
                {(["daily", "weekly", "custom"] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => updatePrefs({ frequency: freq })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      prefs.frequency === freq
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency-specific options */}
            {prefs.frequency === "daily" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Delivery Time</label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => updatePrefs({ dailyTime: "morning" })}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      prefs.dailyTime === "morning"
                        ? "bg-amber-500/10 text-amber-400"
                        : "text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    <span>&#x2600;&#xFE0F;</span> Morning (8 AM)
                  </button>
                  <button
                    onClick={() => updatePrefs({ dailyTime: "evening" })}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      prefs.dailyTime === "evening"
                        ? "bg-indigo-500/10 text-indigo-400"
                        : "text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    <span>&#x1F319;</span> Evening (6 PM)
                  </button>
                </div>
              </div>
            )}

            {prefs.frequency === "weekly" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  Delivery Day
                </label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => updatePrefs({ weeklyDay: "monday" })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      prefs.weeklyDay === "monday"
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    Monday
                  </button>
                  <button
                    onClick={() => updatePrefs({ weeklyDay: "friday" })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      prefs.weeklyDay === "friday"
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    Friday
                  </button>
                </div>
              </div>
            )}

            {prefs.frequency === "custom" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  Interval (hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={72}
                    value={prefs.customIntervalHours}
                    onChange={(e) => updatePrefs({ customIntervalHours: Number(e.target.value) })}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-bg-hover accent-primary"
                  />
                  <span className="w-12 text-right text-xs font-medium text-text">{prefs.customIntervalHours}h</span>
                </div>
              </div>
            )}

            {/* Digest format */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                <BookOpen className="mr-1 inline h-3 w-3" />
                Digest Format
              </label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { value: "top-stories" as const, label: "Top Stories", desc: "5 best articles" },
                  { value: "full-recap" as const, label: "Full Recap", desc: "Everything" },
                  { value: "unread-only" as const, label: "Unread Only", desc: "What you missed" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updatePrefs({ format: opt.value })}
                    className={`rounded-lg px-3 py-1.5 text-left transition-colors ${
                      prefs.format === opt.value
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    <span className="block text-xs font-medium">{opt.label}</span>
                    <span className="block text-[10px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSendNow}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                <Send className="h-3 w-3" />
                Send Now
              </button>
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                <Eye className="h-3 w-3" />
                {showPreview ? "Hide Preview" : "Preview"}
              </button>
            </div>
          </div>
        )}

        {/* Inline preview */}
        {showPreview && (
          <div className="border-t border-border/50 p-4">
            <DigestPreview format={prefs.format} />
          </div>
        )}
      </div>

      {/* Send Now toast */}
      {sendNowToast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-primary/30 bg-bg-card px-4 py-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
              <Bell className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text">Digest sent!</p>
              <p className="text-[10px] text-text-muted">Your digest preview is ready below.</p>
            </div>
            <button
              onClick={() => setSendNowToast(false)}
              className="ml-2 rounded-lg p-1 text-text-muted hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
