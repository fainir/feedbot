import { WifiOff, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Offline — FeedBot",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <WifiOff className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-text">You&apos;re offline</h1>
        <p className="mb-6 text-text-muted">
          FeedBot needs an internet connection to fetch your feeds.
          <br />
          Your saved articles and bookmarks will be available when you reconnect.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </a>
      </div>
    </div>
  );
}
