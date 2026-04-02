"use client";

import { useState, useEffect } from "react";
import { Rss, Plus, LogIn, RefreshCw } from "lucide-react";
import Link from "next/link";

interface FeedItem {
  title: string;
  url: string;
  summary: string;
  source: string;
}

const DEFAULT_TABS = [
  { id: "tech", name: "Tech News", query: "technology news" },
  { id: "ai", name: "AI & ML", query: "artificial intelligence machine learning" },
  { id: "startup", name: "Startups", query: "startup funding venture capital" },
  { id: "dev", name: "Dev", query: "software engineering programming" },
  { id: "science", name: "Science", query: "science research discoveries" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("tech");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const tab = DEFAULT_TABS.find((t) => t.id === activeTab);
    if (!tab) return;

    fetch("/api/feed/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: tab.query }),
    })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">MyFeed</h1>
          <span className="text-xs text-text-muted bg-bg-hover px-2 py-0.5 rounded-full">beta</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
          <Link
            href="/login?signup=true"
            className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Feed
          </Link>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="border-b border-border px-4 flex gap-1 overflow-x-auto">
        {DEFAULT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text hover:border-border"
            }`}
          >
            {tab.name}
          </button>
        ))}
        <Link
          href="/login?signup=true"
          className="px-4 py-3 text-sm text-text-muted hover:text-primary flex items-center gap-1 whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5" />
          New Tab
        </Link>
      </nav>

      {/* Feed Content */}
      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-5 bg-bg-hover rounded w-3/4 mb-2" />
                <div className="h-3 bg-bg-hover rounded w-full mb-1" />
                <div className="h-3 bg-bg-hover rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No articles yet. Feeds refresh daily.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {items.map((item, i) => (
              <article key={i} className="group">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:bg-bg-hover -mx-3 px-3 py-2 rounded-lg transition-colors"
                >
                  <h2 className="font-semibold text-text group-hover:text-primary transition-colors">
                    {item.title}
                  </h2>
                  {item.summary && (
                    <p className="text-sm text-text-muted mt-1 line-clamp-2">{item.summary}</p>
                  )}
                  <span className="text-xs text-text-muted mt-1 inline-block">{item.source}</span>
                </a>
              </article>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center border border-border rounded-xl p-6 bg-bg-hover/50">
          <h3 className="font-semibold text-lg mb-2">Want your own custom feeds?</h3>
          <p className="text-sm text-text-muted mb-4">
            Describe what you care about in plain English. MyFeed finds articles from across the internet.
          </p>
          <Link
            href="/login?signup=true"
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your Feed — Free
          </Link>
        </div>
      </main>
    </div>
  );
}
