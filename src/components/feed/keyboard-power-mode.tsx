"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Terminal, Command, Keyboard, Zap } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mode = "normal" | "search" | "command" | "visual";

interface PowerModeState {
  enabled: boolean;
  mode: Mode;
  countPrefix: string;
  commandBuffer: string;
  lastAction: string;
  currentIndex: number;
  totalItems: number;
  feedName: string;
  visualAnchor: number;
  visualEnd: number;
  commandSuggestions: string[];
  gPending: boolean;
}

const COMMANDS = [
  "mark-all-read",
  "refresh",
  "export",
  "sort newest",
  "sort oldest",
];

const MODE_META: Record<Mode, { label: string; color: string; darkColor: string; key: string }> = {
  normal: { label: "NORMAL", color: "bg-green-500 text-white", darkColor: "dark:bg-green-600", key: "Esc" },
  search: { label: "SEARCH", color: "bg-yellow-500 text-black", darkColor: "dark:bg-yellow-500", key: "/" },
  command: { label: "COMMAND", color: "bg-blue-500 text-white", darkColor: "dark:bg-blue-600", key: ":" },
  visual: { label: "VISUAL", color: "bg-purple-500 text-white", darkColor: "dark:bg-purple-600", key: "v" },
};

const STORAGE_KEY = "feedbot-power-mode";

// ---------------------------------------------------------------------------
// Helper: resolve count prefix
// ---------------------------------------------------------------------------

function resolveCount(prefix: string): number {
  const n = parseInt(prefix, 10);
  return isNaN(n) || n < 1 ? 1 : Math.min(n, 999);
}

// ---------------------------------------------------------------------------
// PowerModeToggle
// ---------------------------------------------------------------------------

export function PowerModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new CustomEvent("powermode-toggle", { detail: next }));
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        enabled
          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
          : "bg-bg-hover text-text-muted hover:text-text"
      }`}
      title="Toggle Keyboard Power Mode (vim-style navigation)"
    >
      <Zap className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Power Mode</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// KeyboardPowerMode
// ---------------------------------------------------------------------------

export function KeyboardPowerMode({
  totalItems = 0,
  feedName = "All Feeds",
  onNavigate,
  onStar,
  onExpand,
  onOpenTab,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
  onExport,
  onSort,
  onSearch,
  onScrollDown,
  onScrollUp,
}: {
  totalItems?: number;
  feedName?: string;
  onNavigate?: (index: number) => void;
  onStar?: (index: number) => void;
  onExpand?: (index: number) => void;
  onOpenTab?: (index: number) => void;
  onMarkRead?: (index: number) => void;
  onMarkAllRead?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onSort?: (order: "newest" | "oldest") => void;
  onSearch?: (query: string) => void;
  onScrollDown?: () => void;
  onScrollUp?: () => void;
}) {
  const [state, setState] = useState<PowerModeState>({
    enabled: false,
    mode: "normal",
    countPrefix: "",
    commandBuffer: "",
    lastAction: "",
    currentIndex: 0,
    totalItems,
    feedName,
    visualAnchor: -1,
    visualEnd: -1,
    commandSuggestions: [],
    gPending: false,
  });

  const commandInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync props
  useEffect(() => {
    setState((s) => ({ ...s, totalItems, feedName }));
  }, [totalItems, feedName]);

  // Listen for toggle events and localStorage init
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === "true";
    setState((s) => ({ ...s, enabled: stored }));

    const handler = (e: Event) => {
      const enabled = (e as CustomEvent).detail as boolean;
      setState((s) => ({
        ...s,
        enabled,
        mode: "normal",
        countPrefix: "",
        commandBuffer: "",
        gPending: false,
      }));
    };
    window.addEventListener("powermode-toggle", handler);
    return () => window.removeEventListener("powermode-toggle", handler);
  }, []);

  // Action logger
  const logAction = useCallback((action: string) => {
    setState((s) => ({ ...s, lastAction: action }));
  }, []);

  // Navigate helper
  const moveTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalItems - 1));
      setState((s) => ({ ...s, currentIndex: clamped }));
      onNavigate?.(clamped);
      return clamped;
    },
    [totalItems, onNavigate]
  );

  // Execute command
  const executeCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim().toLowerCase();
      if (trimmed === "mark-all-read") {
        onMarkAllRead?.();
        logAction("Marked all as read");
      } else if (trimmed === "refresh") {
        onRefresh?.();
        logAction("Refreshed feed");
      } else if (trimmed === "export") {
        onExport?.();
        logAction("Exported feed");
      } else if (trimmed === "sort newest") {
        onSort?.("newest");
        logAction("Sorted: newest first");
      } else if (trimmed === "sort oldest") {
        onSort?.("oldest");
        logAction("Sorted: oldest first");
      } else {
        logAction(`Unknown command: ${trimmed}`);
      }
      setState((s) => ({ ...s, mode: "normal", commandBuffer: "", commandSuggestions: [], gPending: false }));
    },
    [onMarkAllRead, onRefresh, onExport, onSort, logAction]
  );

  // -----------------------------------------------------------------------
  // Main keyboard handler
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!state.enabled) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // --- Command mode input ---
      if (state.mode === "command") {
        if (e.key === "Escape") {
          e.preventDefault();
          setState((s) => ({ ...s, mode: "normal", commandBuffer: "", commandSuggestions: [], gPending: false }));
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          executeCommand(state.commandBuffer);
          return;
        }
        // Let the input handle typing
        return;
      }

      // --- Search mode ---
      if (state.mode === "search") {
        if (e.key === "Escape") {
          e.preventDefault();
          setState((s) => ({ ...s, mode: "normal", gPending: false }));
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const input = searchInputRef.current;
          if (input) {
            onSearch?.(input.value);
            logAction(`Searched: "${input.value}"`);
          }
          setState((s) => ({ ...s, mode: "normal", gPending: false }));
          return;
        }
        return;
      }

      // Don't intercept when user is typing in unrelated inputs
      if (isInput) return;

      // --- Visual mode ---
      if (state.mode === "visual") {
        if (e.key === "Escape") {
          e.preventDefault();
          setState((s) => ({ ...s, mode: "normal", visualAnchor: -1, visualEnd: -1, gPending: false }));
          logAction("Exited visual mode");
          return;
        }
        if (e.key === "j") {
          e.preventDefault();
          const next = Math.min(state.visualEnd + 1, totalItems - 1);
          setState((s) => ({ ...s, visualEnd: next, currentIndex: next }));
          onNavigate?.(next);
          return;
        }
        if (e.key === "k") {
          e.preventDefault();
          const next = Math.max(state.visualEnd - 1, 0);
          setState((s) => ({ ...s, visualEnd: next, currentIndex: next }));
          onNavigate?.(next);
          return;
        }
        if (e.key === "m") {
          e.preventDefault();
          const start = Math.min(state.visualAnchor, state.visualEnd);
          const end = Math.max(state.visualAnchor, state.visualEnd);
          for (let i = start; i <= end; i++) onMarkRead?.(i);
          logAction(`Marked ${end - start + 1} items as read`);
          setState((s) => ({ ...s, mode: "normal", visualAnchor: -1, visualEnd: -1, gPending: false }));
          return;
        }
        if (e.key === "s") {
          e.preventDefault();
          const start = Math.min(state.visualAnchor, state.visualEnd);
          const end = Math.max(state.visualAnchor, state.visualEnd);
          for (let i = start; i <= end; i++) onStar?.(i);
          logAction(`Bookmarked ${end - start + 1} items`);
          setState((s) => ({ ...s, mode: "normal", visualAnchor: -1, visualEnd: -1, gPending: false }));
          return;
        }
        return;
      }

      // --- Normal mode ---

      // Handle 'g' prefix for gg
      if (state.gPending) {
        if (e.key === "g") {
          e.preventDefault();
          moveTo(0);
          logAction("Jumped to top");
          setState((s) => ({ ...s, gPending: false, countPrefix: "" }));
          return;
        }
        // Any other key cancels the g prefix
        setState((s) => ({ ...s, gPending: false }));
      }

      // Count prefix: digits accumulate
      if (e.key >= "0" && e.key <= "9" && !e.ctrlKey && !e.metaKey) {
        // Don't capture 0 as a leading digit (0 has no vim meaning here as prefix start)
        if (e.key === "0" && state.countPrefix === "") return;
        e.preventDefault();
        setState((s) => ({ ...s, countPrefix: s.countPrefix + e.key }));
        return;
      }

      const count = resolveCount(state.countPrefix);
      const clearCount = () => setState((s) => ({ ...s, countPrefix: "" }));

      // Mode transitions
      if (e.key === ":" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setState((s) => ({ ...s, mode: "command", commandBuffer: "", commandSuggestions: COMMANDS, countPrefix: "" }));
        setTimeout(() => commandInputRef.current?.focus(), 0);
        return;
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setState((s) => ({ ...s, mode: "search", countPrefix: "" }));
        setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }
      if (e.key === "v" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setState((s) => ({
          ...s,
          mode: "visual",
          visualAnchor: s.currentIndex,
          visualEnd: s.currentIndex,
          countPrefix: "",
        }));
        logAction("Entered visual mode");
        return;
      }

      // Navigation
      if (e.key === "j" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        moveTo(state.currentIndex + count);
        logAction(count > 1 ? `Moved down ${count}` : "Moved down");
        clearCount();
        return;
      }
      if (e.key === "k" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        moveTo(state.currentIndex - count);
        logAction(count > 1 ? `Moved up ${count}` : "Moved up");
        clearCount();
        return;
      }
      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setState((s) => ({ ...s, gPending: true }));
        clearCount();
        return;
      }
      if (e.key === "G" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        moveTo(totalItems - 1);
        logAction("Jumped to bottom");
        clearCount();
        return;
      }

      // n/N: next/previous unread (moves by count)
      if (e.key === "n" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        moveTo(state.currentIndex + count);
        logAction("Next unread");
        clearCount();
        return;
      }
      if (e.key === "N" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        moveTo(state.currentIndex - count);
        logAction("Previous unread");
        clearCount();
        return;
      }

      // Actions
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onStar?.(state.currentIndex);
        logAction("Bookmarked");
        clearCount();
        return;
      }
      if (e.key === "e" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onExpand?.(state.currentIndex);
        logAction("Toggled expand");
        clearCount();
        return;
      }
      if (e.key === "t" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onOpenTab?.(state.currentIndex);
        logAction("Opened in new tab");
        clearCount();
        return;
      }
      if (e.key === " " && !e.shiftKey) {
        e.preventDefault();
        onScrollDown?.();
        logAction("Scrolled down");
        clearCount();
        return;
      }
      if (e.key === " " && e.shiftKey) {
        e.preventDefault();
        onScrollUp?.();
        logAction("Scrolled up");
        clearCount();
        return;
      }

      // Escape always resets
      if (e.key === "Escape") {
        e.preventDefault();
        setState((s) => ({ ...s, mode: "normal", countPrefix: "", gPending: false }));
        return;
      }

      // Unrecognized key: clear count prefix
      clearCount();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    state.enabled,
    state.mode,
    state.currentIndex,
    state.countPrefix,
    state.commandBuffer,
    state.visualAnchor,
    state.visualEnd,
    state.gPending,
    totalItems,
    moveTo,
    executeCommand,
    logAction,
    onNavigate,
    onStar,
    onExpand,
    onOpenTab,
    onMarkRead,
    onSearch,
    onScrollDown,
    onScrollUp,
  ]);

  // Handle command buffer changes for autocomplete
  const onCommandInput = (value: string) => {
    const suggestions = COMMANDS.filter((c) => c.startsWith(value.toLowerCase()));
    setState((s) => ({ ...s, commandBuffer: value, commandSuggestions: suggestions }));
  };

  // Don't render anything if disabled
  if (!state.enabled) return null;

  // Visual selection range
  const visualStart = Math.min(state.visualAnchor, state.visualEnd);
  const visualEnd = Math.max(state.visualAnchor, state.visualEnd);
  const visualCount = state.mode === "visual" ? visualEnd - visualStart + 1 : 0;

  // Key hints per mode
  const keyHints: Record<Mode, string> = {
    normal: state.countPrefix
      ? `${state.countPrefix}_ | j/k: move | Esc: clear`
      : state.gPending
      ? "g: top | Esc: cancel"
      : "j/k: move | /: search | :: cmd | v: visual | s: star | e: expand | t: open tab",
    search: "Enter: search | Esc: cancel",
    command: "Enter: execute | Tab: complete | Esc: cancel",
    visual: `${visualCount} selected | j/k: extend | m: mark read | s: bookmark | Esc: exit`,
  };

  const meta = MODE_META[state.mode];

  return (
    <>
      {/* Status Bar - fixed at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-1.5 text-xs">
          {/* Mode badge */}
          <span className={`rounded px-2 py-0.5 font-mono font-bold ${meta.color} ${meta.darkColor}`}>
            {meta.label}
          </span>

          {/* Separator */}
          <span className="text-border">|</span>

          {/* Position */}
          <span className="flex items-center gap-1 text-text-muted">
            <Terminal className="h-3 w-3" />
            {totalItems > 0 ? (
              <span>
                {state.currentIndex + 1} of {totalItems} articles
              </span>
            ) : (
              <span>No articles</span>
            )}
          </span>

          {/* Separator */}
          <span className="text-border">|</span>

          {/* Feed name */}
          <span className="flex items-center gap-1 text-text-muted">
            <Keyboard className="h-3 w-3" />
            <span className="max-w-[120px] truncate">{state.feedName}</span>
          </span>

          {/* Separator */}
          <span className="text-border">|</span>

          {/* Last action */}
          {state.lastAction && (
            <>
              <span className="text-text-muted italic">{state.lastAction}</span>
              <span className="text-border">|</span>
            </>
          )}

          {/* Count prefix indicator */}
          {state.countPrefix && (
            <>
              <span className="font-mono font-bold text-primary">{state.countPrefix}_</span>
              <span className="text-border">|</span>
            </>
          )}

          {/* Key hints - pushed to the right */}
          <span className="ml-auto flex items-center gap-1 text-text-muted">
            <Command className="h-3 w-3" />
            <span className="hidden md:inline">{keyHints[state.mode]}</span>
            <span className="md:hidden">
              {state.mode === "normal" ? "j/k /: v" : "Esc: back"}
            </span>
          </span>
        </div>

        {/* Command mode input */}
        {state.mode === "command" && (
          <div className="border-t border-border px-4 py-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-400">:</span>
              <input
                ref={commandInputRef}
                type="text"
                value={state.commandBuffer}
                onChange={(e) => onCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Tab" && state.commandSuggestions.length > 0) {
                    e.preventDefault();
                    onCommandInput(state.commandSuggestions[0]);
                  }
                }}
                className="flex-1 bg-transparent font-mono text-xs text-text outline-none placeholder:text-text-muted"
                placeholder="Type a command... (mark-all-read, refresh, export, sort newest/oldest)"
                autoFocus
              />
            </div>
            {state.commandSuggestions.length > 0 && state.commandBuffer && (
              <div className="mt-1 flex flex-wrap gap-1">
                {state.commandSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => executeCommand(s)}
                    className="rounded bg-bg-hover px-2 py-0.5 font-mono text-[10px] text-text-muted hover:text-text transition-colors"
                  >
                    :{s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search mode input */}
        {state.mode === "search" && (
          <div className="border-t border-border px-4 py-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-yellow-400">/</span>
              <input
                ref={searchInputRef}
                type="text"
                className="flex-1 bg-transparent font-mono text-xs text-text outline-none placeholder:text-text-muted"
                placeholder="Search articles..."
                autoFocus
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom padding so content isn't hidden behind the status bar */}
      <div className="h-10" />
    </>
  );
}
