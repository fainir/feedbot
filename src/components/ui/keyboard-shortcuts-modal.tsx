"use client";

import { X } from "lucide-react";

const SHORTCUTS = [
  { keys: "?", desc: "Toggle this help" },
  { keys: "/", desc: "Focus search" },
  { keys: "J / K", desc: "Navigate items down / up" },
  { keys: "O", desc: "Open focused item" },
  { keys: "M", desc: "Mark focused item as read" },
  { keys: "R", desc: "Open focused item in reader" },
  { keys: "F", desc: "Toggle focus/zen mode" },
  { keys: "D", desc: "Toggle dark/light mode" },
  { keys: "B", desc: "Go to Saved items" },
  { keys: "Esc", desc: "Close modal / search" },
  { keys: "Ctrl+1–9", desc: "Switch to tab 1–9" },
  { keys: "Ctrl+T", desc: "Create new tab" },
];

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-border bg-bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={keys} className="flex items-center justify-between">
              <span className="text-sm text-text-muted">{desc}</span>
              <kbd className="rounded-md border border-border bg-bg px-2 py-1 text-xs font-mono text-text">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
