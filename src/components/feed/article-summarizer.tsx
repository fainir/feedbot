"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from "lucide-react";

interface ArticleSummary {
  summary: string;
  keyTakeaways: string[];
  sentiment: "positive" | "neutral" | "negative";
  readingTime: string;
}

interface ArticleSummarizerProps {
  url: string;
  title: string;
  content?: string;
}

const SENTIMENT_CONFIG = {
  positive: {
    label: "Positive",
    icon: TrendingUp,
    classes: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  neutral: {
    label: "Neutral",
    icon: Minus,
    classes: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  },
  negative: {
    label: "Negative",
    icon: TrendingDown,
    classes: "text-red-400 bg-red-500/10 border-red-500/20",
  },
};

export function ArticleSummarizer({ url, title, content }: ArticleSummarizerProps) {
  const [summary, setSummary] = useState<ArticleSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const summarize = useCallback(async () => {
    if (summary) {
      setExpanded((prev) => !prev);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/articles/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, content: content?.slice(0, 5000) }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSummary(data);
      setExpanded(true);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [url, title, content, summary]);

  // Not yet loaded - show the trigger button
  if (!summary && !loading && !error) {
    return (
      <button
        onClick={summarize}
        className="flex items-center gap-2 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:from-primary/20 hover:to-purple-500/20 hover:shadow-md"
      >
        <Sparkles className="h-4 w-4" />
        Summarize
      </button>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-primary/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-500">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </div>
          <div className="flex-1">
            <div className="mb-2 h-4 w-40 animate-pulse rounded-md bg-text-muted/10" />
            <div className="mb-1.5 h-3 w-full animate-pulse rounded-md bg-text-muted/10" />
            <div className="mb-1.5 h-3 w-5/6 animate-pulse rounded-md bg-text-muted/10" />
            <div className="h-3 w-4/6 animate-pulse rounded-md bg-text-muted/10" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-text-muted/10" />
              <div className="h-3 w-full animate-pulse rounded-md bg-text-muted/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
        <Sparkles className="h-4 w-4 text-red-400" />
        <span className="text-sm text-red-400">Failed to summarize. </span>
        <button
          onClick={() => {
            setSummary(null);
            setError(false);
            summarize();
          }}
          className="text-sm font-medium text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const sentimentConfig = SENTIMENT_CONFIG[summary.sentiment];
  const SentimentIcon = sentimentConfig.icon;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-primary/5">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-text">AI Summary</h3>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Clock className="h-3 w-3" />
              {summary.readingTime}
              <span className="text-border">|</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${sentimentConfig.classes}`}
              >
                <SentimentIcon className="h-2.5 w-2.5" />
                {sentimentConfig.label}
              </span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {/* Collapsible content */}
      {expanded && (
        <div className="border-t border-primary/10 px-5 pb-5 pt-4">
          {/* Summary */}
          <p className="mb-4 text-sm leading-relaxed text-text-muted">
            {summary.summary}
          </p>

          {/* Key Takeaways */}
          <div className="mb-1">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted/70">
              Key Takeaways
            </h4>
            <ul className="space-y-2">
              {summary.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-text">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-primary to-purple-500" />
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
