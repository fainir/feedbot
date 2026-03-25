"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Award, Trophy, Star, Flame, BookOpen, Target, PartyPopper, X, Share2, Lock } from "lucide-react";

// --- Types ---

interface MilestoneDef {
  id: string;
  category: "reading" | "streaks" | "exploration" | "curation" | "time";
  label: string;
  description: string;
  icon: "award" | "trophy" | "star" | "flame" | "book" | "target";
  threshold: number;
}

interface EarnedMilestone {
  id: string;
  earnedAt: string; // ISO date
}

interface MilestoneStats {
  articlesRead: number;
  currentStreak: number;
  uniqueSources: number;
  bookmarksCount: number;
  readingHours: number;
}

interface ReadingMilestonesProps {
  stats: MilestoneStats;
}

interface MilestoneCheckProps {
  stats: MilestoneStats;
  readIds: Set<string>;
}

// --- Milestone definitions ---

const MILESTONES: MilestoneDef[] = [
  // Articles read
  { id: "articles-10", category: "reading", label: "Getting Started", description: "Read 10 articles", icon: "book", threshold: 10 },
  { id: "articles-25", category: "reading", label: "Curious Mind", description: "Read 25 articles", icon: "book", threshold: 25 },
  { id: "articles-50", category: "reading", label: "Avid Reader", description: "Read 50 articles", icon: "book", threshold: 50 },
  { id: "articles-100", category: "reading", label: "Bookworm", description: "Read 100 articles", icon: "award", threshold: 100 },
  { id: "articles-250", category: "reading", label: "Knowledge Seeker", description: "Read 250 articles", icon: "award", threshold: 250 },
  { id: "articles-500", category: "reading", label: "Information Maven", description: "Read 500 articles", icon: "trophy", threshold: 500 },
  { id: "articles-1000", category: "reading", label: "Reading Legend", description: "Read 1,000 articles", icon: "trophy", threshold: 1000 },
  // Streaks
  { id: "streak-3", category: "streaks", label: "On a Roll", description: "3-day reading streak", icon: "flame", threshold: 3 },
  { id: "streak-7", category: "streaks", label: "Week Warrior", description: "7-day reading streak", icon: "flame", threshold: 7 },
  { id: "streak-14", category: "streaks", label: "Two-Week Titan", description: "14-day reading streak", icon: "flame", threshold: 14 },
  { id: "streak-30", category: "streaks", label: "Monthly Master", description: "30-day reading streak", icon: "star", threshold: 30 },
  { id: "streak-60", category: "streaks", label: "Unstoppable", description: "60-day reading streak", icon: "star", threshold: 60 },
  { id: "streak-100", category: "streaks", label: "Century Streak", description: "100-day reading streak", icon: "trophy", threshold: 100 },
  // Unique sources
  { id: "sources-5", category: "exploration", label: "Explorer", description: "Read from 5 sources", icon: "target", threshold: 5 },
  { id: "sources-10", category: "exploration", label: "Diverse Reader", description: "Read from 10 sources", icon: "target", threshold: 10 },
  { id: "sources-25", category: "exploration", label: "Worldly", description: "Read from 25 sources", icon: "star", threshold: 25 },
  { id: "sources-50", category: "exploration", label: "Omni-Reader", description: "Read from 50 sources", icon: "trophy", threshold: 50 },
  // Bookmarks
  { id: "bookmarks-10", category: "curation", label: "Collector", description: "Save 10 articles", icon: "star", threshold: 10 },
  { id: "bookmarks-25", category: "curation", label: "Curator", description: "Save 25 articles", icon: "star", threshold: 25 },
  { id: "bookmarks-50", category: "curation", label: "Librarian", description: "Save 50 articles", icon: "award", threshold: 50 },
  { id: "bookmarks-100", category: "curation", label: "Archivist", description: "Save 100 articles", icon: "trophy", threshold: 100 },
  // Reading time
  { id: "time-1", category: "time", label: "First Hour", description: "1 hour total reading", icon: "book", threshold: 1 },
  { id: "time-5", category: "time", label: "Deep Diver", description: "5 hours total reading", icon: "book", threshold: 5 },
  { id: "time-10", category: "time", label: "Dedicated", description: "10 hours total reading", icon: "award", threshold: 10 },
  { id: "time-24", category: "time", label: "Full Day Reader", description: "24 hours total reading", icon: "star", threshold: 24 },
  { id: "time-50", category: "time", label: "Time Lord", description: "50 hours total reading", icon: "trophy", threshold: 50 },
];

const CATEGORY_LABELS: Record<string, string> = {
  reading: "Reading",
  streaks: "Streaks",
  exploration: "Exploration",
  curation: "Curation",
  time: "Time",
};

const STORAGE_KEY = "feedbot-milestones";

// --- Helpers ---

function loadEarnedMilestones(): EarnedMilestone[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveEarnedMilestones(earned: EarnedMilestone[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(earned));
  } catch {}
}

function getStatForMilestone(milestone: MilestoneDef, stats: MilestoneStats): number {
  switch (milestone.category) {
    case "reading": return stats.articlesRead;
    case "streaks": return stats.currentStreak;
    case "exploration": return stats.uniqueSources;
    case "curation": return stats.bookmarksCount;
    case "time": return stats.readingHours;
  }
}

function renderIcon(icon: MilestoneDef["icon"], className: string) {
  switch (icon) {
    case "award": return <Award className={className} />;
    case "trophy": return <Trophy className={className} />;
    case "star": return <Star className={className} />;
    case "flame": return <Flame className={className} />;
    case "book": return <BookOpen className={className} />;
    case "target": return <Target className={className} />;
  }
}

// --- Confetti CSS (injected once) ---

const CONFETTI_STYLE_ID = "feedbot-confetti-style";

function ensureConfettiStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CONFETTI_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = CONFETTI_STYLE_ID;
  style.textContent = `
    @keyframes fb-confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
    }
    @keyframes fb-milestone-slide-up {
      0% { transform: translateY(40px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .fb-confetti-particle {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      animation: fb-confetti-fall 1.5s ease-out forwards;
    }
    .fb-milestone-slide {
      animation: fb-milestone-slide-up 0.4s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

// --- Confetti burst component ---

function ConfettiBurst() {
  const colors = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f97316"];
  const particles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.5}s`,
      size: 6 + Math.random() * 6,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="fb-confetti-particle"
          style={{
            left: p.left,
            top: "-10px",
            backgroundColor: p.color,
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}

// --- Celebration overlay ---

function CelebrationCard({
  milestone,
  onClose,
}: {
  milestone: MilestoneDef;
  onClose: () => void;
}) {
  useEffect(() => {
    ensureConfettiStyles();
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 sm:items-center sm:pb-0">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Card */}
      <div className="fb-milestone-slide relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-yellow-400/30 bg-bg-card p-6 shadow-2xl">
        <ConfettiBurst />

        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/20">
            {renderIcon(milestone.icon, "h-8 w-8 text-yellow-400")}
          </div>

          <div className="mb-1 flex items-center gap-1.5">
            <PartyPopper className="h-4 w-4 text-yellow-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
              Milestone Reached!
            </span>
            <PartyPopper className="h-4 w-4 text-yellow-400" />
          </div>

          <h3 className="mb-1 text-lg font-bold text-text">{milestone.label}</h3>
          <p className="text-sm text-text-muted">{milestone.description}</p>
          <p className="mt-2 text-[10px] text-text-muted">
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- MilestoneCheck component ---

export function MilestoneCheck({ stats, readIds }: MilestoneCheckProps) {
  const [celebration, setCelebration] = useState<MilestoneDef | null>(null);
  const prevSizeRef = useRef(readIds.size);

  useEffect(() => {
    ensureConfettiStyles();
  }, []);

  // Check for new milestones when readIds changes
  useEffect(() => {
    // Only check when readIds actually grows
    if (readIds.size <= prevSizeRef.current && prevSizeRef.current !== 0) {
      prevSizeRef.current = readIds.size;
      return;
    }
    prevSizeRef.current = readIds.size;

    const earned = loadEarnedMilestones();
    const earnedIds = new Set(earned.map((e) => e.id));
    const newlyEarned: MilestoneDef[] = [];

    for (const m of MILESTONES) {
      if (earnedIds.has(m.id)) continue;
      const current = getStatForMilestone(m, stats);
      if (current >= m.threshold) {
        newlyEarned.push(m);
        earned.push({ id: m.id, earnedAt: new Date().toISOString() });
      }
    }

    if (newlyEarned.length > 0) {
      saveEarnedMilestones(earned);
      // Show the highest-value new milestone
      setCelebration(newlyEarned[newlyEarned.length - 1]);
    }
  }, [readIds.size, stats]);

  if (!celebration) return null;

  return (
    <CelebrationCard
      milestone={celebration}
      onClose={() => setCelebration(null)}
    />
  );
}

// --- Milestones gallery ---

export function ReadingMilestones({ stats }: ReadingMilestonesProps) {
  const [earned, setEarned] = useState<EarnedMilestone[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setEarned(loadEarnedMilestones());
  }, []);

  const earnedMap = useMemo(() => {
    const map = new Map<string, EarnedMilestone>();
    for (const e of earned) map.set(e.id, e);
    return map;
  }, [earned]);

  const categories = useMemo(() => {
    const cats = ["all", ...Object.keys(CATEGORY_LABELS)];
    return cats;
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return MILESTONES;
    return MILESTONES.filter((m) => m.category === activeCategory);
  }, [activeCategory]);

  const totalEarned = earned.length;
  const totalMilestones = MILESTONES.length;

  const handleShare = useCallback((milestone: MilestoneDef) => {
    const text = `🏆 I just earned the "${milestone.label}" milestone on FeedBot! ${milestone.description}. #FeedBot #ReadingGoals`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(milestone.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  return (
    <div className="rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-yellow-400/10">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" />
            </div>
            <h3 className="text-sm font-semibold text-text">Milestones</h3>
          </div>
          <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
            {totalEarned}/{totalMilestones}
          </span>
        </div>

        {/* Overall progress */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-border">
          <div
            className="h-1.5 rounded-full bg-yellow-400 transition-all"
            style={{ width: `${(totalEarned / totalMilestones) * 100}%` }}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-bg-hover hover:text-text"
            }`}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Milestones grid */}
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {filtered.map((milestone) => {
          const isEarned = earnedMap.has(milestone.id);
          const earnedData = earnedMap.get(milestone.id);
          const current = getStatForMilestone(milestone, stats);
          const progress = Math.min(current / milestone.threshold, 1);
          const remaining = Math.max(milestone.threshold - current, 0);

          return (
            <div
              key={milestone.id}
              className={`relative rounded-xl border p-3 transition-all ${
                isEarned
                  ? "border-yellow-400/30 bg-yellow-400/5 shadow-[0_0_12px_rgba(250,204,21,0.08)]"
                  : "border-border bg-bg"
              }`}
            >
              {/* Icon */}
              <div
                className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${
                  isEarned ? "bg-yellow-400/20" : "bg-bg-hover"
                }`}
              >
                {isEarned ? (
                  renderIcon(milestone.icon, "h-4.5 w-4.5 text-yellow-400")
                ) : (
                  <div className="relative">
                    {renderIcon(milestone.icon, "h-4.5 w-4.5 text-text-muted/40")}
                    <Lock className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 text-text-muted/50" />
                  </div>
                )}
              </div>

              {/* Label + description */}
              <p
                className={`text-xs font-semibold ${
                  isEarned ? "text-text" : "text-text-muted"
                }`}
              >
                {milestone.label}
              </p>
              <p className="mt-0.5 text-[10px] text-text-muted">
                {milestone.description}
              </p>

              {/* Progress or earned date */}
              {isEarned ? (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px] text-yellow-400/80">
                    {new Date(earnedData!.earnedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <button
                    onClick={() => handleShare(milestone)}
                    className="rounded-md p-0.5 text-text-muted transition-colors hover:text-primary"
                    title="Share achievement"
                  >
                    {copiedId === milestone.id ? (
                      <span className="text-[9px] text-green-400">Copied!</span>
                    ) : (
                      <Share2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="h-1 w-full rounded-full bg-border">
                    <div
                      className="h-1 rounded-full bg-text-muted/30 transition-all"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[9px] text-text-muted">
                    {remaining} more to go
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- MilestonesButton (toggle for sidebar/header) ---

export function MilestonesButton({ onClick }: { onClick: () => void }) {
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    setEarned(loadEarnedMilestones().length);
  }, []);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
      title="Milestones & achievements"
    >
      <Trophy className="h-3.5 w-3.5 text-yellow-400" />
      <span className="hidden sm:inline">Milestones</span>
      {earned > 0 && (
        <span className="rounded-full bg-yellow-400/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
          {earned}
        </span>
      )}
    </button>
  );
}
