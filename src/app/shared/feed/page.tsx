"use client";

import { useState, useEffect } from "react";
import { Rss, ExternalLink, Globe, ArrowRight, Sparkles, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import type { FeedItem } from "@/lib/feed-types";

interface SharedFeedData {
  name: string;
  prompt: string;
  items?: FeedItem[];
}

function decodeFeedData(hash: string): SharedFeedData | null {
  try {
    const decoded = decodeURIComponent(atob(hash));
    const data = JSON.parse(decoded);
    if (data && typeof data.name === "string" && typeof data.prompt === "string") {
      return data as SharedFeedData;
    }
    return null;
  } catch {
    return null;
  }
}

function SharedFeedCard({ item }: { item: FeedItem }) {
  let hostname = item.source;
  try {
    hostname = new URL(item.url).hostname.replace(/^www\./, "");
  } catch {
    // keep original source
  }

  return (
    <Card className="group transition-all hover:border-primary/40 hover:bg-bg-hover/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-text transition-colors hover:text-primary"
          >
            <span className="line-clamp-2">{item.title}</span>
            <ExternalLink className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-text-muted">
            {item.summary}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          {item.sourceIcon ? (
            <img
              src={item.sourceIcon}
              alt={hostname}
              className="h-4 w-4 rounded-sm"
            />
          ) : (
            <Globe className="h-3.5 w-3.5" />
          )}
          <span>{hostname}</span>
        </div>
        {item.publishedAt && (
          <>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{timeAgo(item.publishedAt)}</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

export default function SharedFeedPage() {
  const [feedData, setFeedData] = useState<SharedFeedData | null>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setError(true);
      setLoaded(true);
      return;
    }
    const data = decodeFeedData(hash);
    if (!data) {
      setError(true);
    } else {
      setFeedData(data);
    }
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !feedData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
        <div className="rounded-full bg-red-500/10 p-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-text">Invalid Share Link</h1>
        <p className="max-w-sm text-center text-sm text-text-muted">
          This share link is invalid or has expired. Ask the sender for a new link.
        </p>
        <Link href="/">
          <Button variant="primary" size="md">
            Go to FeedBot
          </Button>
        </Link>
      </div>
    );
  }

  const hasItems = feedData.items && feedData.items.length > 0;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-text transition-colors hover:text-primary">
            <Rss className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">FeedBot</span>
          </Link>
          <Link href="/login">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Sign Up Free
            </Button>
          </Link>
        </div>
      </header>

      {/* Feed info */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Rss className="h-3.5 w-3.5" />
            Shared Feed
          </div>
          <h1 className="text-3xl font-bold text-text sm:text-4xl">
            {feedData.name}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-text-muted">
            {feedData.prompt}
          </p>
        </div>

        {/* Feed items */}
        {hasItems ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted">
                {feedData.items!.length} item{feedData.items!.length !== 1 ? "s" : ""} shared
              </p>
            </div>
            {feedData.items!.map((item) => (
              <SharedFeedCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card className="py-12 text-center">
            <Rss className="mx-auto mb-3 h-10 w-10 text-text-muted/40" />
            <p className="text-text-muted">
              This is a feed configuration. Add it to your FeedBot to start seeing items.
            </p>
          </Card>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="text-xl font-bold text-text">
            Add this feed to your FeedBot
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Create your free account and add &ldquo;{feedData.name}&rdquo; to your
            personalized dashboard. Get AI-curated updates on the topics you care about.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/login">
              <Button variant="primary" size="lg" className="gap-2">
                Add to My FeedBot
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-border py-6 text-center text-xs text-text-muted">
          Powered by{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            FeedBot
          </Link>{" "}
          &mdash; Your Internet, Curated by AI
        </footer>
      </div>
    </div>
  );
}
