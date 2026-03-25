"use client";

import { useState, useMemo } from "react";
import { Columns2, X, ArrowLeftRight } from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface Tab {
  id: string;
  name: string;
  items: FeedItem[];
}

interface FeedComparisonProps {
  tabs: Tab[];
  readIds: Set<string>;
}

export function FeedComparisonButton({ tabs, readIds }: FeedComparisonProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [leftId, setLeftId] = useState(tabs[0]?.id || "");
  const [rightId, setRightId] = useState(tabs[1]?.id || "");

  const feedTabs = tabs.filter((t) => t.id !== "all" && t.items.length > 0);

  const leftTab = feedTabs.find((t) => t.id === leftId);
  const rightTab = feedTabs.find((t) => t.id === rightId);

  // Find overlapping topics (shared keywords in titles)
  const overlap = useMemo(() => {
    if (!leftTab || !rightTab) return [];
    const leftWords = new Map<string, string[]>();
    for (const item of leftTab.items) {
      const words = item.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3);
      for (const w of words) {
        if (!leftWords.has(w)) leftWords.set(w, []);
        leftWords.get(w)!.push(item.title);
      }
    }
    const shared: { word: string; leftCount: number; rightCount: number }[] = [];
    const rightWordCounts: Record<string, number> = {};
    for (const item of rightTab.items) {
      const words = item.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3);
      for (const w of words) rightWordCounts[w] = (rightWordCounts[w] || 0) + 1;
    }
    for (const [word, titles] of leftWords) {
      if (rightWordCounts[word] && rightWordCounts[word] >= 1) {
        shared.push({ word, leftCount: titles.length, rightCount: rightWordCounts[word] });
      }
    }
    return shared
      .filter((s) => s.leftCount >= 1 && s.rightCount >= 1)
      .sort((a, b) => (b.leftCount + b.rightCount) - (a.leftCount + a.rightCount))
      .slice(0, 6);
  }, [leftTab, rightTab]);

  if (feedTabs.length < 2) return null;

  if (!showComparison) {
    return (
      <button
        onClick={() => {
          setLeftId(feedTabs[0].id);
          setRightId(feedTabs[1].id);
          setShowComparison(true);
        }}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Compare feeds"
      >
        <Columns2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Compare</span>
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Columns2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text">Feed Comparison</h3>
        </div>
        <button
          onClick={() => setShowComparison(false)}
          className="rounded-lg p-1 text-text-muted hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Feed selectors */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <select
          value={leftId}
          onChange={(e) => setLeftId(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
        >
          {feedTabs.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-text-muted" />
        <select
          value={rightId}
          onChange={(e) => setRightId(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
        >
          {feedTabs.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 divide-x divide-border border-b border-border">
        <div className="p-3 text-center">
          <p className="text-lg font-bold text-text">{leftTab?.items.length || 0}</p>
          <p className="text-[10px] text-text-muted">{leftTab?.name} items</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-lg font-bold text-primary">{overlap.length}</p>
          <p className="text-[10px] text-text-muted">Shared topics</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-lg font-bold text-text">{rightTab?.items.length || 0}</p>
          <p className="text-[10px] text-text-muted">{rightTab?.name} items</p>
        </div>
      </div>

      {/* Shared topics */}
      {overlap.length > 0 && (
        <div className="p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Overlapping Topics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overlap.map((o) => (
              <span
                key={o.word}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                {o.word}
                <span className="ml-1 text-[10px] text-primary/60">
                  {o.leftCount + o.rightCount}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Side by side latest */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-border border-t border-border">
        {[leftTab, rightTab].map((tab) => (
          <div key={tab?.id || "empty"} className="p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Latest from {tab?.name}
            </p>
            <div className="space-y-1.5">
              {(tab?.items || []).slice(0, 5).map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block truncate text-[11px] transition-colors hover:text-primary ${
                    readIds.has(item.id) ? "text-text-muted" : "text-text"
                  }`}
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
