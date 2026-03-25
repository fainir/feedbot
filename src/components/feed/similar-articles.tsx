"use client";

import { useState, useMemo } from "react";
import { Layers, X, ExternalLink } from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

interface SimilarArticlesProps {
  targetItem: FeedItem;
  allItems: FeedItem[];
  onOpenReader: (item: FeedItem) => void;
  onClose: () => void;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 2)
  );
}

function similarity(a: Set<string>, b: Set<string>): number {
  let overlap = 0;
  for (const word of a) {
    if (b.has(word)) overlap++;
  }
  return overlap / Math.max(Math.sqrt(a.size * b.size), 1);
}

export function findSimilar(target: FeedItem, allItems: FeedItem[], limit = 5): FeedItem[] {
  const targetTokens = tokenize(`${target.title} ${target.summary}`);

  const scored = allItems
    .filter((item) => item.id !== target.id)
    .map((item) => ({
      item,
      score: similarity(targetTokens, tokenize(`${item.title} ${item.summary}`)),
    }))
    .filter((s) => s.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.item);
}

export function SimilarArticles({ targetItem, allItems, onOpenReader, onClose }: SimilarArticlesProps) {
  const similar = useMemo(
    () => findSimilar(targetItem, allItems),
    [targetItem, allItems]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-text">Similar Articles</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-3 rounded-lg bg-bg-hover/50 p-3">
          <p className="text-xs text-text-muted">Articles similar to:</p>
          <p className="mt-1 text-sm font-medium text-text line-clamp-1">{targetItem.title}</p>
        </div>

        {similar.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            No similar articles found in your feeds.
          </p>
        ) : (
          <div className="space-y-1">
            {similar.map((item) => (
              <button
                key={item.id}
                onClick={() => onOpenReader(item)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
              >
                {item.sourceIcon && (
                  <img
                    src={item.sourceIcon}
                    alt=""
                    className="mt-0.5 h-4 w-4 shrink-0 rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text line-clamp-1">{item.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{item.summary}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted/60">
                    <span>{item.source}</span>
                    <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-text-muted/40" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Small button for use in FeedCard or lists
export function SimilarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
      title="Find similar articles"
    >
      <Layers className="h-3.5 w-3.5" />
    </button>
  );
}
