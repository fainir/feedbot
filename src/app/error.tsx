"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border flex items-center h-11">
        <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
        </Link>
        <div className="flex-1" />
        <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 border-l border-border">
          <Link href="/explore" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap">Explore</Link>
        </div>
      </header>
      <div className="flex items-center justify-center px-4" style={{ minHeight: "calc(100vh - 2.75rem)" }}>
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-2">404</h1>
          <p className="text-text-muted mb-6">Something went wrong</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="border border-text/30 text-text px-6 py-2.5 rounded-full font-semibold hover:bg-text hover:text-bg transition-all"
            >
              Try again
            </button>
            <Link href="/explore" className="bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">
              Explore feeds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
