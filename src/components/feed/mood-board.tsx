"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  LayoutGrid,
  List,
  Shuffle,
  Pin,
  Bookmark,
  BookOpen,
  Globe,
  Clock,
  Quote,
} from "lucide-react";
import { readingTime } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MoodBoardItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
  bookmarked?: boolean;
  pinned?: boolean;
}

type CardVariant = "hero" | "standard" | "quote" | "minimal";

interface MoodBoardProps {
  items: MoodBoardItem[];
  onOpenReader?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onPin?: (id: string) => void;
}

interface MoodBoardToggleProps {
  view: "board" | "list";
  onChange: (view: "board" | "list") => void;
}

/* ------------------------------------------------------------------ */
/*  Gradient presets (8)                                                */
/* ------------------------------------------------------------------ */

const GRADIENT_PRESETS = [
  "from-rose-500/20 to-orange-400/20 dark:from-rose-500/30 dark:to-orange-400/30",
  "from-violet-500/20 to-fuchsia-400/20 dark:from-violet-500/30 dark:to-fuchsia-400/30",
  "from-cyan-500/20 to-blue-400/20 dark:from-cyan-500/30 dark:to-blue-400/30",
  "from-emerald-500/20 to-teal-400/20 dark:from-emerald-500/30 dark:to-teal-400/30",
  "from-amber-500/20 to-yellow-400/20 dark:from-amber-500/30 dark:to-yellow-400/30",
  "from-pink-500/20 to-purple-400/20 dark:from-pink-500/30 dark:to-purple-400/30",
  "from-sky-500/20 to-indigo-400/20 dark:from-sky-500/30 dark:to-indigo-400/30",
  "from-lime-500/20 to-green-400/20 dark:from-lime-500/30 dark:to-green-400/30",
];

const HERO_GRADIENTS = [
  "from-rose-600/80 to-orange-500/80 dark:from-rose-700/90 dark:to-orange-600/90",
  "from-violet-600/80 to-fuchsia-500/80 dark:from-violet-700/90 dark:to-fuchsia-600/90",
  "from-cyan-600/80 to-blue-500/80 dark:from-cyan-700/90 dark:to-blue-600/90",
  "from-emerald-600/80 to-teal-500/80 dark:from-emerald-700/90 dark:to-teal-600/90",
  "from-amber-600/80 to-yellow-500/80 dark:from-amber-700/90 dark:to-yellow-600/90",
  "from-pink-600/80 to-purple-500/80 dark:from-pink-700/90 dark:to-purple-600/90",
  "from-sky-600/80 to-indigo-500/80 dark:from-sky-700/90 dark:to-indigo-600/90",
  "from-lime-600/80 to-green-500/80 dark:from-lime-700/90 dark:to-green-600/90",
];

const QUOTE_ACCENTS = [
  "border-rose-400/50 bg-rose-50 dark:bg-rose-950/40",
  "border-violet-400/50 bg-violet-50 dark:bg-violet-950/40",
  "border-cyan-400/50 bg-cyan-50 dark:bg-cyan-950/40",
  "border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/40",
  "border-amber-400/50 bg-amber-50 dark:bg-amber-950/40",
  "border-pink-400/50 bg-pink-50 dark:bg-pink-950/40",
  "border-sky-400/50 bg-sky-50 dark:bg-sky-950/40",
  "border-lime-400/50 bg-lime-50 dark:bg-lime-950/40",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickGradient(source: string): number {
  return hashString(source) % GRADIENT_PRESETS.length;
}

/** Deterministic-ish variant assignment based on item id + a seed. */
function assignVariant(id: string, seed: number): CardVariant {
  const h = hashString(id + String(seed));
  const r = h % 10;
  if (r < 2) return "hero";
  if (r < 6) return "standard";
  if (r < 8) return "quote";
  return "minimal";
}

/** Extract a "quote-worthy" sentence from summary. */
function extractQuote(summary: string): string {
  const sentences = summary.split(/(?<=[.!?])\s+/);
  if (sentences.length === 0) return summary;
  // pick the longest sentence (most interesting)
  let best = sentences[0];
  for (const s of sentences) {
    if (s.length > best.length) best = s;
  }
  return best.length > 160 ? best.slice(0, 157) + "..." : best;
}

/* ------------------------------------------------------------------ */
/*  Card variants                                                      */
/* ------------------------------------------------------------------ */

interface CardInternalProps {
  item: MoodBoardItem;
  variant: CardVariant;
  gradientIdx: number;
  animDelay: number;
  onOpenReader?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onPin?: (id: string) => void;
  visible: boolean;
}

function MoodCard({
  item,
  variant,
  gradientIdx,
  animDelay,
  onOpenReader,
  onBookmark,
  onPin,
  visible,
}: CardInternalProps) {
  const [hovered, setHovered] = useState(false);

  const baseClasses =
    "group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-bg-card transition-all duration-300 break-inside-avoid mb-4";
  const hoverClasses = "hover:shadow-lg hover:-translate-y-1";
  const fadeIn = visible
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-4";

  const handleClick = () => onOpenReader?.(item.id);

  /* Hover actions overlay */
  const actions = (
    <div
      className={`absolute right-2 top-2 z-10 flex gap-1 transition-opacity duration-200 ${
        hovered ? "opacity-100" : "opacity-0"
      }`}
    >
      {onBookmark && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBookmark(item.id);
          }}
          className={`rounded-full p-1.5 backdrop-blur-sm transition-colors ${
            item.bookmarked
              ? "bg-white/90 text-amber-500 dark:bg-black/70"
              : "bg-white/70 text-text-muted hover:text-text dark:bg-black/50"
          }`}
          title={item.bookmarked ? "Remove bookmark" : "Bookmark"}
        >
          <Bookmark
            className={`h-3.5 w-3.5 ${item.bookmarked ? "fill-amber-500" : ""}`}
          />
        </button>
      )}
      {onPin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin(item.id);
          }}
          className={`rounded-full p-1.5 backdrop-blur-sm transition-colors ${
            item.pinned
              ? "bg-white/90 text-orange-400 dark:bg-black/70"
              : "bg-white/70 text-text-muted hover:text-text dark:bg-black/50"
          }`}
          title={item.pinned ? "Unpin" : "Pin to top"}
        >
          <Pin
            className={`h-3.5 w-3.5 ${item.pinned ? "fill-orange-400/30" : ""}`}
          />
        </button>
      )}
    </div>
  );

  /* Source + meta bar */
  const metaBar = (
    <div className="flex items-center gap-2 text-[11px] text-text-muted">
      {item.sourceIcon ? (
        <img
          src={item.sourceIcon}
          alt={item.source}
          className="h-3.5 w-3.5 rounded-sm"
        />
      ) : (
        <Globe className="h-3 w-3" />
      )}
      <span className="truncate">{item.source}</span>
      <span className="text-border">·</span>
      <Clock className="h-3 w-3" />
      <span>{readingTime(item.summary)}</span>
    </div>
  );

  /* Pinned indicator */
  const pinnedBadge = item.pinned && (
    <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-orange-400/90 px-2 py-0.5 text-[10px] font-medium text-white">
      <Pin className="h-2.5 w-2.5 fill-white" />
      Pinned
    </div>
  );

  /* Summary tooltip on long hover */
  const tooltip = hovered && variant !== "hero" && (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-b-xl bg-black/85 p-3 text-xs leading-relaxed text-white backdrop-blur-sm transition-opacity dark:bg-black/90">
      {item.summary.length > 240
        ? item.summary.slice(0, 237) + "..."
        : item.summary}
    </div>
  );

  /* --- Hero Card --- */
  if (variant === "hero") {
    return (
      <div
        className={`${baseClasses} ${hoverClasses} ${fadeIn} col-span-2`}
        style={{ transitionDelay: `${animDelay}ms` }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {pinnedBadge}
        {actions}
        <div
          className={`relative flex min-h-[200px] flex-col justify-end bg-gradient-to-br p-5 ${HERO_GRADIENTS[gradientIdx]}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="relative z-[1]">
            <h3 className="mb-2 text-lg font-bold leading-tight text-white sm:text-xl">
              {item.title}
            </h3>
            <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-white/80">
              {item.summary}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-white/70">
              {item.sourceIcon ? (
                <img
                  src={item.sourceIcon}
                  alt={item.source}
                  className="h-3.5 w-3.5 rounded-sm"
                />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              <span>{item.source}</span>
              <span className="text-white/40">·</span>
              <Clock className="h-3 w-3" />
              <span>{readingTime(item.summary)}</span>
            </div>
          </div>
          <div
            className={`absolute bottom-0 left-0 right-0 flex items-center gap-1.5 bg-black/60 px-4 py-2 text-xs text-white/90 backdrop-blur-sm transition-opacity ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Click to read
          </div>
        </div>
      </div>
    );
  }

  /* --- Quote Card --- */
  if (variant === "quote") {
    return (
      <div
        className={`${baseClasses} ${hoverClasses} ${fadeIn} border-l-4 ${QUOTE_ACCENTS[gradientIdx]}`}
        style={{ transitionDelay: `${animDelay}ms` }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {pinnedBadge}
        {actions}
        <div className="p-4">
          <Quote className="mb-2 h-6 w-6 text-text-muted/30" />
          <blockquote className="mb-3 text-sm font-medium italic leading-relaxed text-text">
            &ldquo;{extractQuote(item.summary)}&rdquo;
          </blockquote>
          <h4 className="mb-2 text-xs font-semibold text-text">{item.title}</h4>
          {metaBar}
        </div>
        {tooltip}
      </div>
    );
  }

  /* --- Minimal Card --- */
  if (variant === "minimal") {
    return (
      <div
        className={`${baseClasses} ${hoverClasses} ${fadeIn}`}
        style={{ transitionDelay: `${animDelay}ms` }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {pinnedBadge}
        {actions}
        <div className="p-3">
          <h4 className="mb-1.5 text-sm font-semibold leading-snug text-text line-clamp-2">
            {item.title}
          </h4>
          {metaBar}
        </div>
        {tooltip}
      </div>
    );
  }

  /* --- Standard Card (default) --- */
  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${fadeIn}`}
      style={{ transitionDelay: `${animDelay}ms` }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {pinnedBadge}
      {actions}
      {/* Image placeholder area with gradient */}
      <div
        className={`h-28 w-full bg-gradient-to-br ${GRADIENT_PRESETS[gradientIdx]} flex items-center justify-center`}
      >
        <BookOpen className="h-8 w-8 text-text-muted/30" />
      </div>
      <div className="p-4">
        <h4 className="mb-1.5 text-sm font-semibold leading-snug text-text line-clamp-2">
          {item.title}
        </h4>
        <p className="mb-3 text-xs leading-relaxed text-text-muted line-clamp-3">
          {item.summary}
        </p>
        {metaBar}
      </div>
      {tooltip}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main MoodBoard component                                           */
/* ------------------------------------------------------------------ */

export function MoodBoard({ items, onOpenReader, onBookmark, onPin }: MoodBoardProps) {
  const [seed, setSeed] = useState(0);
  const [visible, setVisible] = useState(false);

  // Staggered load-in animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Re-trigger animation on shuffle
  const shuffle = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setSeed((s) => s + 1);
      setVisible(true);
    }, 150);
  }, []);

  // Sort: pinned items first, then keep order
  const sortedItems = useMemo(() => {
    const pinned = items.filter((i) => i.pinned);
    const rest = items.filter((i) => !i.pinned);
    return [...pinned, ...rest];
  }, [items]);

  // Assign variants
  const cardData = useMemo(
    () =>
      sortedItems.map((item) => ({
        item,
        variant: assignVariant(item.id, seed),
        gradientIdx: pickGradient(item.source),
      })),
    [sortedItems, seed]
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={shuffle}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          title="Shuffle layout"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Shuffle
        </button>
      </div>

      {/* Masonry grid via CSS columns */}
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {cardData.map(({ item, variant, gradientIdx }, idx) => (
          <MoodCard
            key={item.id}
            item={item}
            variant={variant}
            gradientIdx={gradientIdx}
            animDelay={Math.min(idx * 60, 600)}
            onOpenReader={onOpenReader}
            onBookmark={onBookmark}
            onPin={onPin}
            visible={visible}
          />
        ))}
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <LayoutGrid className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No articles to display</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  View Toggle                                                        */
/* ------------------------------------------------------------------ */

export function MoodBoardToggle({ view, onChange }: MoodBoardToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border p-0.5">
      <button
        onClick={() => onChange("board")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          view === "board"
            ? "bg-primary text-white"
            : "text-text-muted hover:text-text"
        }`}
        title="Mood board view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Board
      </button>
      <button
        onClick={() => onChange("list")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          view === "list"
            ? "bg-primary text-white"
            : "text-text-muted hover:text-text"
        }`}
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
        List
      </button>
    </div>
  );
}
