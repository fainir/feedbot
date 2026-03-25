"use client";

import { useState, useCallback, useMemo } from "react";
import { VolumeX, Volume2, Clock, X, Plus, Trash2 } from "lucide-react";

export interface MutedSource {
  domain: string;
  muteUntil: string | null; // null = permanent, ISO string = temporary
  mutedAt: string;
}

interface SourceMuteProps {
  mutedSources: MutedSource[];
  onUpdateMuted: (sources: MutedSource[]) => void;
}

const SNOOZE_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "8 hours", hours: 8 },
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
  { label: "Forever", hours: 0 },
];

export function SourceMuteManager({ mutedSources, onUpdateMuted }: SourceMuteProps) {
  const [showManager, setShowManager] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  // Clean expired mutes
  const activeMutes = useMemo(() => {
    const now = Date.now();
    return mutedSources.filter(
      (s) => s.muteUntil === null || new Date(s.muteUntil).getTime() > now
    );
  }, [mutedSources]);

  const addMute = useCallback(
    (domain: string, hours: number) => {
      const clean = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
      if (!clean) return;
      const existing = mutedSources.filter((s) => s.domain !== clean);
      const muteUntil = hours > 0
        ? new Date(Date.now() + hours * 3600000).toISOString()
        : null;
      onUpdateMuted([...existing, { domain: clean, muteUntil, mutedAt: new Date().toISOString() }]);
      setNewDomain("");
    },
    [mutedSources, onUpdateMuted]
  );

  const removeMute = useCallback(
    (domain: string) => {
      onUpdateMuted(mutedSources.filter((s) => s.domain !== domain));
    },
    [mutedSources, onUpdateMuted]
  );

  if (!showManager) {
    return (
      <button
        onClick={() => setShowManager(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Mute sources"
      >
        <VolumeX className="h-3.5 w-3.5" />
        {activeMutes.length > 0 && (
          <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">
            {activeMutes.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <VolumeX className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-semibold text-text">Muted Sources</h3>
          {activeMutes.length > 0 && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
              {activeMutes.length} muted
            </span>
          )}
        </div>
        <button
          onClick={() => setShowManager(false)}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Add new mute */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter domain (e.g., techcrunch.com)"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newDomain.trim()) addMute(newDomain, 0);
            }}
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <div className="group/snooze relative">
            <button
              disabled={!newDomain.trim()}
              className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              Mute
            </button>
            {newDomain.trim() && (
              <div className="absolute right-0 top-full z-20 mt-1 hidden w-36 rounded-xl border border-border bg-bg-card p-1.5 shadow-xl group-hover/snooze:block">
                {SNOOZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => addMute(newDomain, opt.hours)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                  >
                    {opt.hours > 0 ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <VolumeX className="h-3 w-3" />
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Muted list */}
      <div className="max-h-48 overflow-y-auto">
        {activeMutes.length === 0 ? (
          <div className="flex flex-col items-center py-6">
            <Volume2 className="mb-2 h-5 w-5 text-text-muted" />
            <p className="text-xs text-text-muted">No muted sources</p>
          </div>
        ) : (
          activeMutes.map((mute) => (
            <div
              key={mute.domain}
              className="flex items-center gap-3 border-b border-border/50 px-4 py-2 last:border-0"
            >
              <VolumeX className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text">{mute.domain}</p>
                <p className="text-[10px] text-text-muted">
                  {mute.muteUntil
                    ? `Until ${new Date(mute.muteUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                    : "Muted permanently"}
                </p>
              </div>
              <button
                onClick={() => removeMute(mute.domain)}
                className="rounded p-1 text-text-muted transition-colors hover:text-green-400"
                title="Unmute"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Quick mute button for individual feed items */
interface QuickMuteProps {
  domain: string;
  isMuted: boolean;
  onMute: (domain: string, hours: number) => void;
  onUnmute: (domain: string) => void;
}

export function QuickMuteButton({ domain, isMuted, onMute, onUnmute }: QuickMuteProps) {
  const [showOptions, setShowOptions] = useState(false);

  if (isMuted) {
    return (
      <button
        onClick={() => onUnmute(domain)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 transition-all hover:bg-red-500/10 sm:opacity-0 sm:group-hover:opacity-100"
        title="Unmute source"
      >
        <VolumeX className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
        title="Mute this source"
      >
        <VolumeX className="h-3.5 w-3.5" />
      </button>
      {showOptions && (
        <div className="absolute bottom-full right-0 z-20 mb-1 w-36 rounded-lg border border-border bg-bg-card p-1 shadow-lg">
          {SNOOZE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                onMute(domain, opt.hours);
                setShowOptions(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text"
            >
              {opt.hours > 0 ? <Clock className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Filter items to remove muted sources */
export function filterMutedSources<T extends { url: string }>(
  items: T[],
  mutedSources: MutedSource[]
): T[] {
  if (mutedSources.length === 0) return items;
  const now = Date.now();
  const activeDomains = new Set(
    mutedSources
      .filter((s) => s.muteUntil === null || new Date(s.muteUntil).getTime() > now)
      .map((s) => s.domain)
  );
  if (activeDomains.size === 0) return items;

  return items.filter((item) => {
    try {
      const domain = new URL(item.url).hostname.replace("www.", "");
      return !activeDomains.has(domain);
    } catch {
      return true;
    }
  });
}
