"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, X, Bell, ChevronDown, ChevronUp, Trash2, ExternalLink } from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

interface QueueItem {
  item: FeedItem;
  addedAt: string;
  remindAt: string | null; // ISO string or null
}

interface ReadLaterQueueProps {
  onOpenReader: (item: FeedItem) => void;
}

export function useReadLater() {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("feedbot-read-later");
      if (saved) setQueue(JSON.parse(saved));
    } catch {}
  }, []);

  const save = useCallback((items: QueueItem[]) => {
    localStorage.setItem("feedbot-read-later", JSON.stringify(items));
  }, []);

  const addToQueue = useCallback((item: FeedItem, remindMinutes?: number) => {
    setQueue((prev) => {
      if (prev.some((q) => q.item.id === item.id)) return prev;
      const remindAt = remindMinutes
        ? new Date(Date.now() + remindMinutes * 60000).toISOString()
        : null;
      const next = [{ item, addedAt: new Date().toISOString(), remindAt }, ...prev];
      save(next);
      return next;
    });
  }, [save]);

  const removeFromQueue = useCallback((itemId: string) => {
    setQueue((prev) => {
      const next = prev.filter((q) => q.item.id !== itemId);
      save(next);
      return next;
    });
  }, [save]);

  const isInQueue = useCallback((itemId: string) => queue.some((q) => q.item.id === itemId), [queue]);

  return { queue, addToQueue, removeFromQueue, isInQueue };
}

export function ReadLaterButton({
  inQueue,
  onAdd,
  onRemove,
}: {
  inQueue: boolean;
  onAdd: (minutes?: number) => void;
  onRemove: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  if (inQueue) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-400 transition-all sm:opacity-0 sm:group-hover:opacity-100"
        title="Remove from read later"
      >
        <Clock className="h-3.5 w-3.5 fill-blue-400/20" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-all hover:bg-bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100"
        title="Read later"
      >
        <Clock className="h-3.5 w-3.5" />
      </button>
      {showMenu && (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-bg-card p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onAdd(); setShowMenu(false); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-text-muted hover:bg-bg-hover hover:text-text"
          >
            <Clock className="h-3.5 w-3.5" />
            Read later
          </button>
          <button
            onClick={() => { onAdd(30); setShowMenu(false); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-text-muted hover:bg-bg-hover hover:text-text"
          >
            <Bell className="h-3.5 w-3.5" />
            Remind in 30 min
          </button>
          <button
            onClick={() => { onAdd(60); setShowMenu(false); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-text-muted hover:bg-bg-hover hover:text-text"
          >
            <Bell className="h-3.5 w-3.5" />
            Remind in 1 hour
          </button>
          <button
            onClick={() => { onAdd(1440); setShowMenu(false); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-text-muted hover:bg-bg-hover hover:text-text"
          >
            <Bell className="h-3.5 w-3.5" />
            Remind tomorrow
          </button>
        </div>
      )}
    </div>
  );
}

export function ReadLaterQueue({ onOpenReader }: ReadLaterQueueProps) {
  const { queue, removeFromQueue } = useReadLater();
  const [expanded, setExpanded] = useState(false);

  // Check for reminders
  const dueReminders = useMemo(() => {
    const now = Date.now();
    return queue.filter((q) => q.remindAt && new Date(q.remindAt).getTime() <= now);
  }, [queue]);

  if (queue.length === 0) return null;

  const shown = expanded ? queue : queue.slice(0, 3);

  return (
    <div className={`mb-4 rounded-xl border p-3 ${
      dueReminders.length > 0
        ? "border-blue-500/30 bg-blue-500/5"
        : "border-border bg-bg-card"
    }`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`h-3.5 w-3.5 ${dueReminders.length > 0 ? "text-blue-400" : "text-text-muted"}`} />
          <span className="text-xs font-semibold text-text">Read Later</span>
          <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
            {queue.length}
          </span>
          {dueReminders.length > 0 && (
            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
              {dueReminders.length} due!
            </span>
          )}
        </div>
        {queue.length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-text-muted hover:text-text"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>
      <div className="space-y-1">
        {shown.map((q) => {
          const isDue = q.remindAt && new Date(q.remindAt).getTime() <= Date.now();
          return (
            <div
              key={q.item.id}
              className={`group/rl flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-hover/50 ${
                isDue ? "ring-1 ring-blue-500/30" : ""
              }`}
            >
              {q.item.sourceIcon && (
                <img
                  src={q.item.sourceIcon}
                  alt=""
                  className="h-4 w-4 shrink-0 rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <button
                onClick={() => onOpenReader(q.item)}
                className="min-w-0 flex-1 text-left text-sm font-medium text-text hover:text-primary line-clamp-1"
              >
                {q.item.title}
              </button>
              {isDue && (
                <span className="shrink-0 text-[10px] text-blue-400">due</span>
              )}
              <button
                onClick={() => removeFromQueue(q.item.id)}
                className="shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-red-400 group-hover/rl:opacity-100"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <a
                href={q.item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-text group-hover/rl:opacity-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
