"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Target, Flame, Trophy, ChevronDown, ChevronUp, Minus, Plus, Check } from "lucide-react";

interface ReadingGoalsProps {
  readIds: Set<string>;
  allItems: { id: string; publishedAt: string }[];
}

interface GoalData {
  dailyTarget: number;
  history: Record<string, number>; // "2026-03-25" -> count
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getStreak(history: Record<string, number>, target: number): number {
  let streak = 0;
  const today = new Date();

  // Check if today's goal is met - if so, count today
  const todayKey = getToday();
  if ((history[todayKey] || 0) >= target) {
    streak = 1;
  } else {
    // If today's goal isn't met yet, start from yesterday
    today.setDate(today.getDate() - 1);
  }

  // Walk backwards from the starting day
  const start = new Date(today);
  if (streak === 0) {
    // Start checking from yesterday if today not met
  } else {
    start.setDate(start.getDate() - 1);
  }

  for (let d = new Date(start); ; d.setDate(d.getDate() - 1)) {
    const key = d.toISOString().split("T")[0];
    if ((history[key] || 0) >= target) {
      streak++;
    } else {
      break;
    }
    // Don't go more than 365 days back
    if (streak > 365) break;
  }

  return streak;
}

function getWeekData(history: Record<string, number>, target: number): { day: string; count: number; met: boolean }[] {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const count = history[key] || 0;
    days.push({
      day: d.toLocaleDateString("en", { weekday: "short" }),
      count,
      met: count >= target,
    });
  }
  return days;
}

export function ReadingGoals({ readIds, allItems }: ReadingGoalsProps) {
  const [goalData, setGoalData] = useState<GoalData>({ dailyTarget: 5, history: {} });
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState(5);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("feedbot-reading-goals");
      if (saved) {
        const parsed = JSON.parse(saved);
        setGoalData(parsed);
        setTempTarget(parsed.dailyTarget);
      }
    } catch {}
  }, []);

  // Count today's reads from readIds + allItems timestamps
  const todaysReads = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let count = 0;
    for (const item of allItems) {
      if (readIds.has(item.id)) {
        // Count if the item was published today or we're tracking it as read
        count++;
      }
    }
    // Use the history count for today if it exists, otherwise estimate
    return goalData.history[getToday()] || 0;
  }, [readIds, allItems, goalData.history]);

  // Track reads - update today's count when readIds changes
  useEffect(() => {
    const today = getToday();
    const currentCount = readIds.size;

    setGoalData((prev) => {
      const prevTotal = Object.values(prev.history).reduce((a, b) => a + b, 0);
      const todayCount = Math.max(currentCount - prevTotal + (prev.history[today] || 0), prev.history[today] || 0);

      if (todayCount === (prev.history[today] || 0)) return prev;

      const next = {
        ...prev,
        history: { ...prev.history, [today]: todayCount },
      };
      localStorage.setItem("feedbot-reading-goals", JSON.stringify(next));
      return next;
    });
  }, [readIds.size]);

  const saveTarget = useCallback(() => {
    setGoalData((prev) => {
      const next = { ...prev, dailyTarget: tempTarget };
      localStorage.setItem("feedbot-reading-goals", JSON.stringify(next));
      return next;
    });
    setEditing(false);
  }, [tempTarget]);

  const { dailyTarget, history } = goalData;
  const todayCount = history[getToday()] || 0;
  const progress = Math.min(todayCount / dailyTarget, 1);
  const streak = useMemo(() => getStreak(history, dailyTarget), [history, dailyTarget]);
  const weekData = useMemo(() => getWeekData(history, dailyTarget), [history, dailyTarget]);
  const goalMet = todayCount >= dailyTarget;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-3">
      <div className="flex items-center gap-3">
        {/* Progress ring */}
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
              strokeDasharray={`${progress * 97.4} 97.4`}
              strokeLinecap="round"
              className={goalMet ? "text-green-400" : "text-primary"}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {goalMet ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <span className="text-[10px] font-bold text-text">
                {todayCount}/{dailyTarget}
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text">
              {goalMet ? "Daily goal reached!" : `${dailyTarget - todayCount} more to go`}
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                <Flame className="h-3 w-3" />
                {streak}d streak
              </span>
            )}
          </div>
          {/* Mini progress bar */}
          <div className="mt-1 h-1.5 w-full rounded-full bg-border">
            <div
              className={`h-1.5 rounded-full transition-all ${goalMet ? "bg-green-400" : "bg-primary"}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Expand/Edit */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {/* Week visualization */}
          <div className="mb-3 flex items-end justify-between gap-1">
            {weekData.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-md transition-colors ${
                    d.met
                      ? "bg-green-400/80"
                      : d.count > 0
                      ? "bg-primary/40"
                      : "bg-border"
                  }`}
                  style={{ height: `${Math.max(8, (d.count / dailyTarget) * 32)}px` }}
                  title={`${d.day}: ${d.count} articles`}
                />
                <span className="text-[9px] text-text-muted">{d.day}</span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" />
              Best streak: {Math.max(streak, ...Object.keys(history).length > 0 ? [streak] : [0])}d
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              This week: {weekData.filter((d) => d.met).length}/7 goals met
            </div>
          </div>

          {/* Edit target */}
          {editing ? (
            <div className="flex items-center justify-between rounded-lg bg-bg-hover/50 px-3 py-2">
              <span className="text-xs text-text-muted">Daily reading goal:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTempTarget((v) => Math.max(1, v - 1))}
                  className="rounded-md border border-border p-1 text-text-muted hover:bg-bg-hover hover:text-text"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-text">{tempTarget}</span>
                <button
                  onClick={() => setTempTarget((v) => Math.min(50, v + 1))}
                  className="rounded-md border border-border p-1 text-text-muted hover:bg-bg-hover hover:text-text"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  onClick={saveTarget}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-dark"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setTempTarget(dailyTarget); setEditing(true); }}
              className="text-xs text-text-muted hover:text-primary"
            >
              Edit daily goal ({dailyTarget} articles/day)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
