"use client";

import { useMemo } from "react";
import { SmilePlus, Frown, Minus } from "lucide-react";

type Sentiment = "positive" | "negative" | "neutral";

const POSITIVE_WORDS = new Set([
  "breakthrough", "success", "growth", "launch", "milestone", "innovation",
  "record", "best", "win", "gain", "surge", "boost", "improve", "soar",
  "celebrate", "achieve", "profit", "upgrade", "advance", "rising",
  "exciting", "promising", "revolutionary", "bullish", "rally", "outperform",
  "optimistic", "opportunity", "transform", "empower", "thrive", "expand",
]);

const NEGATIVE_WORDS = new Set([
  "crash", "fail", "crisis", "loss", "hack", "breach", "layoff", "decline",
  "drop", "plunge", "scandal", "bankruptcy", "warning", "risk", "threat",
  "collapse", "fraud", "recall", "shutdown", "downturn", "bearish", "plummet",
  "vulnerability", "exploit", "outage", "controversy", "lawsuit", "fine",
  "penalty", "concern", "problem", "trouble", "struggle", "cut", "slash",
]);

export function analyzeSentiment(title: string, summary: string): Sentiment {
  const text = `${title} ${summary}`.toLowerCase();
  const words = text.replace(/[^\w\s]/g, "").split(/\s+/);

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveScore++;
    if (NEGATIVE_WORDS.has(word)) negativeScore++;
  }

  if (positiveScore > negativeScore && positiveScore >= 1) return "positive";
  if (negativeScore > positiveScore && negativeScore >= 1) return "negative";
  return "neutral";
}

const SENTIMENT_CONFIG: Record<Sentiment, { icon: typeof SmilePlus; label: string; className: string }> = {
  positive: {
    icon: SmilePlus,
    label: "Positive",
    className: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  negative: {
    icon: Frown,
    label: "Negative",
    className: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  neutral: {
    icon: Minus,
    label: "Neutral",
    className: "text-text-muted bg-bg-hover border-border/50",
  },
};

interface SentimentBadgeProps {
  title: string;
  summary: string;
  showNeutral?: boolean;
}

export function SentimentBadge({ title, summary, showNeutral = false }: SentimentBadgeProps) {
  const sentiment = useMemo(() => analyzeSentiment(title, summary), [title, summary]);

  if (sentiment === "neutral" && !showNeutral) return null;

  const config = SENTIMENT_CONFIG[sentiment];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${config.className}`}
      title={`${config.label} sentiment`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
