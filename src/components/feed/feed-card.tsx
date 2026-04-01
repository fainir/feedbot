"use client";

import { useState, memo, type ReactNode } from "react";
import { ExternalLink, Globe, Bookmark, MessageSquare, BookOpen, Pin, Layers, Tag } from "lucide-react";
import { TrendingBadge } from "@/components/feed/trending-tab";
import { QuickShareMenu } from "@/components/feed/quick-share";
import { SentimentBadge } from "@/components/feed/sentiment-badge";
import { ContentTypeTag } from "@/components/feed/content-type-tag";
import { Card } from "@/components/ui/card";
import { cn, timeAgo, readingTime } from "@/lib/utils";

interface FeedCardProps {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  isRead?: boolean;
  isFocused?: boolean;
  compact?: boolean;
  note?: string;
  onSaveNote?: (note: string) => void;
  onOpenReader?: () => void;
  trendingReasons?: string[];
  pinned?: boolean;
  onTogglePin?: () => void;
  onFindSimilar?: () => void;
  readLaterSlot?: ReactNode;
  tagBadges?: string[];
}

function arePropsEqual(prev: FeedCardProps, next: FeedCardProps): boolean {
  return (
    prev.title === next.title &&
    prev.summary === next.summary &&
    prev.source === next.source &&
    prev.url === next.url &&
    prev.publishedAt === next.publishedAt &&
    prev.sourceIcon === next.sourceIcon &&
    prev.bookmarked === next.bookmarked &&
    prev.isRead === next.isRead &&
    prev.isFocused === next.isFocused &&
    prev.compact === next.compact &&
    prev.note === next.note &&
    prev.pinned === next.pinned &&
    prev.trendingReasons === next.trendingReasons &&
    prev.tagBadges === next.tagBadges
  );
}

export const FeedCard = memo(function FeedCard({
  title,
  summary,
  source,
  url,
  publishedAt,
  sourceIcon,
  bookmarked,
  onToggleBookmark,
  isRead,
  isFocused,
  compact,
  note,
  onSaveNote,
  onOpenReader,
  trendingReasons,
  pinned,
  onTogglePin,
  onFindSimilar,
  readLaterSlot,
  tagBadges,
}: FeedCardProps) {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(note || "");

  return (
    <Card className={cn(
      "group transition-colors hover:border-primary/40 hover:bg-bg-hover/50",
      isFocused && "ring-2 ring-primary ring-offset-1 ring-offset-bg",
      isRead && "opacity-60",
      compact && "!p-3",
    )} role="article" aria-label={title}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 font-semibold text-text transition-colors hover:text-primary ${compact ? "text-sm" : "text-base"}`}
          >
            <span className="line-clamp-1">{title}</span>
            <ExternalLink className="h-4 w-4 shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" />
          </a>
          {!compact && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">
              {summary}
            </p>
          )}
          {trendingReasons && trendingReasons.length > 0 && (
            <div className="mt-1.5">
              <TrendingBadge reasons={trendingReasons} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            {sourceIcon ? (
              <img
                src={sourceIcon}
                alt={source}
                className="h-4 w-4 rounded-sm"
              />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            <span>{source}</span>
          </div>
          <span className="text-border">|</span>
          <span>{timeAgo(publishedAt)}</span>
          <span className="text-border">|</span>
          <span>{readingTime(summary)}</span>
          <SentimentBadge title={title} summary={summary} />
          <ContentTypeTag title={title} summary={summary} />
        </div>

        <div className="flex items-center gap-1">
          {/* Reader button */}
          {onOpenReader && (
            <button
              onClick={onOpenReader}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
              title="Read inline"
              aria-label={`Read "${title}" inline`}
            >
              <BookOpen className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Bookmark button */}
          {onToggleBookmark && (
            <button
              onClick={onToggleBookmark}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all sm:opacity-0 sm:group-hover:opacity-100 ${
                bookmarked
                  ? "text-secondary"
                  : "text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
              title={bookmarked ? "Remove bookmark" : "Bookmark"}
              aria-label={bookmarked ? `Remove bookmark from "${title}"` : `Bookmark "${title}"`}
              aria-pressed={bookmarked}
            >
              <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-secondary" : ""}`} />
            </button>
          )}

          {/* Pin button */}
          {onTogglePin && (
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all sm:opacity-0 sm:group-hover:opacity-100 ${
                pinned
                  ? "text-orange-400"
                  : "text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
              title={pinned ? "Unpin" : "Pin to top"}
              aria-label={pinned ? `Unpin "${title}"` : `Pin "${title}" to top`}
              aria-pressed={pinned}
            >
              <Pin className={`h-3.5 w-3.5 ${pinned ? "fill-orange-400/30" : ""}`} />
            </button>
          )}

          {/* Similar articles button */}
          {onFindSimilar && (
            <button
              onClick={(e) => { e.stopPropagation(); onFindSimilar(); }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
              title="Find similar articles"
              aria-label={`Find articles similar to "${title}"`}
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Note button */}
          {onSaveNote && (
            <button
              onClick={() => setShowNote((v) => !v)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all sm:opacity-0 sm:group-hover:opacity-100 ${
                note ? "text-primary" : "text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
              title={note ? "Edit note" : "Add note"}
              aria-label={note ? `Edit note on "${title}"` : `Add note to "${title}"`}
              aria-expanded={showNote}
            >
              <MessageSquare className={`h-3.5 w-3.5 ${note ? "fill-primary/20" : ""}`} />
            </button>
          )}

          {/* Read Later */}
          {readLaterSlot}

        {/* Share menu */}
        <QuickShareMenu title={title} url={url} summary={summary} />
        </div>
      </div>
      {/* Tag badges */}
      {tagBadges && tagBadges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tagBadges.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}
      {/* Note display */}
      {note && !showNote && (
        <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2">
          <p className="text-xs text-text-muted">{note}</p>
        </div>
      )}
      {/* Note editor */}
      {showNote && (
        <div className="mt-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note about this item..."
            rows={2}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            aria-label={`Note for "${title}"`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSaveNote?.(noteText);
                setShowNote(false);
              }
              if (e.key === "Escape") setShowNote(false);
            }}
          />
          <div className="mt-1 flex gap-1">
            <button
              onClick={() => { onSaveNote?.(noteText); setShowNote(false); }}
              className="rounded-md bg-primary px-2 py-1 text-xs text-white hover:bg-primary-dark"
              aria-label="Save note"
            >
              Save
            </button>
            <button
              onClick={() => setShowNote(false)}
              className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-hover"
              aria-label="Cancel note editing"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}, arePropsEqual);
