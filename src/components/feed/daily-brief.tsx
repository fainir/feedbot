"use client";

import { useMemo, useState } from "react";
import { Newspaper, ChevronDown, ChevronUp, ExternalLink, Clock, Sparkles } from "lucide-react";
import type { FeedItem } from "@/lib/feed-types";

interface StoryCluster {
  topic: string;
  items: FeedItem[];
  topItem: FeedItem;
}

function extractKeywords(text: string): string[] {
  const stop = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "because", "but", "and", "or", "if", "while", "about", "up", "that", "this", "it", "its", "new", "also", "says", "said"]);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
}

function clusterStories(items: FeedItem[]): StoryCluster[] {
  if (items.length === 0) return [];

  // Group by keyword similarity
  const clusters: { items: FeedItem[]; keywords: Set<string> }[] = [];

  for (const item of items) {
    const kw = new Set(extractKeywords(item.title + " " + item.summary.slice(0, 100)));
    let bestCluster: (typeof clusters)[0] | null = null;
    let bestOverlap = 0;

    for (const cluster of clusters) {
      const overlap = [...kw].filter((w) => cluster.keywords.has(w)).length;
      const score = overlap / Math.max(kw.size, cluster.keywords.size);
      if (score > 0.25 && overlap > bestOverlap) {
        bestCluster = cluster;
        bestOverlap = overlap;
      }
    }

    if (bestCluster && bestCluster.items.length < 5) {
      bestCluster.items.push(item);
      for (const w of kw) bestCluster.keywords.add(w);
    } else {
      clusters.push({ items: [item], keywords: kw });
    }
  }

  // Convert to StoryCluster with topic labels
  return clusters
    .filter((c) => c.items.length >= 1)
    .map((c) => {
      // Pick most common meaningful keywords as topic
      const wordFreq: Record<string, number> = {};
      for (const item of c.items) {
        const words = extractKeywords(item.title);
        for (const w of words) wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
      const topWords = Object.entries(wordFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

      const topic = topWords.join(" & ") || c.items[0].title.slice(0, 40);
      const topItem = c.items.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )[0];

      return { topic, items: c.items, topItem };
    })
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 8);
}

interface DailyBriefProps {
  allItems: FeedItem[];
  onOpenReader?: (item: FeedItem) => void;
}

export function DailyBrief({ allItems, onOpenReader }: DailyBriefProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  // Filter to today's items (last 24h)
  const todayItems = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return allItems.filter((item) => new Date(item.publishedAt).getTime() > cutoff);
  }, [allItems]);

  const clusters = useMemo(() => clusterStories(todayItems), [todayItems]);

  if (todayItems.length < 3) return null;

  const totalStories = todayItems.length;
  const topSources = (() => {
    const counts: Record<string, number> = {};
    for (const item of todayItems) {
      let domain = item.source;
      try { domain = new URL(item.url).hostname.replace("www.", ""); } catch {}
      counts[domain] = (counts[domain] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([s]) => s);
  })();

  return (
    <div className="mb-6 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <Newspaper className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-text">Today&apos;s Brief</h3>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Sparkles className="h-2.5 w-2.5" />
              {totalStories} stories
            </span>
          </div>
          <p className="text-xs text-text-muted">
            {clusters.length} topics from {topSources.join(", ")}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {/* Clusters */}
      {expanded && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3">
          <div className="space-y-2">
            {clusters.map((cluster) => (
              <div
                key={cluster.topic}
                className="rounded-lg border border-border/50 bg-bg-card/50 transition-colors hover:border-primary/30"
              >
                <button
                  onClick={() =>
                    setExpandedCluster(
                      expandedCluster === cluster.topic ? null : cluster.topic
                    )
                  }
                  className="flex w-full items-center gap-3 px-3 py-2.5"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">
                        {cluster.topic}
                      </span>
                      {cluster.items.length > 1 && (
                        <span className="rounded-full bg-bg-hover px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                          {cluster.items.length} articles
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">
                      {cluster.topItem.title}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform ${
                      expandedCluster === cluster.topic ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedCluster === cluster.topic && (
                  <div className="border-t border-border/50 px-3 pb-2 pt-1">
                    {cluster.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-bg-hover/50"
                      >
                        <div className="min-w-0 flex-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="line-clamp-1 text-xs font-medium text-text transition-colors hover:text-primary"
                          >
                            {item.title}
                          </a>
                          <div className="flex items-center gap-2 text-[10px] text-text-muted">
                            <span>{item.source}</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTimeShort(item.publishedAt)}
                            </span>
                          </div>
                        </div>
                        {onOpenReader && (
                          <button
                            onClick={() => onOpenReader(item)}
                            className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeShort(date: string): string {
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
