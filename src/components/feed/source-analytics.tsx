"use client";

import { useMemo } from "react";
import type { FeedItem } from "@/lib/feed-types";

interface SourceAnalyticsProps {
  items: FeedItem[];
}

export function SourceAnalytics({ items }: SourceAnalyticsProps) {
  const sorted = useMemo(() => {
    const sourceCounts: Record<string, number> = {};
    for (const item of items) {
      let domain = item.source;
      try { domain = new URL(item.url).hostname.replace("www.", ""); } catch {}
      sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
    }
    return Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }, [items]);

  const max = sorted[0]?.[1] || 1;

  if (sorted.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text">Top Sources</h3>
      <div className="space-y-2">
        {sorted.map(([source, count]) => (
          <div key={source} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs text-text-muted">{source}</span>
            <div className="flex-1">
              <div
                className="h-4 rounded-full bg-primary/20"
                style={{ width: "100%" }}
              >
                <div
                  className="h-4 rounded-full bg-primary transition-all"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium text-text-muted">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
