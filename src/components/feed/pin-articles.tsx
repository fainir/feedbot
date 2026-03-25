"use client";

import { useState, useEffect, useCallback } from "react";
import { Pin, X } from "lucide-react";
import type { FeedItem } from "@/lib/feed-types";

interface PinnedArticlesProps {
  pinnedIds: Set<string>;
  allItems: FeedItem[];
  onUnpin: (id: string) => void;
  onOpenReader: (item: FeedItem) => void;
}

export function usePinnedArticles() {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("feedbot-pinned");
      if (saved) setPinnedIds(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const togglePin = useCallback((itemId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      localStorage.setItem("feedbot-pinned", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isPinned = useCallback((itemId: string) => pinnedIds.has(itemId), [pinnedIds]);

  return { pinnedIds, togglePin, isPinned };
}

export function PinButton({
  pinned,
  onToggle,
}: {
  pinned: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all sm:opacity-0 sm:group-hover:opacity-100 ${
        pinned
          ? "text-orange-400"
          : "text-text-muted hover:bg-bg-hover hover:text-text"
      }`}
      title={pinned ? "Unpin" : "Pin to top"}
    >
      <Pin className={`h-3.5 w-3.5 ${pinned ? "fill-orange-400/30" : ""}`} />
    </button>
  );
}

export function PinnedArticles({ pinnedIds, allItems, onUnpin, onOpenReader }: PinnedArticlesProps) {
  const pinnedItems = allItems.filter((item) => pinnedIds.has(item.id));

  if (pinnedItems.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Pin className="h-3.5 w-3.5 text-orange-400" />
        <span className="text-xs font-semibold text-text">Pinned</span>
        <span className="rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-400">
          {pinnedItems.length}
        </span>
      </div>
      <div className="space-y-1">
        {pinnedItems.map((item) => (
          <div
            key={item.id}
            className="group/pin flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-hover/50"
          >
            {item.sourceIcon && (
              <img
                src={item.sourceIcon}
                alt=""
                className="h-4 w-4 shrink-0 rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <button
              onClick={() => onOpenReader(item)}
              className="min-w-0 flex-1 text-left text-sm font-medium text-text hover:text-primary line-clamp-1"
            >
              {item.title}
            </button>
            <button
              onClick={() => onUnpin(item.id)}
              className="shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-orange-400 group-hover/pin:opacity-100"
              title="Unpin"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Utility: reorder items so pinned ones come first
export function sortWithPinned<T extends { id: string }>(items: T[], pinnedIds: Set<string>): T[] {
  if (pinnedIds.size === 0) return items;
  const pinned = items.filter((i) => pinnedIds.has(i.id));
  const rest = items.filter((i) => !pinnedIds.has(i.id));
  return [...pinned, ...rest];
}
