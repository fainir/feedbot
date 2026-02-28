"use client";

import { ExternalLink, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";

interface FeedCardProps {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

export function FeedCard({
  title,
  summary,
  source,
  url,
  publishedAt,
  sourceIcon,
}: FeedCardProps) {
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
            <ExternalLink className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">
            {summary}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-text-muted">
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
      </div>
    </Card>
  );
}
