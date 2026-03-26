"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Eye, Timer, Play, Pause, RotateCcw, BookOpen, Check } from "lucide-react";
import Link from "next/link";

export default function FocusReadingPage() {
  const [minutes, setMinutes] = useState(15);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);

  useEffect(() => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = JSON.parse(localStorage.getItem("feedbot-focus-sessions") || "{}");
      setSessionsToday(data[today] || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (!running || secondsLeft <= 0) {
      if (running && secondsLeft <= 0) {
        setRunning(false);
        setCompleted(true);
        // Record session
        try {
          const today = new Date().toISOString().split("T")[0];
          const data = JSON.parse(localStorage.getItem("feedbot-focus-sessions") || "{}");
          data[today] = (data[today] || 0) + 1;
          localStorage.setItem("feedbot-focus-sessions", JSON.stringify(data));
          setSessionsToday(data[today]);
        } catch {}
      }
      return;
    }
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [running, secondsLeft]);

  const start = useCallback(() => {
    setSecondsLeft(minutes * 60);
    setRunning(true);
    setCompleted(false);
  }, [minutes]);

  const toggle = () => setRunning((r) => !r);
  const reset = () => { setRunning(false); setSecondsLeft(0); setCompleted(false); };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = secondsLeft > 0 ? 1 - secondsLeft / (minutes * 60) : 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Eye className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-text">Focus Reading</h1>
        <p className="mt-1 text-sm text-text-muted">Set a timer and read without distractions</p>
      </div>

      {/* Timer Display */}
      <div className="mb-8 flex flex-col items-center">
        <div className="relative mb-6">
          <svg viewBox="0 0 120 120" className="h-48 w-48">
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
            <circle
              cx="60" cy="60" r="54"
              fill="none" stroke="currentColor" strokeWidth="4"
              strokeDasharray={`${progress * 339.3} 339.3`}
              strokeLinecap="round"
              className={completed ? "text-green-400" : "text-primary"}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {completed ? (
              <>
                <Check className="mb-1 h-8 w-8 text-green-400" />
                <span className="text-sm font-medium text-green-400">Done!</span>
              </>
            ) : secondsLeft > 0 ? (
              <span className="text-4xl font-bold tabular-nums text-text">{formatTime(secondsLeft)}</span>
            ) : (
              <span className="text-4xl font-bold text-text-muted">{minutes}:00</span>
            )}
          </div>
        </div>

        {/* Duration Picker */}
        {secondsLeft === 0 && !completed && (
          <div className="mb-6 flex gap-2">
            {[5, 10, 15, 25, 30].map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  minutes === m ? "bg-primary text-white" : "border border-border text-text-muted hover:bg-bg-hover"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {secondsLeft === 0 && !completed ? (
            <button
              onClick={start}
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark"
            >
              <Play className="h-4 w-4" />
              Start Reading
            </button>
          ) : completed ? (
            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
            >
              <RotateCcw className="h-4 w-4" />
              Another Session
            </button>
          ) : (
            <>
              <button
                onClick={toggle}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? "Pause" : "Resume"}
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-text-muted transition-colors hover:bg-bg-hover"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-border bg-bg-card p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
          <BookOpen className="h-4 w-4" />
          <span>Today&apos;s focus sessions: <span className="font-bold text-text">{sessionsToday}</span></span>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">Focus Reading Tips</h3>
        <ul className="space-y-1.5 text-xs text-text-muted">
          <li>Close other tabs and silence notifications before starting</li>
          <li>Use the inline reader (press R) to read without leaving FeedBot</li>
          <li>Try the Pomodoro technique: 25 min reading, 5 min break</li>
          <li>Bookmark articles during the session, review after</li>
        </ul>
      </div>
    </div>
  );
}
