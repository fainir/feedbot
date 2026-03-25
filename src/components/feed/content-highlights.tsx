"use client";

import { useMemo } from "react";
import { Quote, Sparkles } from "lucide-react";

interface ContentHighlightsProps {
  items: { id: string; title: string; summary: string; source: string }[];
  maxHighlights?: number;
}

/**
 * Extracts the most interesting/noteworthy sentences from article summaries.
 * Uses heuristics: sentence length, keyword density, specificity.
 */
function extractHighlights(
  items: { id: string; title: string; summary: string; source: string }[],
  max: number
): { text: string; source: string; itemId: string }[] {
  const highlights: { text: string; source: string; itemId: string; score: number }[] = [];

  // Signal words that indicate important/interesting content
  const signalWords = new Set([
    "first", "new", "launch", "announce", "reveal", "discover", "break",
    "billion", "million", "percent", "partnership", "acquisition", "release",
    "record", "unprecedented", "revolutionary", "critical", "major",
  ]);

  for (const item of items) {
    // Split summary into sentences
    const sentences = item.summary
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.length > 30 && s.length < 200);

    for (const sentence of sentences) {
      let score = 0;
      const words = sentence.toLowerCase().split(/\s+/);

      // Signal words boost
      for (const word of words) {
        if (signalWords.has(word)) score += 3;
      }

      // Numbers = specificity
      if (/\d/.test(sentence)) score += 2;

      // Quotes in the sentence
      if (/["']/.test(sentence)) score += 2;

      // Proper length (not too short, not too long)
      if (words.length >= 8 && words.length <= 25) score += 1;

      // Contains a proper noun (capitalized word mid-sentence)
      if (/\s[A-Z][a-z]/.test(sentence)) score += 1;

      if (score >= 3) {
        highlights.push({
          text: sentence.trim(),
          source: item.source,
          itemId: item.id,
          score,
        });
      }
    }
  }

  return highlights
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ text, source, itemId }) => ({ text, source, itemId }));
}

export function ContentHighlights({ items, maxHighlights = 4 }: ContentHighlightsProps) {
  const highlights = useMemo(
    () => extractHighlights(items, maxHighlights),
    [items, maxHighlights]
  );

  if (highlights.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary/10">
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
        </div>
        <h3 className="text-sm font-semibold text-text">Key Highlights</h3>
      </div>
      <div className="space-y-3">
        {highlights.map((highlight, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-lg bg-bg p-3 transition-colors hover:bg-bg-hover/50"
          >
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-secondary/60" />
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-relaxed text-text">
                {highlight.text}
              </p>
              <p className="mt-1 text-[10px] text-text-muted">
                — {highlight.source}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
