"use client";

import { useState } from "react";
import { ExternalLink, Globe, Share2, Check, Twitter, Link as LinkIcon, Bookmark } from "lucide-react";
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
}: FeedCardProps) {
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

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
    <Card className="group transition-colors hover:border-primary/40 hover:bg-bg-hover/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-base font-semibold text-text transition-colors hover:text-primary"
          >
            <span className="line-clamp-1">{title}</span>
            <ExternalLink className="h-4 w-4 shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" />
          </a>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">
            {summary}
          </p>
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
    </Card>
  );
}
