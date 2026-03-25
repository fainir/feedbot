"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Bell, BellOff, Clock, BookOpen, Flame, PartyPopper, X } from "lucide-react";

// --- Types ---

type ReminderType =
  | "unread_saved"
  | "inactive_feed"
  | "streak_active"
  | "reading_gap"
  | "unread_summary"
  | "positive_reinforcement";

interface Reminder {
  id: string;
  type: ReminderType;
  message: string;
  ctaLabel: string;
  ctaAction?: string; // identifier for the action
  icon: ReminderType;
  accentColor: string;
  createdAt: number;
}

type ReminderFrequency = "gentle" | "normal" | "aggressive";

interface ReminderSettings {
  enabled: boolean;
  frequency: ReminderFrequency;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
}

interface PersistedState {
  settings: ReminderSettings;
  dismissedIds: Record<string, number>; // reminderId -> timestamp dismissed
  snoozedUntil: number | null;
  shownCountToday: number;
  lastShownDate: string; // "2026-03-25"
  sessionShownCount: number;
}

interface SmartRemindersProps {
  savedArticles?: { id: string; title: string; savedAt: string; read: boolean }[];
  feeds?: { id: string; name: string; lastViewedAt: string }[];
  readingStreak?: number;
  lastReadAt?: string; // ISO date
  unreadCount?: number;
  todayReadCount?: number;
  averageDailyReads?: number;
  isFocusMode?: boolean;
}

// --- Constants ---

const STORAGE_KEY = "feedbot-reminders";
const CYCLE_INTERVAL = 30_000; // 30 seconds
const SNOOZE_DURATION = 60 * 60 * 1000; // 1 hour
const DISMISS_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const MAX_PER_SESSION = 3;
const READING_GAP_HOURS = 8;

const FREQUENCY_LIMITS: Record<ReminderFrequency, number> = {
  gentle: 2,
  normal: 5,
  aggressive: Infinity,
};

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  frequency: "normal",
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
};

const DEFAULT_STATE: PersistedState = {
  settings: DEFAULT_SETTINGS,
  dismissedIds: {},
  snoozedUntil: null,
  shownCountToday: 0,
  lastShownDate: "",
  sessionShownCount: 0,
};

// --- Helpers ---

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
    }
  } catch {}
  return { ...DEFAULT_STATE };
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function isInQuietHours(start: string, end: string): boolean {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g. 09:00 - 17:00)
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Overnight range (e.g. 22:00 - 08:00)
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

function daysBetween(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function hoursSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  return Math.round((Date.now() - then) / (1000 * 60 * 60));
}

function makeReminderId(type: ReminderType, suffix: string): string {
  return `${type}:${suffix}`;
}

// --- Reminder generation ---

function generateReminders(props: SmartRemindersProps): Reminder[] {
  const reminders: Reminder[] = [];
  const {
    savedArticles = [],
    feeds = [],
    readingStreak = 0,
    lastReadAt,
    unreadCount = 0,
    todayReadCount = 0,
    averageDailyReads = 3,
  } = props;

  // 1. Unread saved articles > 2 days old
  for (const article of savedArticles) {
    if (article.read) continue;
    const days = daysBetween(article.savedAt);
    if (days >= 2) {
      const short = article.title.length > 40 ? article.title.slice(0, 37) + "..." : article.title;
      reminders.push({
        id: makeReminderId("unread_saved", article.id),
        type: "unread_saved",
        message: `You saved "${short}" ${days} days ago but haven't read it`,
        ctaLabel: "Read now",
        ctaAction: `read:${article.id}`,
        icon: "unread_saved",
        accentColor: "text-blue-400",
        createdAt: Date.now(),
      });
    }
  }

  // 2. Feeds not viewed recently
  for (const feed of feeds) {
    const days = daysBetween(feed.lastViewedAt);
    if (days >= 3) {
      reminders.push({
        id: makeReminderId("inactive_feed", feed.id),
        type: "inactive_feed",
        message: `You haven't checked your ${feed.name} feed in ${days} days`,
        ctaLabel: "Check feed",
        ctaAction: `feed:${feed.id}`,
        icon: "inactive_feed",
        accentColor: "text-amber-400",
        createdAt: Date.now(),
      });
    }
  }

  // 3. Active reading streak
  if (readingStreak >= 2) {
    reminders.push({
      id: makeReminderId("streak_active", String(readingStreak)),
      type: "streak_active",
      message: `You're on a ${readingStreak}-day reading streak! Don't break it`,
      ctaLabel: "Keep going!",
      icon: "streak_active",
      accentColor: "text-orange-400",
      createdAt: Date.now(),
    });
  }

  // 4. Reading gap > 8 hours
  if (lastReadAt) {
    const hours = hoursSince(lastReadAt);
    if (hours >= READING_GAP_HOURS) {
      reminders.push({
        id: makeReminderId("reading_gap", getToday()),
        type: "reading_gap",
        message: `It's been ${hours} hours since you last read an article`,
        ctaLabel: "Read now",
        icon: "reading_gap",
        accentColor: "text-purple-400",
        createdAt: Date.now(),
      });
    }
  }

  // 5. Unread summary
  if (unreadCount > 0) {
    reminders.push({
      id: makeReminderId("unread_summary", getToday()),
      type: "unread_summary",
      message: `You have ${unreadCount} unread articles across your feeds`,
      ctaLabel: "Read now",
      icon: "unread_summary",
      accentColor: "text-cyan-400",
      createdAt: Date.now(),
    });
  }

  // 6. Positive reinforcement
  if (todayReadCount > 0 && todayReadCount > averageDailyReads) {
    reminders.push({
      id: makeReminderId("positive_reinforcement", getToday()),
      type: "positive_reinforcement",
      message: `Great job! You've read ${todayReadCount} articles today, beating your average`,
      ctaLabel: "Keep going!",
      icon: "positive_reinforcement",
      accentColor: "text-green-400",
      createdAt: Date.now(),
    });
  }

  return reminders;
}

// --- Icon map ---

function ReminderIcon({ type, className }: { type: ReminderType; className?: string }) {
  switch (type) {
    case "unread_saved":
      return <BookOpen className={className} />;
    case "inactive_feed":
      return <Bell className={className} />;
    case "streak_active":
      return <Flame className={className} />;
    case "reading_gap":
      return <Clock className={className} />;
    case "unread_summary":
      return <BookOpen className={className} />;
    case "positive_reinforcement":
      return <PartyPopper className={className} />;
  }
}

// --- Main Component ---

export function SmartReminders(props: SmartRemindersProps) {
  const { isFocusMode = false } = props;
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load persisted state
  useEffect(() => {
    const loaded = loadState();
    // Reset daily count if new day
    if (loaded.lastShownDate !== getToday()) {
      loaded.shownCountToday = 0;
      loaded.lastShownDate = getToday();
      loaded.sessionShownCount = 0;
    }
    setState(loaded);
    setMounted(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (mounted) saveState(state);
  }, [state, mounted]);

  // Generate filtered reminders
  const reminders = useMemo(() => {
    if (!mounted) return [];
    const all = generateReminders(props);
    const now = Date.now();

    // Filter dismissed (within 24h)
    return all.filter((r) => {
      const dismissedAt = state.dismissedIds[r.id];
      if (dismissedAt && now - dismissedAt < DISMISS_COOLDOWN) return false;
      return true;
    });
  }, [props, state.dismissedIds, mounted]);

  // Auto-cycle every 30s
  useEffect(() => {
    if (reminders.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % reminders.length);
    }, CYCLE_INTERVAL);
    return () => clearInterval(timer);
  }, [reminders.length]);

  // Keep index in bounds
  useEffect(() => {
    if (currentIndex >= reminders.length) {
      setCurrentIndex(0);
    }
  }, [reminders.length, currentIndex]);

  const dismiss = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      dismissedIds: { ...prev.dismissedIds, [id]: Date.now() },
    }));
    setCurrentIndex(0);
  }, []);

  const snoozeAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      snoozedUntil: Date.now() + SNOOZE_DURATION,
    }));
    setVisible(false);
  }, []);

  // Should we show anything?
  const shouldShow = useMemo(() => {
    if (!mounted) return false;
    if (!state.settings.enabled) return false;
    if (isFocusMode) return false;
    if (state.snoozedUntil && Date.now() < state.snoozedUntil) return false;
    if (state.sessionShownCount >= MAX_PER_SESSION) return false;
    if (state.shownCountToday >= FREQUENCY_LIMITS[state.settings.frequency]) return false;
    if (isInQuietHours(state.settings.quietHoursStart, state.settings.quietHoursEnd)) return false;
    if (reminders.length === 0) return false;
    return true;
  }, [mounted, state, isFocusMode, reminders.length]);

  // Track shown count
  useEffect(() => {
    if (shouldShow && visible && reminders.length > 0) {
      setState((prev) => {
        if (prev.shownCountToday === 0 && prev.sessionShownCount === 0) {
          return {
            ...prev,
            shownCountToday: prev.shownCountToday + 1,
            sessionShownCount: prev.sessionShownCount + 1,
            lastShownDate: getToday(),
          };
        }
        return prev;
      });
    }
  }, [shouldShow, visible, reminders.length]);

  if (!shouldShow || !visible) return null;

  const current = reminders[currentIndex];
  if (!current) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-xl border border-border bg-bg-card shadow-lg shadow-black/20">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5">
            <Bell className="h-3 w-3 text-text-muted" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Reminder
            </span>
            {reminders.length > 1 && (
              <span className="text-[10px] text-text-muted">
                {currentIndex + 1}/{reminders.length}
              </span>
            )}
          </div>
          <button
            onClick={() => dismiss(current.id)}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-3 pb-3">
          <div className="flex items-start gap-3 py-2">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-hover ${current.accentColor}`}>
              <ReminderIcon type={current.type} className="h-4 w-4" />
            </div>
            <p className="text-sm leading-snug text-text">{current.message}</p>
          </div>

          {/* Actions */}
          <div className="mt-1 flex items-center justify-between">
            <button
              onClick={snoozeAll}
              className="text-[11px] text-text-muted transition-colors hover:text-text"
            >
              Snooze all (1hr)
            </button>
            <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark">
              {current.ctaLabel}
            </button>
          </div>
        </div>

        {/* Progress dots */}
        {reminders.length > 1 && (
          <div className="flex justify-center gap-1 border-t border-border px-3 py-2">
            {reminders.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-border hover:bg-text-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Settings Component ---

export function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const state = loadState();
    setSettings(state.settings);
    setMounted(true);
  }, []);

  const update = useCallback((patch: Partial<ReminderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      const state = loadState();
      state.settings = next;
      saveState(state);
      return next;
    });
  }, []);

  if (!mounted) return null;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
          <Bell className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-text">Smart Reminders</h3>
      </div>

      <div className="space-y-4">
        {/* Enable/disable */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings.enabled ? (
              <Bell className="h-4 w-4 text-text-muted" />
            ) : (
              <BellOff className="h-4 w-4 text-text-muted" />
            )}
            <span className="text-sm text-text">Enable reminders</span>
          </div>
          <button
            onClick={() => update({ enabled: !settings.enabled })}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              settings.enabled ? "bg-primary" : "bg-border"
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                settings.enabled ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {settings.enabled && (
          <>
            {/* Frequency */}
            <div>
              <label className="mb-1.5 block text-xs text-text-muted">Frequency</label>
              <div className="flex gap-1.5">
                {(["gentle", "normal", "aggressive"] as ReminderFrequency[]).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => update({ frequency: freq })}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                      settings.frequency === freq
                        ? "bg-primary text-white"
                        : "bg-bg-hover text-text-muted hover:text-text"
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-text-muted">
                {settings.frequency === "gentle" && "Max 2 reminders per day"}
                {settings.frequency === "normal" && "Max 5 reminders per day"}
                {settings.frequency === "aggressive" && "Unlimited reminders"}
              </p>
            </div>

            {/* Quiet hours */}
            <div>
              <label className="mb-1.5 block text-xs text-text-muted">Quiet hours</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => update({ quietHoursStart: e.target.value })}
                  className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text"
                />
                <span className="text-xs text-text-muted">to</span>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => update({ quietHoursEnd: e.target.value })}
                  className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text"
                />
              </div>
              <p className="mt-1 text-[10px] text-text-muted">
                No reminders during these hours
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
