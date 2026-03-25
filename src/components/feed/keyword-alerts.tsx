"use client";

import { useState, useCallback, useEffect } from "react";
import { Bell, BellRing, Plus, X, Tag, AlertCircle } from "lucide-react";

export interface KeywordAlert {
  id: string;
  keyword: string;
  color: string;
  enabled: boolean;
  matchCount: number;
}

interface KeywordAlertsProps {
  alerts: KeywordAlert[];
  onUpdateAlerts: (alerts: KeywordAlert[]) => void;
  matchedItemIds: Map<string, string[]>; // itemId -> matching keywords
}

const ALERT_COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#6366f1", "#ec4899",
  "#06b6d4", "#8b5cf6", "#f97316",
];

export function KeywordAlerts({ alerts, onUpdateAlerts, matchedItemIds }: KeywordAlertsProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");

  const totalMatches = Array.from(matchedItemIds.values()).flat().length;

  const addAlert = useCallback(() => {
    if (!newKeyword.trim()) return;
    const alert: KeywordAlert = {
      id: `alert-${Date.now()}`,
      keyword: newKeyword.trim().toLowerCase(),
      color: ALERT_COLORS[alerts.length % ALERT_COLORS.length],
      enabled: true,
      matchCount: 0,
    };
    onUpdateAlerts([...alerts, alert]);
    setNewKeyword("");
  }, [newKeyword, alerts, onUpdateAlerts]);

  const removeAlert = useCallback((id: string) => {
    onUpdateAlerts(alerts.filter((a) => a.id !== id));
  }, [alerts, onUpdateAlerts]);

  const toggleAlert = useCallback((id: string) => {
    onUpdateAlerts(
      alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }, [alerts, onUpdateAlerts]);

  if (alerts.length === 0 && !showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="mb-4 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted transition-colors hover:border-primary/40 hover:text-text"
      >
        <Bell className="h-3.5 w-3.5" />
        Set up keyword alerts
      </button>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowPanel((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2 transition-colors hover:border-primary/40"
      >
        {totalMatches > 0 ? (
          <BellRing className="h-4 w-4 text-secondary animate-pulse" />
        ) : (
          <Bell className="h-4 w-4 text-text-muted" />
        )}
        <span className="flex-1 text-left text-xs font-medium text-text">
          Keyword Alerts
        </span>
        {totalMatches > 0 && (
          <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-bold text-secondary">
            {totalMatches} match{totalMatches !== 1 ? "es" : ""}
          </span>
        )}
        <div className="flex items-center gap-1">
          {alerts.slice(0, 5).map((a) => (
            <div
              key={a.id}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: a.enabled ? a.color : "#666" }}
            />
          ))}
        </div>
      </button>

      {showPanel && (
        <div className="mt-2 rounded-xl border border-border bg-bg-card p-3">
          {/* Existing alerts */}
          <div className="mb-3 space-y-1.5">
            {alerts.map((alert) => {
              const matches = Array.from(matchedItemIds.values()).filter((kws) =>
                kws.includes(alert.keyword)
              ).length;

              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                >
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    className="shrink-0"
                  >
                    <div
                      className={`h-3 w-3 rounded-full transition-opacity ${!alert.enabled ? "opacity-30" : ""}`}
                      style={{ backgroundColor: alert.color }}
                    />
                  </button>
                  <Tag className="h-3 w-3 shrink-0 text-text-muted" />
                  <span className={`flex-1 text-xs font-medium ${alert.enabled ? "text-text" : "text-text-muted line-through"}`}>
                    {alert.keyword}
                  </span>
                  {matches > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${alert.color}20`, color: alert.color }}>
                      {matches}
                    </span>
                  )}
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="shrink-0 rounded p-0.5 text-text-muted transition-colors hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add new */}
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Add keyword (e.g., OpenAI, funding, launch)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addAlert(); }}
              className="flex-1 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <button
              onClick={addAlert}
              disabled={!newKeyword.trim()}
              className="rounded-md bg-primary px-2 py-1 text-xs text-white hover:bg-primary-dark disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility to compute keyword matches across items
export function computeKeywordMatches(
  items: { id: string; title: string; summary: string }[],
  alerts: KeywordAlert[]
): Map<string, string[]> {
  const matches = new Map<string, string[]>();
  const enabledAlerts = alerts.filter((a) => a.enabled);
  if (enabledAlerts.length === 0) return matches;

  for (const item of items) {
    const text = `${item.title} ${item.summary}`.toLowerCase();
    const matchingKeywords: string[] = [];
    for (const alert of enabledAlerts) {
      if (text.includes(alert.keyword)) {
        matchingKeywords.push(alert.keyword);
      }
    }
    if (matchingKeywords.length > 0) {
      matches.set(item.id, matchingKeywords);
    }
  }
  return matches;
}

// Inline highlight component for matched keywords in text
export function HighlightKeywords({
  text,
  keywords,
  alerts,
}: {
  text: string;
  keywords: string[];
  alerts: KeywordAlert[];
}) {
  if (keywords.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${keywords.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const matchedAlert = alerts.find(
          (a) => a.keyword.toLowerCase() === part.toLowerCase() && a.enabled
        );
        if (matchedAlert) {
          return (
            <mark
              key={i}
              className="rounded px-0.5"
              style={{ backgroundColor: `${matchedAlert.color}30`, color: matchedAlert.color }}
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
