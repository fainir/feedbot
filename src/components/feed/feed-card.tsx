"use client";

import { useState } from "react";
import { ExternalLink, Globe, Share2, Check, Twitter, Link as LinkIcon, Bookmark, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { timeAgo, readingTime } from "@/lib/utils";

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
}

export function FeedCard({
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
}: FeedCardProps) {
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(note || "");

  const shareText = `${title} — found via FeedBot`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  return (
    <Card className={`group transition-colors hover:border-primary/40 hover:bg-bg-hover/50 ${isFocused ? "ring-2 ring-primary ring-offset-1 ring-offset-bg" : ""} ${isRead ? "opacity-60" : ""} ${compact ? "!p-3" : ""}`}>
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
        </div>

        <div className="flex items-center gap-1">
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
            >
              <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-secondary" : ""}`} />
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
            >
              <MessageSquare className={`h-3.5 w-3.5 ${note ? "fill-primary/20" : ""}`} />
            </button>
          )}

        {/* Share button */}
        <div className="relative">
          <button
            onClick={() => setShowShare(!showShare)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          {showShare && (
            <div className="absolute bottom-full right-0 z-10 mb-1 flex items-center gap-1 rounded-lg border border-border bg-bg-card p-1.5 shadow-lg">
              <button
                onClick={copyLink}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <LinkIcon className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={shareToTwitter}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                title="Share on X"
              >
                <Twitter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={shareToLinkedIn}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                title="Share on LinkedIn"
              >
                <span className="text-xs font-bold">in</span>
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
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
            >
              Save
            </button>
            <button
              onClick={() => setShowNote(false)}
              className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-bg-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
