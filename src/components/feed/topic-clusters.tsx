"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";

interface ClusterItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

interface TopicCluster {
  topic: string;
  items: ClusterItem[];
  keywords: string[];
}

/**
 * Cluster items by extracting key topic words and grouping articles
 * that share significant keyword overlap.
 */
export function clusterByTopic(items: ClusterItem[]): TopicCluster[] {
  if (items.length < 4) return [];

  // Stop words to ignore
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "each", "every", "both", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "just", "about", "also", "new", "says", "said",
    "its", "it", "this", "that", "these", "those", "what", "which", "who",
    "whom", "and", "but", "or", "if", "while", "because", "until",
    "their", "them", "they", "your", "you", "his", "her", "our", "we",
    "get", "got", "make", "made", "like", "one", "two", "first", "last",
    "over", "out", "up", "down", "now", "way", "even", "back", "still",
    "well", "take", "come", "see", "know", "use", "work", "year", "day",
    "time", "people", "world", "much", "many", "going", "want", "need",
  ]);

  // Extract significant words from each item's title
  const itemWords = items.map((item) => {
    const words = item.title
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    return new Set(words);
  });

  // Count word frequency across all items
  const wordFreq: Record<string, number> = {};
  for (const words of itemWords) {
    for (const w of words) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  // Only keep words that appear 2+ times (shared topics)
  const sharedWords = Object.entries(wordFreq)
    .filter(([, count]) => count >= 2 && count <= items.length * 0.7)
    .sort(([, a], [, b]) => b - a)
    .map(([word]) => word);

  if (sharedWords.length === 0) return [];

  // Greedy clustering: pick top keyword, gather items with it, remove, repeat
  const used = new Set<number>();
  const clusters: TopicCluster[] = [];

  for (const keyword of sharedWords) {
    if (clusters.length >= 5) break; // max 5 clusters

    const matching: number[] = [];
    for (let i = 0; i < items.length; i++) {
      if (used.has(i)) continue;
      if (itemWords[i].has(keyword)) matching.push(i);
    }

    if (matching.length < 2) continue;

    // Find additional shared keywords among these items
    const clusterWordFreq: Record<string, number> = {};
    for (const idx of matching) {
      for (const w of itemWords[idx]) {
        clusterWordFreq[w] = (clusterWordFreq[w] || 0) + 1;
      }
    }
    const clusterKeywords = Object.entries(clusterWordFreq)
      .filter(([, c]) => c >= Math.ceil(matching.length * 0.5))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([w]) => w);

    // Build topic label from keywords
    const topicLabel = clusterKeywords
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" & ");

    for (const idx of matching) used.add(idx);

    clusters.push({
      topic: topicLabel || keyword.charAt(0).toUpperCase() + keyword.slice(1),
      items: matching.map((i) => items[i]),
      keywords: clusterKeywords,
    });
  }

  // Only return clusters with 2+ items
  return clusters.filter((c) => c.items.length >= 2);
}

interface TopicClusterGroupProps {
  cluster: TopicCluster;
  renderItem: (item: ClusterItem) => React.ReactNode;
}

export function TopicClusterGroup({ cluster, renderItem }: TopicClusterGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-bg-hover"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
        )}
        <Layers className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold text-text">{cluster.topic}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {cluster.items.length} articles
        </span>
      </button>
      {expanded && (
        <div className="ml-6 space-y-3 border-l-2 border-primary/20 pl-4">
          {cluster.items.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TopicClusterViewProps {
  items: ClusterItem[];
  renderItem: (item: ClusterItem) => React.ReactNode;
  enabled: boolean;
}

export function TopicClusterView({ items, renderItem, enabled }: TopicClusterViewProps) {
  const clusters = useMemo(() => (enabled ? clusterByTopic(items) : []), [items, enabled]);

  if (!enabled || clusters.length === 0) return null;

  // Collect IDs of clustered items
  const clusteredIds = new Set(clusters.flatMap((c) => c.items.map((i) => i.id)));

  return (
    <div className="mb-4">
      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Related Topics
        </span>
      </div>
      {clusters.map((cluster) => (
        <TopicClusterGroup
          key={cluster.topic}
          cluster={cluster}
          renderItem={renderItem}
        />
      ))}
    </div>
  );
}

/** Returns the IDs of items that appear in clusters, so they can be excluded from the flat list */
export function getClusteredIds(items: ClusterItem[]): Set<string> {
  const clusters = clusterByTopic(items);
  return new Set(clusters.flatMap((c) => c.items.map((i) => i.id)));
}
