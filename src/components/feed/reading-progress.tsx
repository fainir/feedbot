"use client";

import { useMemo } from "react";
import { BookOpen, CheckCircle2 } from "lucide-react";

interface ReadingProgressProps {
  totalItems: number;
  readCount: number;
  bookmarkCount: number;
}

export function ReadingProgressBar({ totalItems, readCount, bookmarkCount }: ReadingProgressProps) {
  const percentage = useMemo(() => {
    if (totalItems === 0) return 0;
    return Math.round((readCount / totalItems) * 100);
  }, [totalItems, readCount]);

  if (totalItems === 0) return null;

  const isComplete = percentage >= 100;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <BookOpen className="h-4 w-4 text-primary" />
          )}
          <span className="text-xs font-medium text-text">
            {isComplete ? "All caught up!" : "Reading Progress"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-muted">
          <span>{readCount}/{totalItems} read</span>
          {bookmarkCount > 0 && <span>{bookmarkCount} saved</span>}
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-hover">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete
              ? "bg-gradient-to-r from-green-400 to-emerald-500"
              : "bg-gradient-to-r from-primary to-purple-500"
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {!isComplete && percentage > 0 && (
        <p className="mt-1.5 text-[10px] text-text-muted">
          {percentage}% complete · {totalItems - readCount} remaining
        </p>
      )}
    </div>
  );
}
