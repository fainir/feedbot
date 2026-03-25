"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Shield,
  ShieldCheck,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Database,
  ToggleLeft,
  ToggleRight,
  FileText,
  X,
} from "lucide-react";

// --- Types ---

interface StorageEntry {
  key: string;
  sizeKB: number;
  itemCount: number;
  label: string;
  category: "history" | "bookmarks" | "analytics" | "settings" | "other";
}

interface PrivacySettings {
  analyticsTracking: boolean;
  personalization: boolean;
  notificationData: boolean;
  doNotTrack: boolean;
  retentionDays: number; // 0 = forever
}

interface ActivityLogEntry {
  action: string;
  detail: string;
  timestamp: number;
}

const PRIVACY_SETTINGS_KEY = "feedbot-privacy-settings";
const ACTIVITY_LOG_KEY = "feedbot-activity-log";
const STORAGE_LIMIT_KB = 5120; // ~5MB

const DEFAULT_SETTINGS: PrivacySettings = {
  analyticsTracking: true,
  personalization: true,
  notificationData: true,
  doNotTrack: false,
  retentionDays: 0,
};

const CATEGORY_LABELS: Record<string, string> = {
  history: "Reading History",
  bookmarks: "Bookmarks",
  analytics: "Analytics & Goals",
  settings: "Settings",
  other: "Other",
};

const RETENTION_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 0, label: "Forever" },
];

// --- Helpers ---

function categorizeKey(key: string): StorageEntry["category"] {
  if (key.includes("read") || key.includes("history") || key.includes("progress")) return "history";
  if (key.includes("bookmark") || key.includes("save")) return "bookmarks";
  if (key.includes("goal") || key.includes("streak") || key.includes("speed") || key.includes("analytics")) return "analytics";
  if (key.includes("setting") || key.includes("privacy") || key.includes("theme") || key.includes("filter") || key.includes("sort") || key.includes("mute") || key.includes("alert") || key.includes("notification") || key.includes("folder") || key.includes("brief")) return "settings";
  return "other";
}

function friendlyKeyName(key: string): string {
  return key
    .replace("feedbot-", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getByteSize(value: string): number {
  return new Blob([value]).size;
}

function countItems(value: string): number {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.length;
    if (typeof parsed === "object" && parsed !== null) return Object.keys(parsed).length;
  } catch {}
  return 1;
}

function scanStorage(): StorageEntry[] {
  const entries: StorageEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("feedbot-")) continue;
    const value = localStorage.getItem(key) || "";
    entries.push({
      key,
      sizeKB: Math.round((getByteSize(value) / 1024) * 100) / 100,
      itemCount: countItems(value),
      label: friendlyKeyName(key),
      category: categorizeKey(key),
    });
  }
  return entries.sort((a, b) => b.sizeKB - a.sizeKB);
}

function loadSettings(): PrivacySettings {
  try {
    const saved = localStorage.getItem(PRIVACY_SETTINGS_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: PrivacySettings) {
  localStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(settings));
}

function loadActivityLog(): ActivityLogEntry[] {
  try {
    const saved = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function logActivity(action: string, detail: string) {
  const log = loadActivityLog();
  log.unshift({ action, detail, timestamp: Date.now() });
  // Keep only last 20
  const trimmed = log.slice(0, 20);
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(trimmed));
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --- Components ---

function ToggleSwitch({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        enabled ? "bg-primary" : "bg-border"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-text-muted">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export function PrivacyDashboard() {
  const [entries, setEntries] = useState<StorageEntry[]>([]);
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<"overview" | "actions" | "controls" | "retention" | "log">("overview");
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);

  // Load data
  useEffect(() => {
    setEntries(scanStorage());
    setSettings(loadSettings());
    setActivityLog(loadActivityLog());
  }, []);

  const totalSizeKB = useMemo(
    () => entries.reduce((sum, e) => sum + e.sizeKB, 0),
    [entries]
  );

  const usagePercent = useMemo(
    () => Math.min((totalSizeKB / STORAGE_LIMIT_KB) * 100, 100),
    [totalSizeKB]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, { count: number; sizeKB: number }> = {};
    for (const e of entries) {
      if (!counts[e.category]) counts[e.category] = { count: 0, sizeKB: 0 };
      counts[e.category].count += e.itemCount;
      counts[e.category].sizeKB += e.sizeKB;
    }
    return counts;
  }, [entries]);

  const refreshData = useCallback(() => {
    setEntries(scanStorage());
    setActivityLog(loadActivityLog());
  }, []);

  const updateSetting = useCallback(
    (key: keyof PrivacySettings, value: boolean | number) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        // If DNT enabled, disable all tracking
        if (key === "doNotTrack" && value === true) {
          next.analyticsTracking = false;
          next.personalization = false;
          next.notificationData = false;
        }
        // If enabling a tracker, disable DNT
        if (key !== "doNotTrack" && value === true) {
          next.doNotTrack = false;
        }
        saveSettings(next);
        logActivity("Settings Changed", `${key} set to ${value}`);
        refreshData();
        return next;
      });
    },
    [refreshData]
  );

  const handleExportAll = useCallback(() => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("feedbot-")) continue;
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedbot-data-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity("Data Export", "All data exported as JSON");
    refreshData();
  }, [refreshData]);

  const clearByCategory = useCallback(
    (category: StorageEntry["category"], label: string) => {
      const keysToRemove = entries.filter((e) => e.category === category).map((e) => e.key);
      for (const key of keysToRemove) {
        if (key === PRIVACY_SETTINGS_KEY || key === ACTIVITY_LOG_KEY) continue;
        localStorage.removeItem(key);
      }
      logActivity("Data Cleared", `${label}: ${keysToRemove.length} keys removed`);
      refreshData();
    },
    [entries, refreshData]
  );

  const clearAllData = useCallback(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("feedbot-")) keys.push(key);
    }
    for (const key of keys) {
      localStorage.removeItem(key);
    }
    logActivity("Data Cleared", `All data: ${keys.length} keys removed`);
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    refreshData();
  }, [refreshData]);

  const sectionTabs = [
    { id: "overview" as const, label: "Overview", icon: Database },
    { id: "actions" as const, label: "Actions", icon: Trash2 },
    { id: "controls" as const, label: "Controls", icon: Eye },
    { id: "retention" as const, label: "Retention", icon: Clock },
    { id: "log" as const, label: "Log", icon: FileText },
  ];

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Privacy Dashboard"
      >
        <Shield className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Privacy</span>
      </button>
    );
  }

  return (
    <>
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.action();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <div className="mb-4 rounded-xl border border-border bg-bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-text">Privacy Dashboard</h3>
            {settings.doNotTrack && (
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                DNT Active
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-border px-3 py-1.5">
          {sectionTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  activeSection === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-bg-hover hover:text-text"
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* ── Data Overview ── */}
          {activeSection === "overview" && (
            <div className="space-y-3">
              {/* Storage bar */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-text-muted">Storage Used</span>
                  <span className="font-medium text-text">
                    {totalSizeKB.toFixed(1)} KB / {(STORAGE_LIMIT_KB / 1024).toFixed(0)} MB
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-border">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usagePercent > 80 ? "bg-red-400" : usagePercent > 50 ? "bg-yellow-400" : "bg-primary"
                    }`}
                    style={{ width: `${Math.max(usagePercent, 0.5)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-text-muted">
                  {usagePercent.toFixed(1)}% of browser localStorage limit
                </p>
              </div>

              {/* Category breakdown */}
              <div className="space-y-1.5">
                {Object.entries(categoryCounts).map(([cat, { count, sizeKB }]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-lg bg-bg px-3 py-2"
                  >
                    <span className="text-xs text-text">
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-text-muted">
                        {count} items
                      </span>
                      <span className="w-16 text-right text-[10px] font-medium text-text-muted">
                        {sizeKB.toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Individual keys */}
              {entries.length > 0 && (
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-1 text-[11px] text-text-muted hover:text-text">
                    <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                    All storage keys ({entries.length})
                  </summary>
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {entries.map((e) => (
                      <div
                        key={e.key}
                        className="flex items-center justify-between rounded-md bg-bg px-2.5 py-1.5 text-[10px]"
                      >
                        <span className="truncate text-text-muted" title={e.key}>
                          {e.label}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 pl-2">
                          <span className="text-text-muted">{e.itemCount} items</span>
                          <span className="w-14 text-right font-medium text-text-muted">
                            {e.sizeKB.toFixed(2)} KB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {entries.length === 0 && (
                <p className="py-4 text-center text-xs text-text-muted">
                  No FeedBot data stored locally.
                </p>
              )}
            </div>
          )}

          {/* ── Data Actions ── */}
          {activeSection === "actions" && (
            <div className="space-y-2">
              {/* Export */}
              <button
                onClick={handleExportAll}
                className="flex w-full items-center gap-3 rounded-lg bg-bg px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text">Export All Data</p>
                  <p className="text-[10px] text-text-muted">
                    Download everything as a JSON file
                  </p>
                </div>
              </button>

              {/* Clear Reading History */}
              <button
                onClick={() =>
                  setConfirmAction({
                    title: "Clear Reading History?",
                    message:
                      "This will remove all read article tracking. Your reading streaks and progress will be lost. This cannot be undone.",
                    action: () => clearByCategory("history", "Reading History"),
                  })
                }
                className="flex w-full items-center gap-3 rounded-lg bg-bg px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10">
                  <Eye className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text">Clear Reading History</p>
                  <p className="text-[10px] text-text-muted">
                    Remove all read tracking and progress data
                  </p>
                </div>
              </button>

              {/* Clear Bookmarks */}
              <button
                onClick={() =>
                  setConfirmAction({
                    title: "Clear Bookmarks?",
                    message:
                      "This will remove all saved bookmarks. You won't be able to recover them. This cannot be undone.",
                    action: () => clearByCategory("bookmarks", "Bookmarks"),
                  })
                }
                className="flex w-full items-center gap-3 rounded-lg bg-bg px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <Trash2 className="h-4 w-4 text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text">Clear Bookmarks</p>
                  <p className="text-[10px] text-text-muted">
                    Remove all saved bookmarks permanently
                  </p>
                </div>
              </button>

              {/* Clear Analytics */}
              <button
                onClick={() =>
                  setConfirmAction({
                    title: "Clear Analytics?",
                    message:
                      "This will remove reading speed data, goals, streaks, and all analytics. This cannot be undone.",
                    action: () => clearByCategory("analytics", "Analytics"),
                  })
                }
                className="flex w-full items-center gap-3 rounded-lg bg-bg px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                  <Database className="h-4 w-4 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text">Clear Analytics</p>
                  <p className="text-[10px] text-text-muted">
                    Remove speed, goals, streak, and pattern data
                  </p>
                </div>
              </button>

              {/* Clear All */}
              <button
                onClick={() =>
                  setConfirmAction({
                    title: "Clear ALL Data?",
                    message:
                      "This will permanently delete ALL FeedBot data including history, bookmarks, settings, analytics, and preferences. This is irreversible.",
                    action: clearAllData,
                  })
                }
                className="flex w-full items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-left transition-colors hover:bg-red-500/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-red-400">Clear All Data</p>
                  <p className="text-[10px] text-red-400/60">
                    Permanently delete everything. Cannot be undone.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ── Privacy Controls ── */}
          {activeSection === "controls" && (
            <div className="space-y-3">
              {/* Do Not Track */}
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-400" />
                    <div>
                      <p className="text-xs font-medium text-text">Do Not Track Mode</p>
                      <p className="text-[10px] text-text-muted">
                        Disables all non-essential data collection
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={settings.doNotTrack}
                    onToggle={() => updateSetting("doNotTrack", !settings.doNotTrack)}
                  />
                </div>
              </div>

              {/* Individual toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-bg px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {settings.analyticsTracking ? (
                      <Eye className="h-3.5 w-3.5 text-text-muted" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-text-muted" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-text">Analytics Tracking</p>
                      <p className="text-[10px] text-text-muted">
                        Reading speed, patterns, and usage stats
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={settings.analyticsTracking}
                    onToggle={() => updateSetting("analyticsTracking", !settings.analyticsTracking)}
                    disabled={settings.doNotTrack}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-bg px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {settings.personalization ? (
                      <Eye className="h-3.5 w-3.5 text-text-muted" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-text-muted" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-text">Personalization</p>
                      <p className="text-[10px] text-text-muted">
                        Recommendations and content suggestions
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={settings.personalization}
                    onToggle={() => updateSetting("personalization", !settings.personalization)}
                    disabled={settings.doNotTrack}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-bg px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {settings.notificationData ? (
                      <Eye className="h-3.5 w-3.5 text-text-muted" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-text-muted" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-text">Notification Data</p>
                      <p className="text-[10px] text-text-muted">
                        Alert history and notification preferences
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={settings.notificationData}
                    onToggle={() => updateSetting("notificationData", !settings.notificationData)}
                    disabled={settings.doNotTrack}
                  />
                </div>
              </div>

              {settings.doNotTrack && (
                <p className="text-center text-[10px] text-green-400">
                  All non-essential data collection is disabled.
                </p>
              )}
            </div>
          )}

          {/* ── Data Retention ── */}
          {activeSection === "retention" && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">
                Set how long FeedBot keeps your data. Older data will be automatically
                cleaned up when you open the app.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RETENTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSetting("retentionDays", opt.value)}
                    className={`rounded-lg border px-3 py-2.5 text-center text-xs font-medium transition-colors ${
                      settings.retentionDays === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-bg text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-bg p-3">
                <p className="text-[10px] leading-relaxed text-text-muted">
                  {settings.retentionDays === 0
                    ? "Data is kept indefinitely. You can always clear it manually from the Actions tab."
                    : `Data older than ${settings.retentionDays} days will be removed automatically. Settings and preferences are never auto-deleted.`}
                </p>
              </div>
            </div>
          )}

          {/* ── Activity Log ── */}
          {activeSection === "log" && (
            <div className="space-y-1.5">
              {activityLog.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-muted">
                  No recent activity recorded.
                </p>
              ) : (
                activityLog.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between rounded-lg bg-bg px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-text">{entry.action}</p>
                      <p className="truncate text-[10px] text-text-muted">{entry.detail}</p>
                    </div>
                    <span className="shrink-0 pl-2 text-[10px] text-text-muted">
                      {formatTimeAgo(entry.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Privacy Badge (compact indicator) ---

export function PrivacyBadge() {
  const [dntActive, setDntActive] = useState(false);
  const [storageKB, setStorageKB] = useState(0);

  useEffect(() => {
    try {
      const settings = loadSettings();
      setDntActive(settings.doNotTrack);
      const entries = scanStorage();
      setStorageKB(entries.reduce((sum, e) => sum + e.sizeKB, 0));
    } catch {}
  }, []);

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-2.5 py-1 text-[10px] text-text-muted"
      title={`Privacy: ${dntActive ? "Do Not Track active" : "Standard"} | ${storageKB.toFixed(1)} KB stored`}
    >
      {dntActive ? (
        <ShieldCheck className="h-3 w-3 text-green-400" />
      ) : (
        <Shield className="h-3 w-3" />
      )}
      <span>{storageKB.toFixed(0)} KB</span>
      {dntActive && <span className="text-green-400">DNT</span>}
    </div>
  );
}
