import { Rss } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Rss className="h-10 w-10 text-primary" />
      </div>
      <h1 className="mb-2 text-6xl font-bold text-text">404</h1>
      <p className="mb-1 text-xl font-semibold text-text">Page not found</p>
      <p className="mb-8 max-w-sm text-center text-sm text-text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to your feeds.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text transition-colors hover:bg-bg-hover"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
