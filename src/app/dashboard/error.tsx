"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-text">Something went wrong</h2>
      <p className="mb-6 max-w-md text-center text-sm text-text-muted">
        The dashboard encountered an unexpected error. Your data is safe - try refreshing.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
