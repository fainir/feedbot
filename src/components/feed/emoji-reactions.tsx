"use client";

import { useState, useCallback, useMemo } from "react";
import { SmilePlus } from "lucide-react";

const REACTIONS = ["👍", "🔥", "💡", "😮", "❤️", "🎯"];

interface EmojiReactionsProps {
  itemId: string;
  reactions: Record<string, string[]>; // itemId → emoji[]
  onReact: (itemId: string, emoji: string) => void;
}

export function EmojiReactions({ itemId, reactions, onReact }: EmojiReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const itemReactions = reactions[itemId] || [];

  // Count each emoji
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const emoji of itemReactions) {
      map[emoji] = (map[emoji] || 0) + 1;
    }
    return map;
  }, [itemReactions]);

  const handleReact = useCallback(
    (emoji: string) => {
      onReact(itemId, emoji);
      setShowPicker(false);
    },
    [itemId, onReact]
  );

  return (
    <div className="flex items-center gap-1">
      {/* Existing reactions */}
      {Object.entries(counts).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className="flex items-center gap-0.5 rounded-full border border-border bg-bg px-1.5 py-0.5 text-xs transition-all hover:border-primary/40 hover:bg-primary/10"
        >
          <span>{emoji}</span>
          {count > 1 && (
            <span className="text-[10px] font-medium text-text-muted">{count}</span>
          )}
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
          title="Add reaction"
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>
        {showPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
            <div className="absolute bottom-full left-0 z-20 mb-1 flex items-center gap-0.5 rounded-xl border border-border bg-bg-card p-1.5 shadow-xl">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition-transform hover:scale-125 hover:bg-bg-hover"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Hook to manage reactions state with localStorage */
export function useReactions() {
  const [reactions, setReactions] = useState<Record<string, string[]>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("feedbot-reactions");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleReaction = useCallback((itemId: string, emoji: string) => {
    setReactions((prev) => {
      const existing = prev[itemId] || [];
      const hasEmoji = existing.includes(emoji);
      const next = {
        ...prev,
        [itemId]: hasEmoji
          ? existing.filter((e) => e !== emoji)
          : [...existing, emoji],
      };
      // Clean up empty arrays
      if (next[itemId].length === 0) delete next[itemId];
      localStorage.setItem("feedbot-reactions", JSON.stringify(next));
      return next;
    });
  }, []);

  return { reactions, toggleReaction };
}
