"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, Clock, ExternalLink } from "lucide-react";
import type { FeedItem } from "@/lib/feed-types";

interface NewItemsBellProps {
  allItems: FeedItem[];
  onOpenReader?: (item: FeedItem) => void;
}

function getLastSeenTimestamp(): number {
  try {
    const ts = localStorage.getItem("feedbot-last-seen");
    if (ts) return parseInt(ts, 10);
  } catch {}
  return Date.now();
}

function setLastSeenTimestamp() {
  localStorage.setItem("feedbot-last-seen", String(Date.now()));
}

export function NewItemsBell({ allItems, onOpenReader }: NewItemsBellProps) {
  const [lastSeen, setLastSeen] = useState(getLastSeenTimestamp);
  const [showDropdown, setShowDropdown] = useState(false);

  const newItems = allItems.filter(
    (item) => new Date(item.publishedAt).getTime() > lastSeen
  );

  const markAllSeen = useCallback(() => {
    setLastSeenTimestamp();
    setLastSeen(Date.now());
    setShowDropdown(false);
  }, []);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-bell-dropdown]")) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  return (
    <div className="relative" data-bell-dropdown>
      <button
        onClick={() => {
          setShowDropdown((v) => !v);
        }}
        className="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title={`${newItems.length} new items`}
        aria-label={`${newItems.length} new items`}
        aria-expanded={showDropdown}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />
        {newItems.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white" aria-hidden="true">
            {newItems.length > 99 ? "99+" : newItems.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-bg-card shadow-xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-text">New Items</h3>
              <p className="text-xs text-text-muted">
                {newItems.length} new since last visit
              </p>
            </div>
            <div className="flex items-center gap-1">
              {newItems.length > 0 && (
                <button
                  onClick={markAllSeen}
                  className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  aria-label="Mark all items as seen"
                >
                  Mark all seen
                </button>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                aria-label="Close notifications"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Items list */}
          <div className="max-h-80 overflow-y-auto">
            {newItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Bell className="mb-2 h-6 w-6 text-text-muted" />
                <p className="text-sm text-text-muted">You&apos;re all caught up!</p>
              </div>
            ) : (
              newItems.slice(0, 20).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 border-b border-border/50 px-4 py-3 transition-colors last:border-0 hover:bg-bg-hover/50"
                >
                  {item.sourceIcon ? (
                    <img
                      src={item.sourceIcon}
                      alt={item.source}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded-sm"
                    />
                  ) : (
                    <div className="mt-0.5 h-5 w-5 shrink-0 rounded-sm bg-primary/20" />
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 text-xs font-medium text-text transition-colors hover:text-primary"
                    >
                      {item.title}
                    </a>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
                      <span>{item.source}</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatNewTime(item.publishedAt)}
                      </span>
                    </div>
                  </div>
                  {onOpenReader && (
                    <button
                      onClick={() => {
                        onOpenReader(item);
                        setShowDropdown(false);
                      }}
                      className="shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                      aria-label={`Open "${item.title}"`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {newItems.length > 20 && (
            <div className="border-t border-border px-4 py-2 text-center">
              <span className="text-xs text-text-muted">
                +{newItems.length - 20} more items
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatNewTime(date: string): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
