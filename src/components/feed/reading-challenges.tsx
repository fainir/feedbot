"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trophy,
  Medal,
  Target,
  Flame,
  Star,
  Crown,
  Swords,
  BookOpen,
  Clock,
  Bookmark,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Users,
  Zap,
  Lock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ChallengeStatus = "available" | "active" | "completed" | "expired";
type Difficulty = "Easy" | "Medium" | "Hard";

interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  difficulty: Difficulty;
  target: number;
  unit: string;
  xpReward: number;
  badgeIcon: React.ElementType;
  durationDays: number;
}

interface ChallengeState {
  id: string;
  status: ChallengeStatus;
  progress: number;
  joinedAt: string | null;
  completedAt: string | null;
}

interface ChallengesData {
  challenges: Record<string, ChallengeState>;
  totalXp: number;
  completedCount: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  badges: number;
  isYou: boolean;
}

interface ReadingChallengesProps {
  readIds: Set<string>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "feedbot-challenges";
const MAX_ACTIVE = 3;

const CHALLENGE_DEFS: ChallengeDefinition[] = [
  {
    id: "article-marathon",
    name: "Article Marathon",
    description: "Read 50 articles this month",
    icon: BookOpen,
    difficulty: "Hard",
    target: 50,
    unit: "articles",
    xpReward: 500,
    badgeIcon: Trophy,
    durationDays: 30,
  },
  {
    id: "source-explorer",
    name: "Source Explorer",
    description: "Read from 10 different sources this week",
    icon: Target,
    difficulty: "Medium",
    target: 10,
    unit: "sources",
    xpReward: 250,
    badgeIcon: Star,
    durationDays: 7,
  },
  {
    id: "daily-reader",
    name: "Daily Reader",
    description: "Read at least 1 article every day for 30 days",
    icon: Flame,
    difficulty: "Hard",
    target: 30,
    unit: "days",
    xpReward: 600,
    badgeIcon: Crown,
    durationDays: 30,
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    description: "Read 5 articles in under 30 minutes",
    icon: Zap,
    difficulty: "Easy",
    target: 5,
    unit: "articles",
    xpReward: 150,
    badgeIcon: Swords,
    durationDays: 1,
  },
  {
    id: "bookmark-master",
    name: "Bookmark Master",
    description: "Save and organize 25 articles with tags",
    icon: Bookmark,
    difficulty: "Medium",
    target: 25,
    unit: "bookmarks",
    xpReward: 300,
    badgeIcon: Medal,
    durationDays: 14,
  },
  {
    id: "topic-deep-dive",
    name: "Topic Deep Dive",
    description: "Read 20 articles on the same topic",
    icon: Target,
    difficulty: "Hard",
    target: 20,
    unit: "articles",
    xpReward: 450,
    badgeIcon: Star,
    durationDays: 21,
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Read 3 articles before 9am for 5 days",
    icon: Sun,
    difficulty: "Medium",
    target: 5,
    unit: "days",
    xpReward: 200,
    badgeIcon: Crown,
    durationDays: 14,
  },
  {
    id: "night-scholar",
    name: "Night Scholar",
    description: "Read 10 articles after 9pm",
    icon: Moon,
    difficulty: "Easy",
    target: 10,
    unit: "articles",
    xpReward: 150,
    badgeIcon: Medal,
    durationDays: 14,
  },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Alex T.", avatar: "AT", xp: 2450, badges: 6, isYou: false },
  { rank: 2, name: "Sam K.", avatar: "SK", xp: 1980, badges: 5, isYou: false },
  { rank: 3, name: "Jordan M.", avatar: "JM", xp: 1750, badges: 4, isYou: false },
  { rank: 4, name: "You", avatar: "YO", xp: 0, badges: 0, isYou: true },
  { rank: 5, name: "Taylor R.", avatar: "TR", xp: 890, badges: 2, isYou: false },
];

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: "bg-green-500/10 text-green-400",
  Medium: "bg-yellow-500/10 text-yellow-400",
  Hard: "bg-red-500/10 text-red-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadData(): ChallengesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { challenges: {}, totalXp: 0, completedCount: 0 };
}

function saveData(data: ChallengesData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function daysRemaining(joinedAt: string | null, durationDays: number): number {
  if (!joinedAt) return durationDays;
  const end = new Date(joinedAt);
  end.setDate(end.getDate() + durationDays);
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function formatTimeRemaining(days: number): string {
  if (days <= 0) return "Expired";
  if (days === 1) return "1 day left";
  if (days < 7) return `${days} days left`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week left" : `${weeks} weeks left`;
}

function seedProgress(readCount: number, def: ChallengeDefinition): number {
  // Provide sensible mock progress based on existing readIds
  const ratio = readCount / Math.max(def.target, 1);
  // Scale differently per challenge to make it interesting
  switch (def.id) {
    case "article-marathon":
      return Math.min(Math.floor(readCount * 0.8), def.target);
    case "source-explorer":
      return Math.min(Math.floor(readCount * 0.3), def.target);
    case "daily-reader":
      return Math.min(Math.floor(readCount * 0.4), def.target);
    case "speed-demon":
      return Math.min(Math.floor(readCount * 0.6), def.target);
    case "bookmark-master":
      return Math.min(Math.floor(readCount * 0.5), def.target);
    case "topic-deep-dive":
      return Math.min(Math.floor(readCount * 0.35), def.target);
    case "early-bird":
      return Math.min(Math.floor(readCount * 0.2), def.target);
    case "night-scholar":
      return Math.min(Math.floor(readCount * 0.45), def.target);
    default:
      return Math.min(Math.floor(ratio * def.target * 0.4), def.target);
  }
}

// ─── Components ──────────────────────────────────────────────────────────────

function ProgressBar({ progress, target }: { progress: number; target: number }) {
  const pct = Math.min((progress / target) * 100, 100);
  const isComplete = progress >= target;

  return (
    <div className="h-2 w-full rounded-full bg-border">
      <div
        className={`h-2 rounded-full transition-all ${isComplete ? "bg-green-400" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DIFFICULTY_COLORS[difficulty]}`}>
      {difficulty}
    </span>
  );
}

function StatusBadge({ status }: { status: ChallengeStatus }) {
  const styles: Record<ChallengeStatus, string> = {
    available: "bg-blue-500/10 text-blue-400",
    active: "bg-primary/10 text-primary",
    completed: "bg-green-500/10 text-green-400",
    expired: "bg-neutral-500/10 text-text-muted",
  };
  const labels: Record<ChallengeStatus, string> = {
    available: "Available",
    active: "In Progress",
    completed: "Completed",
    expired: "Expired",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ChallengeCard({
  def,
  state,
  onJoin,
  onLeave,
  canJoin,
}: {
  def: ChallengeDefinition;
  state: ChallengeState;
  onJoin: () => void;
  onLeave: () => void;
  canJoin: boolean;
}) {
  const Icon = def.icon;
  const BadgeIcon = def.badgeIcon;
  const remaining = daysRemaining(state.joinedAt, def.durationDays);
  const isComplete = state.status === "completed";
  const isExpired = state.status === "expired" || (state.status === "active" && remaining <= 0);
  const isActive = state.status === "active" && !isExpired;

  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        isComplete
          ? "border-green-500/30 bg-green-500/5"
          : isExpired
          ? "border-border bg-bg-card/50 opacity-60"
          : isActive
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-bg-card"
      }`}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isComplete ? "bg-green-500/10" : "bg-primary/10"
            }`}
          >
            <Icon className={`h-4 w-4 ${isComplete ? "text-green-400" : "text-primary"}`} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-text">{def.name}</h4>
            <p className="text-[11px] text-text-muted">{def.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <DifficultyBadge difficulty={def.difficulty} />
          <StatusBadge status={isExpired ? "expired" : state.status} />
        </div>
      </div>

      {/* Progress */}
      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-text-muted">
            {state.progress}/{def.target} {def.unit}
          </span>
          {isActive && (
            <span className="flex items-center gap-1 text-text-muted">
              <Clock className="h-3 w-3" />
              {formatTimeRemaining(remaining)}
            </span>
          )}
          {isComplete && <span className="text-green-400">Complete!</span>}
        </div>
        <ProgressBar progress={state.progress} target={def.target} />
      </div>

      {/* Reward + Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <BadgeIcon className="h-3.5 w-3.5 text-yellow-400" />
          <span>+{def.xpReward} XP</span>
        </div>
        {state.status === "available" && (
          <button
            onClick={onJoin}
            disabled={!canJoin}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              canJoin
                ? "bg-primary text-white hover:bg-primary-dark"
                : "cursor-not-allowed bg-border text-text-muted"
            }`}
          >
            {canJoin ? "Join Challenge" : "Max Active (3)"}
          </button>
        )}
        {isActive && (
          <button
            onClick={onLeave}
            className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            Leave
          </button>
        )}
        {isComplete && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-400">
            <Trophy className="h-3.5 w-3.5" /> Earned
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ReadingChallenges({ readIds }: ReadingChallengesProps) {
  const [data, setData] = useState<ChallengesData>({ challenges: {}, totalXp: 0, completedCount: 0 });
  const [expanded, setExpanded] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Load from localStorage & seed progress from readIds
  useEffect(() => {
    const saved = loadData();
    const readCount = readIds.size;

    // Seed initial state for challenges that have no entry yet
    const next = { ...saved, challenges: { ...saved.challenges } };
    for (const def of CHALLENGE_DEFS) {
      if (!next.challenges[def.id]) {
        const progress = seedProgress(readCount, def);
        const isComplete = progress >= def.target;
        next.challenges[def.id] = {
          id: def.id,
          status: isComplete ? "completed" : "available",
          progress,
          joinedAt: null,
          completedAt: isComplete ? new Date().toISOString() : null,
        };
        if (isComplete) {
          next.totalXp += def.xpReward;
          next.completedCount++;
        }
      } else {
        // Update progress for active challenges based on readIds growth
        const st = next.challenges[def.id];
        if (st.status === "active") {
          const newProgress = Math.max(st.progress, seedProgress(readCount, def));
          if (newProgress >= def.target) {
            st.progress = def.target;
            st.status = "completed";
            st.completedAt = new Date().toISOString();
            next.totalXp += def.xpReward;
            next.completedCount++;
          } else {
            st.progress = newProgress;
          }
        }
      }
    }

    saveData(next);
    setData(next);
  }, [readIds.size]);

  const activeCount = useMemo(
    () => Object.values(data.challenges).filter((c) => c.status === "active").length,
    [data.challenges]
  );

  const canJoin = activeCount < MAX_ACTIVE;

  const joinChallenge = useCallback(
    (id: string) => {
      setData((prev) => {
        const st = prev.challenges[id];
        if (!st || st.status !== "available" || activeCount >= MAX_ACTIVE) return prev;
        const next: ChallengesData = {
          ...prev,
          challenges: {
            ...prev.challenges,
            [id]: { ...st, status: "active", joinedAt: new Date().toISOString() },
          },
        };
        saveData(next);
        return next;
      });
    },
    [activeCount]
  );

  const leaveChallenge = useCallback((id: string) => {
    setData((prev) => {
      const st = prev.challenges[id];
      if (!st || st.status !== "active") return prev;
      const next: ChallengesData = {
        ...prev,
        challenges: {
          ...prev.challenges,
          [id]: { ...st, status: "available", joinedAt: null },
        },
      };
      saveData(next);
      return next;
    });
  }, []);

  // Ordered: active first, then available, then completed, then expired
  const orderedDefs = useMemo(() => {
    const order: Record<ChallengeStatus, number> = { active: 0, available: 1, completed: 2, expired: 3 };
    return [...CHALLENGE_DEFS].sort((a, b) => {
      const sa = data.challenges[a.id]?.status ?? "available";
      const sb = data.challenges[b.id]?.status ?? "available";
      return (order[sa] ?? 1) - (order[sb] ?? 1);
    });
  }, [data.challenges]);

  const leaderboard = useMemo(() => {
    return MOCK_LEADERBOARD.map((entry) =>
      entry.isYou ? { ...entry, xp: data.totalXp, badges: data.completedCount } : entry
    ).sort((a, b) => b.xp - a.xp).map((e, i) => ({ ...e, rank: i + 1 }));
  }, [data.totalXp, data.completedCount]);

  const visibleDefs = expanded ? orderedDefs : orderedDefs.slice(0, 3);

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-yellow-500/10">
            <Swords className="h-3.5 w-3.5 text-yellow-400" />
          </div>
          <h3 className="text-sm font-semibold text-text">Reading Challenges</h3>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {activeCount} active
            </span>
          )}
        </div>
        <button
          onClick={() => setShowLeaderboard((v) => !v)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          <Users className="h-3.5 w-3.5" />
          Leaderboard
        </button>
      </div>

      {/* Stats Strip */}
      <div className="mb-3 flex items-center gap-4 rounded-lg bg-bg p-2.5">
        <div className="flex items-center gap-1.5 text-xs">
          <Star className="h-3.5 w-3.5 text-yellow-400" />
          <span className="font-medium text-text">{data.totalXp}</span>
          <span className="text-text-muted">XP</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-xs">
          <Trophy className="h-3.5 w-3.5 text-green-400" />
          <span className="font-medium text-text">{data.completedCount}</span>
          <span className="text-text-muted">completed</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-xs">
          <Flame className="h-3.5 w-3.5 text-orange-400" />
          <span className="font-medium text-text">{activeCount}/{MAX_ACTIVE}</span>
          <span className="text-text-muted">active</span>
        </div>
      </div>

      {/* Leaderboard (toggled) */}
      {showLeaderboard && (
        <div className="mb-3 rounded-lg border border-border bg-bg p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text">
            <Crown className="h-3.5 w-3.5 text-yellow-400" />
            Top Readers
          </h4>
          <div className="space-y-1.5">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                  entry.isYou ? "bg-primary/10 ring-1 ring-primary/30" : "bg-bg-card"
                }`}
              >
                <span
                  className={`w-5 text-center font-bold ${
                    entry.rank === 1
                      ? "text-yellow-400"
                      : entry.rank === 2
                      ? "text-neutral-300"
                      : entry.rank === 3
                      ? "text-orange-400"
                      : "text-text-muted"
                  }`}
                >
                  {entry.rank}
                </span>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    entry.isYou ? "bg-primary/20 text-primary" : "bg-bg-hover text-text-muted"
                  }`}
                >
                  {entry.avatar}
                </div>
                <span className={`flex-1 font-medium ${entry.isYou ? "text-primary" : "text-text"}`}>
                  {entry.name}
                  {entry.isYou && " (You)"}
                </span>
                <span className="text-text-muted">{entry.xp} XP</span>
                <span className="flex items-center gap-0.5 text-text-muted">
                  <Medal className="h-3 w-3" />
                  {entry.badges}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badge Collection */}
      <div className="mb-3">
        <h4 className="mb-2 text-[11px] font-medium text-text-muted">Badge Collection</h4>
        <div className="flex flex-wrap gap-2">
          {CHALLENGE_DEFS.map((def) => {
            const BadgeIcon = def.badgeIcon;
            const isEarned = data.challenges[def.id]?.status === "completed";
            return (
              <div
                key={def.id}
                title={`${def.name}${isEarned ? " (Earned)" : ""}`}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  isEarned
                    ? "bg-yellow-500/15 shadow-[0_0_8px_rgba(234,179,8,0.3)]"
                    : "bg-bg-hover/50"
                }`}
              >
                {isEarned ? (
                  <BadgeIcon className="h-4 w-4 text-yellow-400" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-text-muted/40" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Challenge Cards */}
      <div className="space-y-2">
        {visibleDefs.map((def) => {
          const state = data.challenges[def.id] || {
            id: def.id,
            status: "available" as ChallengeStatus,
            progress: 0,
            joinedAt: null,
            completedAt: null,
          };
          return (
            <ChallengeCard
              key={def.id}
              def={def}
              state={state}
              onJoin={() => joinChallenge(def.id)}
              onLeave={() => leaveChallenge(def.id)}
              canJoin={canJoin}
            />
          );
        })}
      </div>

      {/* Show more/less */}
      {orderedDefs.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          {expanded ? (
            <>
              Show Less <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show All ({orderedDefs.length - 3} more) <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Badge Component (Small) ─────────────────────────────────────────────────

export function ChallengesBadge({ readIds }: { readIds: Set<string> }) {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ChallengesData = JSON.parse(raw);
        const count = Object.values(parsed.challenges).filter((c) => c.status === "active").length;
        setActiveCount(count);
      }
    } catch {}
  }, [readIds.size]);

  if (activeCount === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
      <Swords className="h-3 w-3" />
      {activeCount}
    </span>
  );
}
