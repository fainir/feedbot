"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Filter,
  Mail,
  Flame,
  Trophy,
  AlertTriangle,
  FileText,
  Users,
  Info,
  Heart,
  Trash2,
  Volume2,
  VolumeX,
  Settings,
  BellOff,
  ChevronDown,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

type NotificationType =
  | "new_article"
  | "keyword_alert"
  | "streak_risk"
  | "milestone"
  | "feed_health"
  | "digest_ready"
  | "team_activity"
  | "system_update";

type FilterTab = "all" | "unread" | "alerts" | "social" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

interface NotificationsState {
  notifications: Notification[];
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = "feedbot-notifications-center";
const MAX_NOTIFICATIONS = 100;

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bgColor: string }
> = {
  new_article: {
    icon: FileText,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  keyword_alert: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  streak_risk: {
    icon: Flame,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
  },
  milestone: {
    icon: Trophy,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
  },
  feed_health: {
    icon: Heart,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
  },
  digest_ready: {
    icon: Mail,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  team_activity: {
    icon: Users,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
  system_update: {
    icon: Info,
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
  },
};

const FILTER_TO_TYPES: Record<FilterTab, NotificationType[] | null> = {
  all: null,
  unread: null, // handled separately
  alerts: ["keyword_alert", "streak_risk", "feed_health"],
  social: ["team_activity", "new_article"],
  system: ["system_update", "digest_ready", "milestone"],
};

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function generateSampleNotifications(): Notification[] {
  const now = Date.now();
  return [
    {
      id: generateId(),
      type: "new_article",
      title: "12 new articles in Tech",
      description: "Your Tech feed has new content from The Verge, Ars Technica, and 3 others.",
      timestamp: now - 1000 * 60 * 5,
      read: false,
      actionLabel: "View articles",
    },
    {
      id: generateId(),
      type: "keyword_alert",
      title: "Keyword match: \"AI regulation\"",
      description: "Found 3 articles matching your alert for \"AI regulation\" in the last hour.",
      timestamp: now - 1000 * 60 * 18,
      read: false,
      actionLabel: "View matches",
    },
    {
      id: generateId(),
      type: "streak_risk",
      title: "Reading streak at risk!",
      description: "You haven't read any articles today. Read 3 more to keep your 7-day streak alive.",
      timestamp: now - 1000 * 60 * 60 * 2,
      read: false,
      actionLabel: "Start reading",
    },
    {
      id: generateId(),
      type: "milestone",
      title: "Milestone: 100 articles read!",
      description: "You've read 100 articles this month. That's in the top 10% of FeedBot users.",
      timestamp: now - 1000 * 60 * 60 * 5,
      read: true,
      actionLabel: "Claim badge",
    },
    {
      id: generateId(),
      type: "feed_health",
      title: "Feed health warning",
      description: "Your \"Design\" feed hasn't updated in 3 days. The source may be inactive.",
      timestamp: now - 1000 * 60 * 60 * 8,
      read: true,
      actionLabel: "Check feed",
    },
    {
      id: generateId(),
      type: "digest_ready",
      title: "Your daily digest is ready",
      description: "Today's digest covers AI breakthroughs, market trends, and 5 must-read articles.",
      timestamp: now - 1000 * 60 * 60 * 12,
      read: true,
      actionLabel: "Read digest",
    },
    {
      id: generateId(),
      type: "team_activity",
      title: "Alex shared an article",
      description: "Alex shared \"The Future of Web Development\" in the Team workspace.",
      timestamp: now - 1000 * 60 * 60 * 24,
      read: true,
      actionLabel: "View article",
    },
    {
      id: generateId(),
      type: "system_update",
      title: "FeedBot v2.4 released",
      description: "New features: smart folders, improved search, and dark mode enhancements.",
      timestamp: now - 1000 * 60 * 60 * 48,
      read: true,
    },
  ];
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useNotifications() {
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    soundEnabled: false,
    vibrationEnabled: false,
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setState(JSON.parse(saved));
      } else {
        // First load - generate samples
        const initial: NotificationsState = {
          notifications: generateSampleNotifications(),
          soundEnabled: false,
          vibrationEnabled: false,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        setState(initial);
      }
    } catch {}
  }, []);

  const persist = useCallback((next: NotificationsState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const unreadCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications]
  );

  const markAsRead = useCallback(
    (id: string) => {
      persist({
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      });
    },
    [state, persist]
  );

  const markAllAsRead = useCallback(() => {
    persist({
      ...state,
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    });
  }, [state, persist]);

  const dismiss = useCallback(
    (id: string) => {
      persist({
        ...state,
        notifications: state.notifications.filter((n) => n.id !== id),
      });
    },
    [state, persist]
  );

  const clearAll = useCallback(() => {
    persist({ ...state, notifications: [] });
  }, [state, persist]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotif: Notification = {
        ...notification,
        id: generateId(),
        timestamp: Date.now(),
        read: false,
      };
      const updated = [newNotif, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      persist({ ...state, notifications: updated });
    },
    [state, persist]
  );

  const toggleSound = useCallback(() => {
    persist({ ...state, soundEnabled: !state.soundEnabled });
  }, [state, persist]);

  const toggleVibration = useCallback(() => {
    persist({ ...state, vibrationEnabled: !state.vibrationEnabled });
  }, [state, persist]);

  return {
    notifications: state.notifications,
    unreadCount,
    soundEnabled: state.soundEnabled,
    vibrationEnabled: state.vibrationEnabled,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    addNotification,
    toggleSound,
    toggleVibration,
  };
}

// ── NotificationBell ─────────────────────────────────────────────────

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  const [pulse, setPulse] = useState(false);
  const prevCount = useMemo(() => unreadCount, []);

  // Pulse animation when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevCount) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(t);
    }
  }, [unreadCount, prevCount]);

  return (
    <button
      onClick={onClick}
      className="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className={`absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ${
            pulse ? "animate-pulse" : ""
          }`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

// ── NotificationCard ─────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

function NotificationCard({ notification, onRead, onDismiss }: NotificationCardProps) {
  const [swiping, setSwiping] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);

  const config = TYPE_CONFIG[notification.type];
  const Icon = config.icon;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startX;
    if (diff < 0) setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (offsetX < -100) {
      onDismiss(notification.id);
    }
    setOffsetX(0);
    setSwiping(false);
  };

  return (
    <div
      className="group relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe dismiss background */}
      {offsetX < -20 && (
        <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-500/20 text-red-400">
          <Trash2 className="h-4 w-4" />
        </div>
      )}

      <div
        className={`flex gap-3 px-4 py-3 transition-all ${
          !notification.read
            ? "bg-primary/5 dark:bg-primary/5"
            : "hover:bg-bg-hover/50"
        }`}
        style={{ transform: offsetX < 0 ? `translateX(${offsetX}px)` : undefined }}
        onClick={() => !notification.read && onRead(notification.id)}
      >
        {/* Icon */}
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bgColor}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {!notification.read && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
                <h4
                  className={`truncate text-sm ${
                    !notification.read
                      ? "font-semibold text-text"
                      : "font-medium text-text"
                  }`}
                >
                  {notification.title}
                </h4>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted line-clamp-2">
                {notification.description}
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(notification.id);
              }}
              className="shrink-0 rounded-md p-1 text-text-muted opacity-0 transition-opacity hover:bg-bg-hover hover:text-text group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Footer: timestamp + action */}
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-[10px] text-text-muted">
              {relativeTime(notification.timestamp)}
            </span>
            {notification.actionLabel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRead(notification.id);
                }}
                className="text-[10px] font-medium text-primary hover:text-primary-dark"
              >
                {notification.actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NotificationsCenter ──────────────────────────────────────────────

export function NotificationsCenter() {
  const {
    notifications,
    unreadCount,
    soundEnabled,
    vibrationEnabled,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    toggleSound,
    toggleVibration,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Filter notifications
  const filtered = useMemo(() => {
    let list = notifications;

    if (activeTab === "unread") {
      list = list.filter((n) => !n.read);
    } else {
      const types = FILTER_TO_TYPES[activeTab];
      if (types) {
        list = list.filter((n) => types.includes(n.type));
      }
    }

    return list;
  }, [notifications, activeTab]);

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "alerts", label: "Alerts" },
    { id: "social", label: "Social" },
    { id: "system", label: "System" },
  ];

  if (!open) {
    return (
      <NotificationBell unreadCount={unreadCount} onClick={() => setOpen(true)} />
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Notifications</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Notification settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="border-b border-border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span>Sound</span>
            </div>
            <button
              onClick={toggleSound}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                soundEnabled ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  soundEnabled ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Bell className="h-3.5 w-3.5" />
              <span>Vibration</span>
            </div>
            <button
              onClick={toggleVibration}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                vibrationEnabled ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  vibrationEnabled ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          {notifications.length > 0 && (
            <div className="pt-1">
              {showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Clear all notifications?</span>
                  <button
                    onClick={() => {
                      clearAll();
                      setShowClearConfirm(false);
                    }}
                    className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400 hover:bg-red-500/20"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium text-text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear all notifications
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-bg-hover hover:text-text"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-primary/20 px-1 text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-hover">
              <BellOff className="h-6 w-6 text-text-muted" />
            </div>
            <p className="mt-3 text-sm font-medium text-text">
              {activeTab === "unread" ? "All caught up!" : "No notifications"}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {activeTab === "unread"
                ? "You've read all your notifications."
                : "Notifications will appear here as they arrive."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                onDismiss={dismiss}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <p className="text-center text-[10px] text-text-muted">
            {notifications.length} notification{notifications.length !== 1 ? "s" : ""} total
            {" · "}
            {unreadCount} unread
          </p>
        </div>
      )}
    </div>
  );
}
