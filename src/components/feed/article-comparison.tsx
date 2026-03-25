"use client";

import { useState, useEffect, useMemo } from "react";
import { GitCompare, ArrowLeftRight, Scale, Clock, X, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Article {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

interface ArticleComparisonProps {
  articles: [Article, Article];
  onClose: () => void;
}

interface CompareButtonProps {
  compareMode: boolean;
  selectedCount: number;
  onToggle: () => void;
}

// --- Helpers ---

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
    "her", "was", "one", "our", "out", "has", "have", "been", "some", "them",
    "than", "its", "over", "such", "that", "this", "with", "will", "each",
    "from", "they", "into", "more", "other", "about", "which", "their",
    "there", "would", "make", "like", "just", "also", "what", "when", "could",
    "been", "said", "does", "most", "very",
  ]);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));
}

function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function analyzeSentiment(text: string): "positive" | "neutral" | "negative" {
  const positive = new Set([
    "good", "great", "best", "amazing", "excellent", "success", "breakthrough",
    "innovative", "growth", "improved", "win", "gains", "positive", "exciting",
    "promising", "advance", "achieve", "boost", "surge", "record",
  ]);
  const negative = new Set([
    "bad", "worst", "fail", "crisis", "decline", "loss", "crash", "risk",
    "threat", "warning", "concern", "drop", "fall", "struggle", "problem",
    "issue", "down", "cut", "layoff", "controversy",
  ]);
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  for (const w of words) {
    if (positive.has(w)) score++;
    if (negative.has(w)) score--;
  }
  if (score > 1) return "positive";
  if (score < -1) return "negative";
  return "neutral";
}

function getSourceCredibility(source: string): { label: string; score: number } {
  const highCred = new Set([
    "reuters", "associated press", "bbc", "the new york times", "the washington post",
    "the guardian", "bloomberg", "financial times", "nature", "science",
  ]);
  const medCred = new Set([
    "cnn", "cnbc", "techcrunch", "the verge", "wired", "ars technica",
    "forbes", "business insider", "axios", "politico",
  ]);
  const s = source.toLowerCase();
  if (highCred.has(s)) return { label: "High", score: 3 };
  if (medCred.has(s)) return { label: "Medium-High", score: 2 };
  return { label: "Standard", score: 1 };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function generateComparisonNote(a: Article, b: Article, sharedKeywords: string[]): string {
  const sentA = analyzeSentiment(a.title + " " + a.summary);
  const sentB = analyzeSentiment(b.title + " " + b.summary);
  const dateA = new Date(a.publishedAt).getTime();
  const dateB = new Date(b.publishedAt).getTime();
  const fresher = dateA > dateB ? a : b;

  let note = "";
  if (sharedKeywords.length > 3) {
    note += `These articles share significant topic overlap around "${sharedKeywords.slice(0, 3).join('", "')}". `;
  } else if (sharedKeywords.length > 0) {
    note += `Minor topic overlap detected around "${sharedKeywords.join('", "')}". `;
  } else {
    note += "These articles cover largely distinct topics. ";
  }

  if (sentA !== sentB) {
    note += `The ${a.source} article has a ${sentA} tone while ${b.source} leans ${sentB}. `;
  } else {
    note += `Both articles maintain a ${sentA} tone. `;
  }

  note += `${fresher.source} published more recently.`;
  return note;
}

// --- Sentiment badge ---

function SentimentBadge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const config = {
    positive: { icon: TrendingUp, class: "bg-green-500/10 text-green-400", label: "Positive" },
    neutral: { icon: Minus, class: "bg-yellow-500/10 text-yellow-400", label: "Neutral" },
    negative: { icon: TrendingDown, class: "bg-red-500/10 text-red-400", label: "Negative" },
  };
  const { icon: Icon, class: cls, label } = config[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// --- Diff highlight ---

function HighlightedText({ text, keywords, color }: { text: string; keywords: Set<string>; color: "blue" | "amber" }) {
  const colorClass = color === "blue" ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300";
  const words = text.split(/(\s+)/);
  return (
    <p className="text-xs leading-relaxed text-text-muted">
      {words.map((word, i) => {
        const clean = word.toLowerCase().replace(/[^\w]/g, "");
        if (clean.length > 3 && keywords.has(clean)) {
          return (
            <span key={i} className={`rounded px-0.5 ${colorClass}`}>
              {word}
            </span>
          );
        }
        return <span key={i}>{word}</span>;
      })}
    </p>
  );
}

// --- Main component ---

export function ArticleComparison({ articles, onClose }: ArticleComparisonProps) {
  const [left, right] = articles;
  const [swapped, setSwapped] = useState(false);

  const articleA = swapped ? right : left;
  const articleB = swapped ? left : right;

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const analysis = useMemo(() => {
    const kwA = extractKeywords(articleA.title + " " + articleA.summary);
    const kwB = extractKeywords(articleB.title + " " + articleB.summary);
    const setA = new Set(kwA);
    const setB = new Set(kwB);

    const shared = kwA.filter((w) => setB.has(w));
    const sharedSet = new Set(shared);
    const uniqueA = new Set(kwA.filter((w) => !sharedSet.has(w)));
    const uniqueB = new Set(kwB.filter((w) => !sharedSet.has(w)));

    const readTimeA = estimateReadingTime(articleA.summary);
    const readTimeB = estimateReadingTime(articleB.summary);
    const sentA = analyzeSentiment(articleA.title + " " + articleA.summary);
    const sentB = analyzeSentiment(articleB.title + " " + articleB.summary);
    const credA = getSourceCredibility(articleA.source);
    const credB = getSourceCredibility(articleB.source);
    const dateA = new Date(articleA.publishedAt).getTime();
    const dateB = new Date(articleB.publishedAt).getTime();
    const fresherSide: "left" | "right" | "same" = dateA > dateB ? "left" : dateA < dateB ? "right" : "same";

    const comparisonNote = generateComparisonNote(articleA, articleB, [...new Set(shared)]);

    return {
      sharedKeywords: [...new Set(shared)],
      uniqueA,
      uniqueB,
      readTimeA,
      readTimeB,
      sentA,
      sentB,
      credA,
      credB,
      fresherSide,
      comparisonNote,
    };
  }, [articleA, articleB]);

  const maxReadTime = Math.max(analysis.readTimeA, analysis.readTimeB, 1);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/60 backdrop-blur-sm">
      <div className="flex flex-1 flex-col overflow-hidden bg-bg sm:mx-auto sm:my-4 sm:max-w-6xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-text">Article Comparison</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSwapped(!swapped)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              title="Swap articles"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Swap</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* AI comparison note */}
          <div className="border-b border-border bg-primary/5 px-4 py-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-text-muted">
                {analysis.comparisonNote}
              </p>
            </div>
          </div>

          {/* Side-by-side articles */}
          <div className="grid grid-cols-1 gap-0 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* Article A */}
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-400">
                  1
                </span>
                <span className="text-[11px] font-medium text-text-muted">{articleA.source}</span>
              </div>
              <h4 className="mb-2 text-sm font-semibold leading-snug text-text">
                {articleA.title}
              </h4>
              <p className="mb-2 text-[11px] text-text-muted">
                {new Date(articleA.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}
                {timeAgo(articleA.publishedAt)}
              </p>
              <HighlightedText
                text={articleA.summary}
                keywords={analysis.uniqueA}
                color="blue"
              />
            </div>

            {/* Article B */}
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
                  2
                </span>
                <span className="text-[11px] font-medium text-text-muted">{articleB.source}</span>
              </div>
              <h4 className="mb-2 text-sm font-semibold leading-snug text-text">
                {articleB.title}
              </h4>
              <p className="mb-2 text-[11px] text-text-muted">
                {new Date(articleB.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}
                {timeAgo(articleB.publishedAt)}
              </p>
              <HighlightedText
                text={articleB.summary}
                keywords={analysis.uniqueB}
                color="amber"
              />
            </div>
          </div>

          {/* Comparison metrics */}
          <div className="border-t border-border">
            <div className="px-4 py-3">
              <div className="mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Comparison Metrics
                </h4>
              </div>

              <div className="space-y-4">
                {/* Reading time */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-text-muted">
                    <Clock className="mr-1 inline h-3 w-3" />
                    Reading Time
                  </p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="text-[10px] text-text-muted">{articleA.source}</span>
                        <span className="text-[10px] font-medium text-text">{analysis.readTimeA} min</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-hover">
                        <div
                          className="h-2 rounded-full bg-blue-500/60 transition-all"
                          style={{ width: `${(analysis.readTimeA / maxReadTime) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="text-[10px] text-text-muted">{articleB.source}</span>
                        <span className="text-[10px] font-medium text-text">{analysis.readTimeB} min</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-hover">
                        <div
                          className="h-2 rounded-full bg-amber-500/60 transition-all"
                          style={{ width: `${(analysis.readTimeB / maxReadTime) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Source credibility */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-text-muted">Source Credibility</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg bg-bg-hover/50 px-3 py-2">
                      <span className="text-[11px] text-text-muted">{articleA.source}</span>
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        {analysis.credA.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-bg-hover/50 px-3 py-2">
                      <span className="text-[11px] text-text-muted">{articleB.source}</span>
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        {analysis.credB.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sentiment */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-text-muted">Sentiment</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg bg-bg-hover/50 px-3 py-2">
                      <span className="text-[11px] text-text-muted">{articleA.source}</span>
                      <SentimentBadge sentiment={analysis.sentA} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-bg-hover/50 px-3 py-2">
                      <span className="text-[11px] text-text-muted">{articleB.source}</span>
                      <SentimentBadge sentiment={analysis.sentB} />
                    </div>
                  </div>
                </div>

                {/* Freshness */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-text-muted">Freshness</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      analysis.fresherSide === "left" ? "bg-green-500/5 ring-1 ring-green-500/20" : "bg-bg-hover/50"
                    }`}>
                      <span className="text-[11px] text-text-muted">{articleA.source}</span>
                      <span className="text-[10px] font-medium text-text">
                        {timeAgo(articleA.publishedAt)}
                        {analysis.fresherSide === "left" && (
                          <span className="ml-1 text-green-400">Newer</span>
                        )}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      analysis.fresherSide === "right" ? "bg-green-500/5 ring-1 ring-green-500/20" : "bg-bg-hover/50"
                    }`}>
                      <span className="text-[11px] text-text-muted">{articleB.source}</span>
                      <span className="text-[10px] font-medium text-text">
                        {timeAgo(articleB.publishedAt)}
                        {analysis.fresherSide === "right" && (
                          <span className="ml-1 text-green-400">Newer</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Topic overlap */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-text-muted">
                    Topic Overlap ({analysis.sharedKeywords.length} shared keywords)
                  </p>
                  {analysis.sharedKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.sharedKeywords.slice(0, 10).map((kw) => (
                        <span
                          key={kw}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted">No shared keywords detected</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Compare toggle button ---

export function CompareButton({ compareMode, selectedCount, onToggle }: CompareButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        compareMode
          ? "bg-primary/10 text-primary ring-1 ring-primary/30"
          : "text-text-muted hover:bg-bg-hover hover:text-text"
      }`}
      title={compareMode ? "Exit comparison mode" : "Compare two articles"}
    >
      <GitCompare className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">
        {compareMode ? `Compare (${selectedCount}/2)` : "Compare"}
      </span>
    </button>
  );
}
