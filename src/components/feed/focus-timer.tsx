"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Eye,
  Flame,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  BarChart3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimerMode = "quick" | "focus" | "deep" | "custom";
type TimerState = "idle" | "running" | "paused" | "break";

interface FocusSession {
  date: string; // ISO date
  duration: number; // seconds actually focused
  mode: TimerMode;
  articlesRead: number;
  completedAt: string; // ISO timestamp
}

interface FocusStore {
  sessions: FocusSession[];
  dailyGoalMinutes: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODE_DURATIONS: Record<Exclude<TimerMode, "custom">, number> = {
  quick: 5 * 60,
  focus: 25 * 60,
  deep: 45 * 60,
};

const MODE_LABELS: Record<TimerMode, string> = {
  quick: "Quick Read",
  focus: "Focus Session",
  deep: "Deep Dive",
  custom: "Custom",
};

const BREAK_DURATION = 5 * 60; // 5 min break
const EYE_REST_INTERVAL = 20 * 60; // every 20 min
const STORAGE_KEY = "feedbot-focus-sessions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function loadStore(): FocusStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { sessions: [], dailyGoalMinutes: 60 };
}

function saveStore(store: FocusStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getStreak(sessions: FocusSession[]): number {
  const daysWithSession = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const d = new Date();

  // Check today first
  if (daysWithSession.has(getToday())) {
    streak = 1;
    d.setDate(d.getDate() - 1);
  } else {
    d.setDate(d.getDate() - 1);
  }

  for (; ; d.setDate(d.getDate() - 1)) {
    const key = d.toISOString().split("T")[0];
    if (daysWithSession.has(key)) {
      streak++;
    } else {
      break;
    }
    if (streak > 365) break;
  }
  return streak;
}

function getWeekSessions(sessions: FocusSession[]): number[] {
  const counts: number[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    counts.push(sessions.filter((s) => s.date === key).length);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// FocusTimer (main)
// ---------------------------------------------------------------------------

export function FocusTimer() {
  const [store, setStore] = useState<FocusStore>({ sessions: [], dailyGoalMinutes: 60 });
  const [mode, setMode] = useState<TimerMode>("focus");
  const [customMinutes, setCustomMinutes] = useState(15);
  const [totalSeconds, setTotalSeconds] = useState(MODE_DURATIONS.focus);
  const [remaining, setRemaining] = useState(MODE_DURATIONS.focus);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [articlesThisSession, setArticlesThisSession] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEyeRest, setShowEyeRest] = useState(false);
  const [showBreak, setShowBreak] = useState(false);
  const [breakRemaining, setBreakRemaining] = useState(BREAK_DURATION);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eyeRestRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);

  // Load from localStorage on mount
  useEffect(() => {
    setStore(loadStore());
  }, []);

  // Persist store changes
  const persistStore = useCallback((next: FocusStore) => {
    setStore(next);
    saveStore(next);
  }, []);

  // Set duration when mode changes
  useEffect(() => {
    if (timerState !== "idle") return;
    const dur = mode === "custom" ? customMinutes * 60 : MODE_DURATIONS[mode];
    setTotalSeconds(dur);
    setRemaining(dur);
  }, [mode, customMinutes, timerState]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.code === "Space" && timerState !== "idle" && timerState !== "break") {
        e.preventDefault();
        if (timerState === "running") pauseTimer();
        else if (timerState === "paused") resumeTimer();
      }
      if (e.code === "KeyR" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        resetTimer();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  // ---------------------------------------------------------------------------
  // Timer logic
  // ---------------------------------------------------------------------------

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearEyeRestInterval = useCallback(() => {
    if (eyeRestRef.current) {
      clearInterval(eyeRestRef.current);
      eyeRestRef.current = null;
    }
  }, []);

  const flashChime = useCallback(() => {
    // Visual chime — briefly flash the document title
    const original = document.title;
    document.title = "🔔 Timer done!";
    setTimeout(() => {
      document.title = original;
    }, 3000);
  }, []);

  const completeSession = useCallback(() => {
    clearTimerInterval();
    clearEyeRestInterval();
    const dur = mode === "custom" ? customMinutes * 60 : MODE_DURATIONS[mode];
    const session: FocusSession = {
      date: getToday(),
      duration: dur,
      mode,
      articlesRead: articlesThisSession,
      completedAt: new Date().toISOString(),
    };
    const next = { ...store, sessions: [...store.sessions, session] };
    persistStore(next);

    // Show break
    setShowBreak(true);
    setBreakRemaining(BREAK_DURATION);
    setTimerState("break");
    flashChime();
  }, [mode, customMinutes, articlesThisSession, store, persistStore, clearTimerInterval, clearEyeRestInterval, flashChime]);

  const startTimer = useCallback(() => {
    const dur = mode === "custom" ? customMinutes * 60 : MODE_DURATIONS[mode];
    setTotalSeconds(dur);
    setRemaining(dur);
    setTimerState("running");
    setArticlesThisSession(0);
    sessionStartRef.current = Date.now();
    elapsedBeforePauseRef.current = 0;
    setShowBreak(false);
    setShowEyeRest(false);

    // Eye rest interval
    eyeRestRef.current = setInterval(() => {
      setShowEyeRest(true);
      setTimeout(() => setShowEyeRest(false), 20000); // 20s reminder
    }, EYE_REST_INTERVAL * 1000);
  }, [mode, customMinutes]);

  const pauseTimer = useCallback(() => {
    clearTimerInterval();
    clearEyeRestInterval();
    elapsedBeforePauseRef.current += Math.floor(
      (Date.now() - sessionStartRef.current) / 1000
    );
    setTimerState("paused");
  }, [clearTimerInterval, clearEyeRestInterval]);

  const resumeTimer = useCallback(() => {
    sessionStartRef.current = Date.now();
    setTimerState("running");

    eyeRestRef.current = setInterval(() => {
      setShowEyeRest(true);
      setTimeout(() => setShowEyeRest(false), 20000);
    }, EYE_REST_INTERVAL * 1000);
  }, []);

  const resetTimer = useCallback(() => {
    clearTimerInterval();
    clearEyeRestInterval();
    const dur = mode === "custom" ? customMinutes * 60 : MODE_DURATIONS[mode];
    setTotalSeconds(dur);
    setRemaining(dur);
    setTimerState("idle");
    setArticlesThisSession(0);
    setShowBreak(false);
    setShowEyeRest(false);
    elapsedBeforePauseRef.current = 0;
  }, [mode, customMinutes, clearTimerInterval, clearEyeRestInterval]);

  // Tick
  useEffect(() => {
    if (timerState === "running") {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimerInterval();
    }
    if (timerState === "break") {
      intervalRef.current = setInterval(() => {
        setBreakRemaining((prev) => {
          if (prev <= 1) {
            clearTimerInterval();
            setShowBreak(false);
            setTimerState("idle");
            const dur = mode === "custom" ? customMinutes * 60 : MODE_DURATIONS[mode];
            setRemaining(dur);
            setTotalSeconds(dur);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimerInterval();
    }
  }, [timerState, completeSession, clearTimerInterval, mode, customMinutes]);

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------

  const today = getToday();
  const todaySessions = useMemo(
    () => store.sessions.filter((s) => s.date === today),
    [store.sessions, today]
  );
  const todayFocusMinutes = useMemo(
    () => Math.round(todaySessions.reduce((a, s) => a + s.duration, 0) / 60),
    [todaySessions]
  );
  const streak = useMemo(() => getStreak(store.sessions), [store.sessions]);
  const weekSessions = useMemo(() => getWeekSessions(store.sessions), [store.sessions]);
  const weekMax = Math.max(...weekSessions, 1);

  const avgSessionMinutes = useMemo(() => {
    if (store.sessions.length === 0) return 0;
    const total = store.sessions.reduce((a, s) => a + s.duration, 0);
    return Math.round(total / store.sessions.length / 60);
  }, [store.sessions]);

  const bestDay = useMemo(() => {
    const dayTotals = new Map<string, number>();
    for (const s of store.sessions) {
      dayTotals.set(s.date, (dayTotals.get(s.date) || 0) + s.duration);
    }
    let best = "";
    let bestVal = 0;
    for (const [d, v] of dayTotals) {
      if (v > bestVal) {
        best = d;
        bestVal = v;
      }
    }
    if (!best) return "—";
    const date = new Date(best + "T12:00:00");
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${Math.round(bestVal / 60)}m)`;
  }, [store.sessions]);

  const dailyGoalProgress = Math.min(todayFocusMinutes / store.dailyGoalMinutes, 1);

  // SVG ring values
  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = timerState === "break"
    ? breakRemaining / BREAK_DURATION
    : remaining / totalSeconds;
  const ringOffset = ringCircumference * (1 - ringProgress);

  const isActive = timerState === "running" || timerState === "paused";

  // ---------------------------------------------------------------------------
  // Minimized pill
  // ---------------------------------------------------------------------------

  if (minimized && (timerState === "running" || timerState === "paused" || timerState === "break")) {
    return (
      <FocusTimerPill
        remaining={timerState === "break" ? breakRemaining : remaining}
        state={timerState}
        mode={mode}
        onExpand={() => setMinimized(false)}
        onToggle={() => {
          if (timerState === "running") pauseTimer();
          else if (timerState === "paused") resumeTimer();
        }}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`mb-4 rounded-xl border bg-bg-card transition-all ${
        timerState === "running"
          ? "border-primary/50 shadow-[0_0_16px_-4px] shadow-primary/20"
          : "border-border"
      }`}
    >
      {/* Ambient pulsing border when running */}
      {timerState === "running" && (
        <style>{`
          @keyframes focusPulse {
            0%, 100% { box-shadow: 0 0 8px -2px var(--color-primary, #6366f1); }
            50% { box-shadow: 0 0 20px -2px var(--color-primary, #6366f1); }
          }
          .focus-ambient { animation: focusPulse 3s ease-in-out infinite; }
        `}</style>
      )}

      <div className={timerState === "running" ? "focus-ambient rounded-xl" : ""}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <Timer className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-text">Focus Timer</h3>
            {streak > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                <Flame className="h-3 w-3" />
                {streak}d
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              title={soundEnabled ? "Mute chime" : "Enable chime"}
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </button>
            {(timerState === "running" || timerState === "paused") && (
              <button
                onClick={() => setMinimized(true)}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                title="Minimize"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowStats((v) => !v)}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              title="Stats"
            >
              {showStats ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <BarChart3 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Mode selector — only when idle */}
        {timerState === "idle" && (
          <div className="flex gap-1.5 px-4 pb-2">
            {(["quick", "focus", "deep", "custom"] as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  mode === m
                    ? "bg-primary text-white"
                    : "bg-bg-hover/60 text-text-muted hover:bg-bg-hover hover:text-text"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        )}

        {/* Custom duration input */}
        {timerState === "idle" && mode === "custom" && (
          <div className="flex items-center justify-center gap-2 px-4 pb-2">
            <button
              onClick={() => setCustomMinutes((v) => Math.max(1, v - 5))}
              className="rounded-md border border-border p-1 text-text-muted hover:bg-bg-hover hover:text-text"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-16 text-center text-sm font-bold text-text">
              {customMinutes} min
            </span>
            <button
              onClick={() => setCustomMinutes((v) => Math.min(120, v + 5))}
              className="rounded-md border border-border p-1 text-text-muted hover:bg-bg-hover hover:text-text"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Timer ring */}
        <div className="flex flex-col items-center px-4 py-3">
          <div className="relative h-36 w-36">
            <svg viewBox="0 0 128 128" className="h-36 w-36 -rotate-90">
              {/* Background ring */}
              <circle
                cx="64"
                cy="64"
                r={ringRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-border"
              />
              {/* Progress ring */}
              <circle
                cx="64"
                cy="64"
                r={ringRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-linear ${
                  timerState === "break"
                    ? "text-green-400"
                    : timerState === "paused"
                    ? "text-yellow-400"
                    : "text-primary"
                }`}
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {timerState === "break" ? (
                <>
                  <Coffee className="mb-1 h-5 w-5 text-green-400" />
                  <span className="text-2xl font-bold tabular-nums text-text">
                    {formatTime(breakRemaining)}
                  </span>
                  <span className="text-[10px] text-green-400">Break</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold tabular-nums text-text">
                    {formatTime(remaining)}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {MODE_LABELS[mode]}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-3 flex items-center gap-3">
            {timerState === "idle" && (
              <button
                onClick={startTimer}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                <Play className="h-3.5 w-3.5" />
                Start
              </button>
            )}
            {timerState === "running" && (
              <button
                onClick={pauseTimer}
                className="flex items-center gap-1.5 rounded-lg bg-yellow-500/10 px-4 py-2 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause
              </button>
            )}
            {timerState === "paused" && (
              <button
                onClick={resumeTimer}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                <Play className="h-3.5 w-3.5" />
                Resume
              </button>
            )}
            {isActive && (
              <button
                onClick={resetTimer}
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                title="Reset (R)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            {timerState === "break" && (
              <button
                onClick={resetTimer}
                className="flex items-center gap-1.5 rounded-lg bg-bg-hover px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-border"
              >
                <X className="h-3.5 w-3.5" />
                Skip Break
              </button>
            )}
          </div>

          {/* Keyboard hints */}
          {isActive && (
            <p className="mt-2 text-[10px] text-text-muted">
              Space to {timerState === "running" ? "pause" : "resume"} · R to reset
            </p>
          )}
        </div>

        {/* Eye rest overlay */}
        {showEyeRest && timerState === "running" && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg bg-cyan-500/10 p-3">
            <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
            <div>
              <p className="text-xs font-medium text-cyan-300">Eye Rest Reminder</p>
              <p className="text-[10px] text-cyan-400/80">
                Look away from screen for 20 seconds
              </p>
            </div>
            <button
              onClick={() => setShowEyeRest(false)}
              className="ml-auto shrink-0 rounded-md p-1 text-cyan-400/60 hover:text-cyan-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Break message */}
        {showBreak && timerState === "break" && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg bg-green-500/10 p-3">
            <Coffee className="h-4 w-4 shrink-0 text-green-400 animate-bounce" />
            <div>
              <p className="text-xs font-medium text-green-300">
                Take a 5-minute break!
              </p>
              <p className="text-[10px] text-green-400/80">
                Stretch, hydrate, rest your eyes.
              </p>
            </div>
          </div>
        )}

        {/* Session tracking row */}
        <div className="flex items-center justify-around border-t border-border px-4 py-2.5">
          <div className="text-center">
            <p className="text-xs font-bold text-text">{articlesThisSession}</p>
            <p className="text-[9px] text-text-muted">Articles</p>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-center">
            <p className="text-xs font-bold text-text">{todayFocusMinutes}m</p>
            <p className="text-[9px] text-text-muted">Focus today</p>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-center">
            <p className="text-xs font-bold text-text">{todaySessions.length}</p>
            <p className="text-[9px] text-text-muted">Sessions</p>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-center">
            <p className="text-xs font-bold text-text flex items-center justify-center gap-0.5">
              <Flame className="h-3 w-3 text-orange-400" />
              {streak}
            </p>
            <p className="text-[9px] text-text-muted">Streak</p>
          </div>
        </div>

        {/* Stats panel (collapsible) */}
        {showStats && (
          <div className="border-t border-border px-4 py-3">
            {/* Daily goal progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-text-muted">Daily goal</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-text">
                    {todayFocusMinutes}/{store.dailyGoalMinutes}m
                  </span>
                  <button
                    onClick={() =>
                      persistStore({
                        ...store,
                        dailyGoalMinutes: Math.max(5, store.dailyGoalMinutes - 15),
                      })
                    }
                    className="rounded p-0.5 text-text-muted hover:text-text"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={() =>
                      persistStore({
                        ...store,
                        dailyGoalMinutes: Math.min(480, store.dailyGoalMinutes + 15),
                      })
                    }
                    className="rounded p-0.5 text-text-muted hover:text-text"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-border">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    dailyGoalProgress >= 1 ? "bg-green-400" : "bg-primary"
                  }`}
                  style={{ width: `${dailyGoalProgress * 100}%` }}
                />
              </div>
            </div>

            {/* Week sparkline */}
            <div className="mb-3">
              <span className="text-[11px] text-text-muted">This week</span>
              <div className="mt-1 flex items-end gap-1">
                {weekSessions.map((count, i) => {
                  const dayLabel = new Date(
                    Date.now() - (6 - i) * 86400000
                  ).toLocaleDateString("en", { weekday: "narrow" });
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                      <div
                        className={`w-full rounded-sm transition-colors ${
                          count > 0 ? "bg-primary/70" : "bg-border"
                        }`}
                        style={{ height: `${Math.max(4, (count / weekMax) * 28)}px` }}
                        title={`${dayLabel}: ${count} sessions`}
                      />
                      <span className="text-[8px] text-text-muted">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Extra stats */}
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>Avg session: {avgSessionMinutes}m</span>
              <span>Best day: {bestDay}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FocusTimerPill (floating minimized)
// ---------------------------------------------------------------------------

interface FocusTimerPillProps {
  remaining: number;
  state: TimerState;
  mode: TimerMode;
  onExpand: () => void;
  onToggle: () => void;
}

export function FocusTimerPill({
  remaining,
  state,
  mode,
  onExpand,
  onToggle,
}: FocusTimerPillProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur-sm">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-text"
      >
        {state === "running" ? (
          <Pause className="h-3 w-3 text-primary" />
        ) : state === "break" ? (
          <Coffee className="h-3 w-3 text-green-400" />
        ) : (
          <Play className="h-3 w-3 text-yellow-400" />
        )}
        <span className="text-xs font-bold tabular-nums">{formatTime(remaining)}</span>
      </button>
      <span className="text-[9px] text-text-muted">{MODE_LABELS[mode]}</span>
      <button
        onClick={onExpand}
        className="rounded-full p-0.5 text-text-muted hover:text-text"
        title="Expand"
      >
        <ChevronUp className="h-3 w-3" />
      </button>
    </div>
  );
}
