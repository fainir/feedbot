"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Tag, X, Plus, Filter } from "lucide-react";

// --- Color System ---

const TAG_PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#3b82f6",
  "#a855f7", "#84cc16", "#e11d48", "#0ea5e9", "#d946ef",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getTagColor(tagName: string): string {
  return TAG_PALETTE[hashString(tagName) % TAG_PALETTE.length];
}

// --- Storage ---

const STORAGE_KEY = "myfeed-bookmark-tags";

function loadTagsFromStorage(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTagsToStorage(tags: Record<string, string[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
}

// --- Default quick tags ---

const QUICK_TAGS = ["Read Later", "Important", "Reference", "Share"];

// --- Hook ---

export function useBookmarkTags() {
  const [tagMap, setTagMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setTagMap(loadTagsFromStorage());
  }, []);

  const persist = useCallback((next: Record<string, string[]>) => {
    setTagMap(next);
    saveTagsToStorage(next);
  }, []);

  const addTag = useCallback(
    (itemId: string, tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      setTagMap((prev) => {
        const existing = prev[itemId] || [];
        if (existing.includes(trimmed)) return prev;
        const next = { ...prev, [itemId]: [...existing, trimmed] };
        saveTagsToStorage(next);
        return next;
      });
    },
    []
  );

  const removeTag = useCallback(
    (itemId: string, tag: string) => {
      setTagMap((prev) => {
        const existing = prev[itemId] || [];
        const filtered = existing.filter((t) => t !== tag);
        const next = { ...prev, [itemId]: filtered };
        if (filtered.length === 0) delete next[itemId];
        saveTagsToStorage(next);
        return next;
      });
    },
    []
  );

  const getTagsForItem = useCallback(
    (itemId: string): string[] => tagMap[itemId] || [],
    [tagMap]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const tags of Object.values(tagMap)) {
      for (const t of tags) set.add(t);
    }
    return Array.from(set).sort();
  }, [tagMap]);

  const getItemsForTag = useCallback(
    (tag: string): string[] =>
      Object.entries(tagMap)
        .filter(([, tags]) => tags.includes(tag))
        .map(([id]) => id),
    [tagMap]
  );

  const filterByTags = useCallback(
    (itemIds: string[], selectedTags: string[], mode: "AND" | "OR"): string[] => {
      if (selectedTags.length === 0) return itemIds;
      return itemIds.filter((id) => {
        const itemTags = tagMap[id] || [];
        if (mode === "AND") return selectedTags.every((t) => itemTags.includes(t));
        return selectedTags.some((t) => itemTags.includes(t));
      });
    },
    [tagMap]
  );

  return { tagMap, addTag, removeTag, getTagsForItem, allTags, getItemsForTag, filterByTags, persist };
}

// --- BookmarkTagPicker ---

interface BookmarkTagPickerProps {
  itemId: string;
  tags: string[];
  allTags: string[];
  onAddTag: (itemId: string, tag: string) => void;
  onRemoveTag: (itemId: string, tag: string) => void;
}

export function BookmarkTagPicker({
  itemId,
  tags,
  allTags,
  onAddTag,
  onRemoveTag,
}: BookmarkTagPickerProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const suggestions = useMemo(() => {
    const existing = new Set(tags);
    const combined = new Set([...QUICK_TAGS, ...allTags]);
    const list = Array.from(combined).filter((t) => !existing.has(t));
    if (!input.trim()) return list.slice(0, 8);
    const lower = input.toLowerCase();
    return list.filter((t) => t.toLowerCase().includes(lower)).slice(0, 8);
  }, [tags, allTags, input]);

  const handleAdd = useCallback(
    (tag: string) => {
      onAddTag(itemId, tag);
      setInput("");
    },
    [itemId, onAddTag]
  );

  const handleCreateNew = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAddTag(itemId, trimmed);
    setInput("");
  }, [input, itemId, onAddTag]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
        title="Manage tags"
      >
        <Tag className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className="absolute bottom-full right-0 z-30 mb-1 w-56 rounded-lg border border-border bg-bg-card p-2 shadow-lg dark:bg-bg-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Current tags */}
          {tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: getTagColor(tag) }}
                >
                  {tag}
                  <button
                    onClick={() => onRemoveTag(itemId, tag)}
                    className="rounded-full p-0.5 hover:bg-white/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="mb-2 flex items-center gap-1">
            <input
              type="text"
              placeholder="Add tag..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (suggestions.length > 0 && input.trim()) {
                    const match = suggestions.find(
                      (s) => s.toLowerCase() === input.trim().toLowerCase()
                    );
                    handleAdd(match || input.trim());
                  } else {
                    handleCreateNew();
                  }
                }
                if (e.key === "Escape") setOpen(false);
              }}
              className="flex-1 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              autoFocus
            />
            {input.trim() && (
              <button
                onClick={handleCreateNew}
                className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-1">
            {suggestions.map((tag) => (
              <button
                key={tag}
                onClick={() => handleAdd(tag)}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: getTagColor(tag) + "20",
                  color: getTagColor(tag),
                }}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- BookmarkTagBadge ---

interface BookmarkTagBadgeProps {
  tags: string[];
}

export function BookmarkTagBadge({ tags }: BookmarkTagBadgeProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: getTagColor(tag) + "20",
            color: getTagColor(tag),
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

// --- BookmarkTagFilter ---

interface BookmarkTagFilterProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  filterMode: "AND" | "OR";
  onToggleMode: () => void;
}

export function BookmarkTagFilter({
  allTags,
  selectedTags,
  onToggleTag,
  filterMode,
  onToggleMode,
}: BookmarkTagFilterProps) {
  if (allTags.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-xs text-text-muted">
        <Filter className="h-3.5 w-3.5" />
        Tags:
      </div>
      {allTags.map((tag) => {
        const isActive = selectedTags.includes(tag);
        const color = getTagColor(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              isActive ? "text-white" : "hover:opacity-80"
            }`}
            style={
              isActive
                ? { backgroundColor: color }
                : { backgroundColor: color + "20", color }
            }
          >
            {tag}
          </button>
        );
      })}
      {selectedTags.length >= 2 && (
        <button
          onClick={onToggleMode}
          className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          {filterMode}
        </button>
      )}
      {selectedTags.length > 0 && (
        <button
          onClick={() => selectedTags.forEach(onToggleTag)}
          className="rounded-md px-1.5 py-0.5 text-[10px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          Clear
        </button>
      )}
    </div>
  );
}
