"use client";

import { useEffect } from "react";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <h1 className="mb-2 text-2xl font-bold text-text">Something went wrong</h1>
      <p className="mb-6 text-sm text-text-muted">An unexpected error occurred.</p>
      <button
        onClick={reset}
        className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        Try again
      </button>
    </div>
  );
}
