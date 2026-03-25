"use client";

import { useState, useCallback } from "react";
import { Sparkles, X, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CatchMeUpProps {
  unreadItems: { title: string; summary: string; source: string }[];
}

export function CatchMeUp({ unreadItems }: CatchMeUpProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (unreadItems.length === 0) return;
    setLoading(true);
    setDigest(null);
    try {
      const res = await fetch("/api/feed/catch-me-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: unreadItems.slice(0, 40).map((i) => ({
            title: i.title,
            summary: i.summary.slice(0, 200),
            source: i.source,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setDigest(data.digest);
    } catch {
      setDigest("Failed to generate digest. Please try again.");
    }
    setLoading(false);
  }, [unreadItems]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    if (!digest && !loading) generate();
  }, [digest, loading, generate]);

  const copyDigest = useCallback(async () => {
    if (!digest) return;
    await navigator.clipboard.writeText(digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [digest]);

  if (unreadItems.length === 0) return null;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:from-primary/20 hover:to-purple-500/20 hover:shadow-md"
      >
        <Sparkles className="h-4 w-4" />
        Catch Me Up
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold">
          {unreadItems.length} unread
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text">AI Digest</h2>
                  <p className="text-xs text-text-muted">
                    Summary of {unreadItems.length} unread items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={generate}
                  disabled={loading}
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text disabled:opacity-50"
                  title="Regenerate"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-6 w-6 animate-pulse text-primary" />
                  </div>
                  <p className="text-sm text-text-muted">Analyzing your feeds...</p>
                  <div className="h-1 w-48 overflow-hidden rounded-full bg-bg-hover">
                    <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] rounded-full bg-primary/40" />
                  </div>
                </div>
              ) : digest ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {digest.split("\n\n").map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-text">
                      {para}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
            {digest && !loading && (
              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                <Button variant="ghost" size="sm" onClick={copyDigest}>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
