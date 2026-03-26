"use client";

import { ArrowLeft, Keyboard, Command } from "lucide-react";
import Link from "next/link";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: "J", description: "Move to next item" },
      { keys: "K", description: "Move to previous item" },
      { keys: "O", description: "Open focused item in new tab" },
      { keys: "R", description: "Open focused item in reader" },
      { keys: "Ctrl+1-9", description: "Switch to tab 1-9" },
      { keys: "B", description: "Go to Saved/Bookmarks" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: "M", description: "Mark focused item as read" },
      { keys: "S", description: "Toggle bookmark on focused item" },
      { keys: "Ctrl+T", description: "Create new tab/feed" },
      { keys: "Ctrl+K / Cmd+K", description: "Open command palette" },
    ],
  },
  {
    title: "Search & Filter",
    shortcuts: [
      { keys: "/", description: "Focus search bar" },
      { keys: "Cmd+Shift+F", description: "Open global cross-feed search" },
      { keys: "Esc", description: "Close modal / search / dialog" },
    ],
  },
  {
    title: "Display",
    shortcuts: [
      { keys: "D", description: "Toggle dark/light mode" },
      { keys: "F", description: "Toggle focus/zen mode" },
      { keys: "?", description: "Show/hide keyboard shortcuts" },
    ],
  },
];

function KeyBadge({ text }: { text: string }) {
  return (
    <kbd className="inline-flex items-center rounded-md border border-border bg-bg px-2 py-1 text-xs font-mono font-medium text-text shadow-sm">
      {text}
    </kbd>
  );
}

export default function ShortcutsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Keyboard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Keyboard Shortcuts</h1>
          <p className="text-sm text-text-muted">Navigate FeedBot at the speed of thought</p>
        </div>
      </div>

      {/* Tip */}
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Command className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-text">Pro tip: Command Palette</p>
          <p className="mt-1 text-xs text-text-muted">
            Press <KeyBadge text="Cmd+K" /> to open the command palette — the fastest way to do anything in FeedBot.
            Search for feeds, actions, and navigation all in one place.
          </p>
        </div>
      </div>

      {/* Shortcut Groups */}
      <div className="grid gap-6 sm:grid-cols-2">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title} className="rounded-xl border border-border bg-bg-card p-5">
            <h2 className="mb-4 text-base font-semibold text-text">{group.title}</h2>
            <div className="space-y-3">
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.keys} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-muted">{shortcut.description}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.split(" / ").map((key, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-[10px] text-text-muted">/</span>}
                        <KeyBadge text={key} />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Reference Card */}
      <div className="mt-8 rounded-xl border border-border bg-bg-card p-5 text-center">
        <h3 className="text-sm font-semibold text-text">Cheat Sheet</h3>
        <p className="mt-1 text-xs text-text-muted">
          The most important shortcuts to remember:
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {[
            { key: "Cmd+K", label: "Command palette" },
            { key: "J/K", label: "Navigate" },
            { key: "O", label: "Open" },
            { key: "R", label: "Reader" },
            { key: "/", label: "Search" },
            { key: "?", label: "Help" },
          ].map((s) => (
            <div key={s.key} className="flex flex-col items-center gap-1">
              <KeyBadge text={s.key} />
              <span className="text-[10px] text-text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
