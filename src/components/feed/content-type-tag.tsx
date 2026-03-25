"use client";

import { useMemo } from "react";
import { Newspaper, BookOpen, MessageCircle, BarChart2 } from "lucide-react";

type ContentType = "news" | "tutorial" | "opinion" | "analysis";

const NEWS_SIGNALS = [
  "announces", "announced", "launches", "launched", "raises", "raised",
  "acquires", "acquired", "reports", "reported", "breaking", "update",
  "releases", "released", "unveils", "unveiled", "confirms", "confirmed",
  "today", "yesterday", "just", "new", "latest", "funding", "ipo",
  "partnership", "deal", "merger", "acquisition",
];

const TUTORIAL_SIGNALS = [
  "how to", "tutorial", "guide", "step-by-step", "getting started",
  "introduction", "learn", "building", "creating", "implement",
  "setup", "configure", "install", "beginners", "walkthrough",
  "explained", "deep dive", "hands-on", "practical", "example",
];

const OPINION_SIGNALS = [
  "why i", "why we", "i think", "my take", "opinion", "hot take",
  "unpopular", "overrated", "underrated", "rant", "should", "must",
  "better than", "worse than", "review", "perspective", "thoughts on",
  "in defense of", "against", "debate", "controversial",
];

const ANALYSIS_SIGNALS = [
  "analysis", "deep dive", "comparison", "benchmark", "study",
  "research", "findings", "report", "data shows", "statistics",
  "trends", "forecast", "prediction", "outlook", "insights",
  "breakdown", "state of", "survey", "metrics", "performance",
];

function detectContentType(title: string, summary: string): ContentType {
  const text = `${title} ${summary}`.toLowerCase();

  let newsScore = 0;
  let tutorialScore = 0;
  let opinionScore = 0;
  let analysisScore = 0;

  for (const signal of NEWS_SIGNALS) {
    if (text.includes(signal)) newsScore++;
  }
  for (const signal of TUTORIAL_SIGNALS) {
    if (text.includes(signal)) tutorialScore++;
  }
  for (const signal of OPINION_SIGNALS) {
    if (text.includes(signal)) opinionScore++;
  }
  for (const signal of ANALYSIS_SIGNALS) {
    if (text.includes(signal)) analysisScore++;
  }

  const max = Math.max(newsScore, tutorialScore, opinionScore, analysisScore);
  if (max === 0) return "news"; // default

  if (tutorialScore === max) return "tutorial";
  if (opinionScore === max) return "opinion";
  if (analysisScore === max) return "analysis";
  return "news";
}

const TYPE_CONFIG: Record<ContentType, { icon: typeof Newspaper; label: string; className: string }> = {
  news: {
    icon: Newspaper,
    label: "News",
    className: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  tutorial: {
    icon: BookOpen,
    label: "Tutorial",
    className: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  opinion: {
    icon: MessageCircle,
    label: "Opinion",
    className: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  analysis: {
    icon: BarChart2,
    label: "Analysis",
    className: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
};

interface ContentTypeTagProps {
  title: string;
  summary: string;
}

export function ContentTypeTag({ title, summary }: ContentTypeTagProps) {
  const type = useMemo(() => detectContentType(title, summary), [title, summary]);
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  // Don't show "News" tag since it's the default/most common
  if (type === "news") return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${config.className}`}
      title={`${config.label} content`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// Filter helper for content type filtering
export function getContentType(title: string, summary: string): ContentType {
  return detectContentType(title, summary);
}

// Content type filter chips
interface ContentTypeFilterProps {
  active: ContentType | null;
  onChange: (type: ContentType | null) => void;
  items: { title: string; summary: string }[];
}

export function ContentTypeFilter({ active, onChange, items }: ContentTypeFilterProps) {
  const counts = useMemo(() => {
    const c: Record<ContentType, number> = { news: 0, tutorial: 0, opinion: 0, analysis: 0 };
    for (const item of items) {
      c[detectContentType(item.title, item.summary)]++;
    }
    return c;
  }, [items]);

  const types: ContentType[] = ["news", "tutorial", "opinion", "analysis"];

  return (
    <div className="flex items-center gap-1">
      {types.map((type) => {
        if (counts[type] === 0) return null;
        const config = TYPE_CONFIG[type];
        const Icon = config.icon;
        const isActive = active === type;

        return (
          <button
            key={type}
            onClick={() => onChange(isActive ? null : type)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              isActive
                ? config.className
                : "text-text-muted hover:bg-bg-hover hover:text-text"
            }`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
            <span className="text-[9px] opacity-60">{counts[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
