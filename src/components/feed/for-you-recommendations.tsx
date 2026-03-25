"use client";

import { useState, useMemo } from "react";
import { Sparkles, ChevronRight, X, ThumbsUp, ThumbsDown } from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

interface ForYouRecommendationsProps {
  allItems: FeedItem[];
  readIds: Set<string>;
  bookmarkedIds: Set<string>;
  onOpenReader: (item: FeedItem) => void;
  onMarkRead: (id: string) => void;
}

function scoreItem(
  item: FeedItem,
  readItems: FeedItem[],
  bookmarkedItems: FeedItem[],
  dismissedIds: Set<string>
): { score: number; reason: string } {
  if (dismissedIds.has(item.id)) return { score: -1, reason: "" };

  let score = 0;
  let reason = "";

  // Extract keywords from read and bookmarked items
  const interestWords = new Map<string, number>();
  const sourceInterest = new Map<string, number>();

  for (const ri of [...bookmarkedItems, ...readItems]) {
    const weight = bookmarkedItems.some((b) => b.id === ri.id) ? 3 : 1;
    const words = ri.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3);
    for (const w of words) {
      interestWords.set(w, (interestWords.get(w) || 0) + weight);
    }
    let domain = ri.source;
    try { domain = new URL(ri.url).hostname.replace("www.", ""); } catch {}
    sourceInterest.set(domain, (sourceInterest.get(domain) || 0) + weight);
  }

  // Score by keyword overlap
  const titleWords = item.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3);
  let keywordScore = 0;
  let topKeyword = "";
  let topKeywordScore = 0;
  for (const w of titleWords) {
    const interest = interestWords.get(w) || 0;
    keywordScore += interest;
    if (interest > topKeywordScore) {
      topKeywordScore = interest;
      topKeyword = w;
    }
  }
  if (keywordScore > 0) {
    score += Math.min(keywordScore, 20);
    reason = `Based on your interest in "${topKeyword}"`;
  }

  // Score by source preference
  let domain = item.source;
  try { domain = new URL(item.url).hostname.replace("www.", ""); } catch {}
  const srcScore = sourceInterest.get(domain) || 0;
  if (srcScore > 0) {
    score += Math.min(srcScore * 2, 10);
    if (!reason) reason = `From a source you read often`;
  }

  // Recency bonus
  const age = Date.now() - new Date(item.publishedAt).getTime();
  if (age < 6 * 3600000) score += 5; // < 6 hours
  else if (age < 24 * 3600000) score += 2; // < 24 hours

  if (!reason && score > 0) reason = "Trending in your feeds";

  return { score, reason };
}

export function ForYouRecommendations({
  allItems,
  readIds,
  bookmarkedIds,
  onOpenReader,
  onMarkRead,
}: ForYouRecommendationsProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("feedbot-foryou-dismissed");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("feedbot-foryou-liked");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const readItems = useMemo(
    () => allItems.filter((i) => readIds.has(i.id)),
    [allItems, readIds]
  );
  const bookmarkedItems = useMemo(
    () => allItems.filter((i) => bookmarkedIds.has(i.id)),
    [allItems, bookmarkedIds]
  );

  const recommendations = useMemo(() => {
    if (readIds.size < 3) return []; // Need some history first

    const unread = allItems.filter((i) => !readIds.has(i.id));
    const scored = unread
      .map((item) => ({
        item,
        ...scoreItem(item, readItems, bookmarkedItems, dismissedIds),
      }))
      .filter((s) => s.score > 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return scored;
  }, [allItems, readIds, bookmarkedIds, readItems, bookmarkedItems, dismissedIds]);

  const dismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("feedbot-foryou-dismissed", JSON.stringify([...next]));
      return next;
    });
  };

  const like = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("feedbot-foryou-liked", JSON.stringify([...next]));
      return next;
    });
    onMarkRead(id);
  };

  if (recommendations.length === 0) return null;

  const shown = expanded ? recommendations : recommendations.slice(0, 3);

  return (
    <div className="mb-6 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-text">For You</h3>
          <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400">
            {recommendations.length} picks
          </span>
        </div>
        {recommendations.length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
          >
            {expanded ? "Show less" : "Show all"}
            <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {shown.map(({ item, reason }) => (
          <div
            key={item.id}
            className="group flex items-start gap-3 rounded-lg border border-border/50 bg-bg-card/50 p-3 transition-colors hover:border-purple-500/30 hover:bg-bg-card"
          >
            {item.sourceIcon && (
              <img
                src={item.sourceIcon}
                alt=""
                className="mt-0.5 h-5 w-5 shrink-0 rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="min-w-0 flex-1">
              <button
                onClick={() => { onOpenReader(item); onMarkRead(item.id); }}
                className="text-left text-sm font-medium text-text hover:text-primary line-clamp-1"
              >
                {item.title}
              </button>
              <p className="mt-0.5 text-xs text-purple-400/80">{reason}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => like(item.id)}
                className={`rounded p-1 transition-colors ${
                  likedIds.has(item.id) ? "text-green-400" : "text-text-muted hover:text-green-400"
                }`}
                title="Good recommendation"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => dismiss(item.id)}
                className="rounded p-1 text-text-muted transition-colors hover:text-red-400"
                title="Not interested"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
