"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Layers,
  GitMerge,
  Copy,
  ChevronDown,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ClusterItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt?: string;
}

interface Cluster {
  id: string;
  label: string;
  keywords: string[];
  articles: {
    item: ClusterItem;
    similarity: number;
  }[];
  hasDifferentPerspectives: boolean;
}

interface ArticleClusteringProps {
  items: ClusterItem[];
}

// --- Stop words for keyword extraction ---

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "its", "this", "that", "are",
  "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "shall",
  "can", "not", "no", "so", "if", "than", "too", "very", "just", "about",
  "up", "out", "as", "into", "over", "after", "before", "between", "under",
  "again", "then", "once", "here", "there", "when", "where", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "only", "own", "same", "also", "what", "which", "who", "whom",
  "their", "them", "they", "he", "she", "his", "her", "we", "you", "your",
  "our", "my", "me", "us", "him", "i", "am", "get", "got", "make", "made",
  "new", "say", "said", "says", "one", "two", "like", "even", "back",
  "still", "way", "take", "come", "going", "much", "well", "now", "use",
]);

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function buildClusters(items: ClusterItem[]): Cluster[] {
  if (items.length === 0) return [];

  // Extract keywords for each article
  const keywordSets = items.map((item) =>
    extractKeywords(`${item.title} ${item.summary}`)
  );

  // Compute pairwise similarity
  const assigned = new Set<number>();
  const clusters: Cluster[] = [];

  for (let i = 0; i < items.length; i++) {
    if (assigned.has(i)) continue;

    const clusterIndices = [i];
    assigned.add(i);

    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(j)) continue;
      const sim = jaccardSimilarity(keywordSets[i], keywordSets[j]);
      if (sim > 0.3) {
        clusterIndices.push(j);
        assigned.add(j);
      }
    }

    // Only form clusters with 2+ articles
    if (clusterIndices.length < 2) continue;

    // Find shared keywords for label
    const sharedCounts = new Map<string, number>();
    for (const idx of clusterIndices) {
      for (const word of keywordSets[idx]) {
        sharedCounts.set(word, (sharedCounts.get(word) || 0) + 1);
      }
    }
    const sharedKeywords = Array.from(sharedCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([word]) => word);

    const label =
      sharedKeywords.length > 0
        ? sharedKeywords
            .slice(0, 3)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(", ")
        : "Related Articles";

    // Sort by content length (longest first = "primary")
    const sorted = clusterIndices
      .map((idx) => ({
        item: items[idx],
        similarity: idx === clusterIndices[0]
          ? 1
          : jaccardSimilarity(keywordSets[clusterIndices[0]], keywordSets[idx]),
      }))
      .sort((a, b) => b.item.summary.length - a.item.summary.length);

    const sources = new Set(sorted.map((a) => a.item.source));

    clusters.push({
      id: `cluster-${clusters.length}`,
      label,
      keywords: sharedKeywords,
      articles: sorted,
      hasDifferentPerspectives: sources.size > 1,
    });
  }

  return clusters.sort((a, b) => b.articles.length - a.articles.length);
}

/**
 * Deduplicates articles by keeping only the "best" per cluster.
 * Best = longest summary > most recent > first encountered.
 */
export function deduplicateArticles(items: ClusterItem[]): ClusterItem[] {
  const clusters = buildClusters(items);
  const clusterItemIds = new Set<string>();
  const kept: ClusterItem[] = [];

  for (const cluster of clusters) {
    // Pick best: longest summary, then most recent
    const best = [...cluster.articles].sort((a, b) => {
      // Longer summary first
      const lenDiff = b.item.summary.length - a.item.summary.length;
      if (lenDiff !== 0) return lenDiff;
      // More recent first
      if (a.item.publishedAt && b.item.publishedAt) {
        return (
          new Date(b.item.publishedAt).getTime() -
          new Date(a.item.publishedAt).getTime()
        );
      }
      return 0;
    })[0];

    kept.push(best.item);
    for (const article of cluster.articles) {
      clusterItemIds.add(article.item.id);
    }
  }

  // Add unclustered items
  for (const item of items) {
    if (!clusterItemIds.has(item.id)) {
      kept.push(item);
    }
  }

  return kept;
}

// --- Components ---

export function ClusterBadge({
  count,
  label,
}: {
  count: number;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
      <Layers className="h-2.5 w-2.5" />
      {label || `${count} articles`}
    </span>
  );
}

function ClusterCard({
  cluster,
  isExpanded,
  onToggle,
}: {
  cluster: Cluster;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const primary = cluster.articles[0];
  const others = cluster.articles.slice(1);

  return (
    <div className="rounded-lg border border-border bg-bg transition-colors hover:border-border/80">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <GitMerge className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-semibold text-text">
              {cluster.label}
            </p>
            <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
              {cluster.articles.length}
            </span>
            {cluster.hasDifferentPerspectives && (
              <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                Different Perspectives
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-text-muted">
            {cluster.keywords.join(" · ")}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border px-3 py-2.5">
          {/* Primary article */}
          <div className="mb-2 rounded-lg bg-primary/5 p-2.5">
            <a
              href={primary.item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-text transition-colors hover:text-primary"
            >
              {primary.item.title}
            </a>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-muted">
              {primary.item.summary}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] font-medium text-primary">
                Primary
              </span>
              <span className="text-[10px] text-text-muted">
                · {primary.item.source}
              </span>
            </div>
          </div>

          {/* Other articles */}
          {others.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Also covers this
              </p>
              {others.map((article) => (
                <div
                  key={article.item.id}
                  className="flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-bg-hover/50"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={article.item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-1 text-[11px] font-medium text-text transition-colors hover:text-primary"
                    >
                      {article.item.title}
                    </a>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[10px] text-text-muted">
                        {article.item.source}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                    {Math.round(article.similarity * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ArticleClustering({ items }: ArticleClusteringProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set()
  );
  const [dedupeMode, setDedupeMode] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const clusters = useMemo(() => buildClusters(items), [items]);

  const totalDeduplicated = useMemo(() => {
    let count = 0;
    for (const cluster of clusters) {
      count += cluster.articles.length - 1;
    }
    return count;
  }, [clusters]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    for (const cluster of clusters) {
      for (const article of cluster.articles) {
        sources.add(article.item.source);
      }
    }
    return sources.size;
  }, [clusters]);

  const toggleCluster = useCallback((id: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pageSize = 3;
  const visibleClusters = clusters.slice(
    carouselIndex,
    carouselIndex + pageSize
  );
  const canGoPrev = carouselIndex > 0;
  const canGoNext = carouselIndex + pageSize < clusters.length;

  if (clusters.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">
            Smart Article Clusters
          </h3>
          <span className="rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
            {clusters.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-text-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-0 divide-x divide-border border-t border-border">
            <div className="p-2.5 text-center">
              <p className="text-sm font-bold text-text">{clusters.length}</p>
              <p className="text-[10px] text-text-muted">Clusters found</p>
            </div>
            <div className="p-2.5 text-center">
              <p className="text-sm font-bold text-secondary">
                {totalDeduplicated}
              </p>
              <p className="text-[10px] text-text-muted">Duplicates</p>
            </div>
            <div className="p-2.5 text-center">
              <p className="text-sm font-bold text-primary">{uniqueSources}</p>
              <p className="text-[10px] text-text-muted">Sources</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            {/* Dedup toggle */}
            <button
              onClick={() => setDedupeMode((p) => !p)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                dedupeMode
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
            >
              {dedupeMode ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              <span>Dedup</span>
              {dedupeMode && totalDeduplicated > 0 && (
                <span className="flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px]">
                  <Copy className="h-2.5 w-2.5" />
                  {totalDeduplicated} hidden
                </span>
              )}
            </button>

            {/* Carousel nav */}
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setCarouselIndex((p) => Math.max(0, p - pageSize))
                }
                disabled={!canGoPrev}
                className="rounded-lg p-1 text-text-muted transition-colors hover:text-text disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] text-text-muted">
                {carouselIndex + 1}–
                {Math.min(carouselIndex + pageSize, clusters.length)} of{" "}
                {clusters.length}
              </span>
              <button
                onClick={() =>
                  setCarouselIndex((p) =>
                    Math.min(clusters.length - pageSize, p + pageSize)
                  )
                }
                disabled={!canGoNext}
                className="rounded-lg p-1 text-text-muted transition-colors hover:text-text disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Cluster list */}
          <div className="space-y-2 border-t border-border p-3">
            {visibleClusters.map((cluster) => {
              if (dedupeMode) {
                // Show only primary article per cluster
                const primary = cluster.articles[0];
                return (
                  <div
                    key={cluster.id}
                    className="flex items-start gap-2 rounded-lg border border-border bg-bg p-2.5"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10">
                      <GitMerge className="h-3 w-3 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <a
                        href={primary.item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-1 text-[11px] font-medium text-text transition-colors hover:text-primary"
                      >
                        {primary.item.title}
                      </a>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[10px] text-text-muted">
                          {primary.item.source}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          · {cluster.label}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                      +{cluster.articles.length - 1}
                    </span>
                  </div>
                );
              }

              return (
                <ClusterCard
                  key={cluster.id}
                  cluster={cluster}
                  isExpanded={expandedClusters.has(cluster.id)}
                  onToggle={() => toggleCluster(cluster.id)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
