"use client";

import { useMemo } from "react";

type Sentiment = "positive" | "negative" | "neutral" | "mixed";

interface SentimentBadgeProps {
  text: string;
}

// Positive/negative word lists for lightweight client-side sentiment
const POSITIVE_WORDS = new Set([
  "growth", "surge", "gain", "rise", "soar", "boost", "success", "win",
  "breakthrough", "milestone", "record", "innovative", "exciting", "improve",
  "launch", "celebrate", "achieve", "award", "best", "strong", "positive",
  "profit", "advance", "upgrade", "rally", "expand", "thrive", "lead",
  "opportunity", "optimistic", "promising", "benefit", "unlock",
]);

const NEGATIVE_WORDS = new Set([
  "crash", "fall", "decline", "drop", "loss", "fail", "crisis", "threat",
  "warning", "concern", "risk", "cut", "layoff", "shutdown", "controversy",
  "scandal", "breach", "hack", "fraud", "collapse", "downturn", "slow",
  "delay", "ban", "fine", "lawsuit", "struggle", "worse", "fear",
  "vulnerability", "attack", "damage", "debt", "deficit",
]);

function analyzeSentiment(text: string): { sentiment: Sentiment; confidence: number } {
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  let positive = 0;
  let negative = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positive++;
    if (NEGATIVE_WORDS.has(word)) negative++;
  }

  const total = positive + negative;
  if (total === 0) return { sentiment: "neutral", confidence: 0 };

  const ratio = positive / total;
  if (positive > 0 && negative > 0 && Math.abs(positive - negative) <= 1) {
    return { sentiment: "mixed", confidence: total / words.length };
  }
  if (ratio >= 0.65) return { sentiment: "positive", confidence: ratio };
  if (ratio <= 0.35) return { sentiment: "negative", confidence: 1 - ratio };
  return { sentiment: "neutral", confidence: 0.5 };
}

const SENTIMENT_CONFIG: Record<Sentiment, { label: string; emoji: string; classes: string }> = {
  positive: { label: "Positive", emoji: "📈", classes: "bg-green-500/10 text-green-400 border-green-500/20" },
  negative: { label: "Negative", emoji: "📉", classes: "bg-red-500/10 text-red-400 border-red-500/20" },
  neutral: { label: "Neutral", emoji: "➖", classes: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  mixed: { label: "Mixed", emoji: "⚖️", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
};

export function SentimentBadge({ text }: SentimentBadgeProps) {
  const { sentiment, confidence } = useMemo(() => analyzeSentiment(text), [text]);

  // Don't show badge for neutral/low-confidence
  if (sentiment === "neutral" || confidence < 0.1) return null;

  const config = SENTIMENT_CONFIG[sentiment];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.classes}`}
      title={`Sentiment: ${config.label} (${Math.round(confidence * 100)}% confidence)`}
    >
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}

/** Batch analyze sentiment for multiple items */
export function analyzeBatchSentiment(
  items: { id: string; title: string; summary: string }[]
): Map<string, Sentiment> {
  const map = new Map<string, Sentiment>();
  for (const item of items) {
    const { sentiment, confidence } = analyzeSentiment(`${item.title} ${item.summary}`);
    if (confidence >= 0.1 && sentiment !== "neutral") {
      map.set(item.id, sentiment);
    }
  }
  return map;
}
