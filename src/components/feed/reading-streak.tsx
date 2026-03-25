"use client";

import { useState, useEffect, useMemo } from "react";
import { Flame, Target, Trophy, Star, Zap, Calendar } from "lucide-react";

interface ReadingStreakProps {
  readCount: number;
  bookmarkCount: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayCount: number;
  dailyGoal: number;
  totalRead: number;
  weekHistory: number[]; // last 7 days
  badges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  description: string;
}

function getStreakData(): StreakData {
  try {
    const raw = localStorage.getItem("feedbot-streak");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    currentStreak: 0,
    longestStreak: 0,
    todayCount: 0,
    dailyGoal: 10,
    totalRead: 0,
    weekHistory: [0, 0, 0, 0, 0, 0, 0],
    badges: [],
  };
}

function saveStreakData(data: StreakData) {
  localStorage.setItem("feedbot-streak", JSON.stringify(data));
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function ReadingStreak({ readCount, bookmarkCount }: ReadingStreakProps) {
  const [streak, setStreak] = useState<StreakData>(getStreakData);
  const [showDetails, setShowDetails] = useState(false);

  // Update streak when readCount changes
  useEffect(() => {
    const today = getToday();
    const lastActive = localStorage.getItem("feedbot-streak-date");

    setStreak((prev) => {
      const updated = { ...prev };
      updated.totalRead = readCount;

      if (lastActive !== today) {
        // New day — shift week history
        const daysDiff = lastActive
          ? Math.min(7, Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000))
          : 1;

        if (daysDiff === 1) {
          // Consecutive day
          updated.currentStreak = prev.currentStreak + 1;
          updated.weekHistory = [...prev.weekHistory.slice(1), 0];
        } else if (daysDiff > 1) {
          // Streak broken
          updated.currentStreak = 1;
          const zeros = new Array(Math.min(daysDiff, 7)).fill(0);
          updated.weekHistory = [...prev.weekHistory.slice(zeros.length), ...zeros];
        }

        updated.longestStreak = Math.max(updated.longestStreak, updated.currentStreak);
        updated.todayCount = 0;
        localStorage.setItem("feedbot-streak-date", today);
      }

      // Count items read today
      const prevToday = updated.todayCount;
      if (readCount > prev.totalRead) {
        updated.todayCount = prevToday + (readCount - prev.totalRead);
        updated.weekHistory = [
          ...updated.weekHistory.slice(0, 6),
          updated.todayCount,
        ];
      }

      saveStreakData(updated);
      return updated;
    });
  }, [readCount]);

  const badges = useMemo(() => {
    const b: Badge[] = [
      { id: "first", name: "First Read", icon: "📖", earned: streak.totalRead >= 1, description: "Read your first article" },
      { id: "ten", name: "Curious Mind", icon: "🧠", earned: streak.totalRead >= 10, description: "Read 10 articles" },
      { id: "fifty", name: "Knowledge Seeker", icon: "🔍", earned: streak.totalRead >= 50, description: "Read 50 articles" },
      { id: "hundred", name: "Power Reader", icon: "⚡", earned: streak.totalRead >= 100, description: "Read 100 articles" },
      { id: "streak3", name: "On Fire", icon: "🔥", earned: streak.longestStreak >= 3, description: "3-day reading streak" },
      { id: "streak7", name: "Weekly Warrior", icon: "🏆", earned: streak.longestStreak >= 7, description: "7-day reading streak" },
      { id: "streak30", name: "Monthly Master", icon: "👑", earned: streak.longestStreak >= 30, description: "30-day reading streak" },
      { id: "goal", name: "Goal Crusher", icon: "🎯", earned: streak.todayCount >= streak.dailyGoal, description: "Hit your daily goal" },
      { id: "saver", name: "Curator", icon: "💎", earned: bookmarkCount >= 10, description: "Save 10 articles" },
    ];
    return b;
  }, [streak, bookmarkCount]);

  const goalProgress = Math.min(100, (streak.todayCount / streak.dailyGoal) * 100);
  const earnedCount = badges.filter((b) => b.earned).length;
  const maxBar = Math.max(...streak.weekHistory, streak.dailyGoal);

  return (
    <div className="mb-6">
      {/* Compact streak bar */}
      <button
        onClick={() => setShowDetails((v) => !v)}
        className="flex w-full items-center gap-4 rounded-xl border border-border bg-bg-card px-4 py-3 transition-colors hover:border-primary/40"
      >
        {/* Streak flame */}
        <div className="flex items-center gap-1.5">
          <Flame className={`h-5 w-5 ${streak.currentStreak > 0 ? "text-orange-500" : "text-text-muted"}`} />
          <span className={`text-lg font-bold ${streak.currentStreak > 0 ? "text-orange-500" : "text-text-muted"}`}>
            {streak.currentStreak}
          </span>
          <span className="text-xs text-text-muted">day streak</span>
        </div>

        {/* Mini progress bar */}
        <div className="flex flex-1 items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-text-muted" />
          <div className="h-2 flex-1 rounded-full bg-bg-hover">
            <div
              className={`h-2 rounded-full transition-all ${goalProgress >= 100 ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-text-muted">
            {streak.todayCount}/{streak.dailyGoal}
          </span>
        </div>

        {/* Badges count */}
        <div className="flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-secondary" />
          <span className="text-xs font-medium text-text-muted">
            {earnedCount}/{badges.length}
          </span>
        </div>
      </button>

      {/* Expanded details */}
      {showDetails && (
        <div className="mt-2 rounded-xl border border-border bg-bg-card p-4">
          {/* Weekly activity chart */}
          <div className="mb-4">
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text">
              <Calendar className="h-4 w-4" />
              This Week
            </h4>
            <div className="flex items-end gap-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                <div key={day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-16 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-[24px] rounded-t-md transition-all ${
                        streak.weekHistory[i] > 0 ? "bg-primary" : "bg-bg-hover"
                      } ${streak.weekHistory[i] >= streak.dailyGoal ? "bg-green-500" : ""}`}
                      style={{ height: `${maxBar > 0 ? Math.max(4, (streak.weekHistory[i] / maxBar) * 100) : 4}%` }}
                    />
                    {/* Goal line */}
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-secondary/50"
                      style={{ bottom: `${maxBar > 0 ? (streak.dailyGoal / maxBar) * 100 : 50}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted">{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-bg-hover p-3 text-center">
              <Flame className="mx-auto mb-1 h-4 w-4 text-orange-500" />
              <div className="text-lg font-bold text-text">{streak.currentStreak}</div>
              <div className="text-[10px] text-text-muted">Current</div>
            </div>
            <div className="rounded-lg bg-bg-hover p-3 text-center">
              <Star className="mx-auto mb-1 h-4 w-4 text-secondary" />
              <div className="text-lg font-bold text-text">{streak.longestStreak}</div>
              <div className="text-[10px] text-text-muted">Best</div>
            </div>
            <div className="rounded-lg bg-bg-hover p-3 text-center">
              <Zap className="mx-auto mb-1 h-4 w-4 text-primary" />
              <div className="text-lg font-bold text-text">{streak.totalRead}</div>
              <div className="text-[10px] text-text-muted">Total Read</div>
            </div>
          </div>

          {/* Badges */}
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text">
            <Trophy className="h-4 w-4 text-secondary" />
            Badges ({earnedCount}/{badges.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 text-center transition-all ${
                  badge.earned ? "bg-secondary/10 border border-secondary/30" : "bg-bg-hover opacity-40"
                }`}
                title={badge.description}
              >
                <span className="text-lg">{badge.icon}</span>
                <span className="text-[10px] font-medium text-text">{badge.name}</span>
              </div>
            ))}
          </div>

          {/* Daily goal setter */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs text-text-muted">Daily Goal:</span>
            {[5, 10, 20, 50].map((goal) => (
              <button
                key={goal}
                onClick={() => {
                  setStreak((prev) => {
                    const updated = { ...prev, dailyGoal: goal };
                    saveStreakData(updated);
                    return updated;
                  });
                }}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  streak.dailyGoal === goal
                    ? "bg-primary text-white"
                    : "bg-bg-hover text-text-muted hover:text-text"
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
