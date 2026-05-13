"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

// Route-level error boundary for /[feed]. If the feed page itself throws —
// e.g. a malformed slug, a network race, a transient JSON parse error — we
// don't want the global "Something broke" page to flash. The most common cause
// of an error here is "slug doesn't exist," so we render a 404-style UI as
// the safe fallback rather than a scary stack trace.
export default function FeedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[feed-route]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg-card border-b border-border flex items-center h-11">
        <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
          <span className="flex items-center justify-center w-7 h-7 bg-text text-bg rounded-md text-[12px] font-black leading-none" style={{ letterSpacing: "-0.02em" }}>MF</span>
        </Link>
        <div className="flex-1" />
        <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 ml-0.5 border-l border-border/50">
          <Link href="/explore" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap">
            <Search className="h-3 w-3" />
            Explore
          </Link>
        </div>
      </header>
      <div className="h-11" />
      <div className="flex items-center justify-center px-4" style={{ minHeight: "calc(100vh - 2.75rem)" }}>
        <div className="text-center max-w-sm">
          <h1 className="text-6xl font-bold mb-2">404</h1>
          <p className="text-text-muted mb-6">We couldn&apos;t load this feed. It may have been moved or never existed.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={reset}
              className="border border-text/30 text-text px-5 py-2.5 rounded-full font-semibold hover:bg-text hover:text-bg transition-all"
            >
              Try again
            </button>
            <Link href="/explore" className="bg-text text-bg px-5 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5">
              <Search className="h-4 w-4" />
              Explore feeds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
