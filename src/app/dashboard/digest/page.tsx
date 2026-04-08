"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface DigestItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  feedName: string;
}

export default function DigestPage() {
  const [items, setItems] = useState<DigestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDigest() {
      try {
        const feedsRes = await fetch("/api/feeds");
        if (!feedsRes.ok) return;
        const { feeds } = await feedsRes.json();
        if (!feeds || feeds.length === 0) {
          setLoading(false);
          return;
        }

        const allItems: DigestItem[] = [];
        for (const feed of feeds.slice(0, 5)) {
          try {
            const res = await fetch(`/api/feeds/${feed.id}?limit=5`);
            if (!res.ok) continue;
            const data = await res.json();
            for (const item of (data.items || []).slice(0, 3)) {
              allItems.push({
                id: item.id,
                title: item.title,
                summary: item.summary,
                source: item.source || "",
                url: item.url,
                feedName: feed.name,
              });
            }
          } catch {}
        }
        setItems(allItems);
      } catch {}
      setLoading(false);
    }
    loadDigest();
  }, []);

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);
  const dateRange = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text">Weekly Digest</h1>
          <p className="flex items-center gap-1.5 text-sm text-text-muted">
            <Calendar className="h-3.5 w-3.5" />
            {dateRange}
          </p>
        </div>
      </div>

      <p className="mb-6 text-sm text-text-muted">
        Preview of your weekly email digest. This is what subscribers receive every Monday.
      </p>

      {/* Email Preview */}
      <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        {/* Email Header */}
        <div className="border-b border-border bg-primary/5 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Mail className="h-4 w-4" />
            <span>From: MyFeed &lt;digest@myfeed.app&gt;</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-text">
            Your Weekly MyFeed Digest
          </h2>
          <p className="text-xs text-text-muted">{dateRange}</p>
        </div>

        {/* Email Body */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              No items to include in this week&apos;s digest. Add some feeds first!
            </p>
          ) : (
            <div className="space-y-4">
              {/* Group by feed */}
              {(() => {
                const grouped: Record<string, DigestItem[]> = {};
                for (const item of items) {
                  if (!grouped[item.feedName]) grouped[item.feedName] = [];
                  grouped[item.feedName].push(item);
                }
                return Object.entries(grouped).map(([feedName, feedItems]) => (
                  <div key={feedName}>
                    <h3 className="mb-2 text-sm font-semibold text-primary">
                      {feedName}
                    </h3>
                    <div className="space-y-2">
                      {feedItems.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border p-3">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-text hover:text-primary"
                          >
                            {item.title}
                          </a>
                          <p className="mt-1 text-xs text-text-muted line-clamp-2">
                            {item.summary}
                          </p>
                          <p className="mt-1 text-[10px] text-text-muted/60">
                            {item.source}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Email Footer */}
        <div className="border-t border-border px-6 py-3">
          <p className="text-center text-xs text-text-muted">
            Powered by MyFeed - Your Internet, Curated by AI
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Button variant="outline" disabled>
          <Mail className="h-4 w-4" />
          Send Test Digest (Coming Soon)
        </Button>
      </div>
    </div>
  );
}
