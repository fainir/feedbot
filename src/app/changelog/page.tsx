import type { Metadata } from "next";
import { Rss, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog — FeedBot",
  description: "What's new in FeedBot. All the latest features, improvements, and fixes.",
};

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: { type: "feat" | "fix" | "perf"; text: string }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.0",
    date: "2026-03-29",
    title: "Security Hardening & Full Test Coverage",
    changes: [
      { type: "feat", text: "413 automated tests covering all critical API routes" },
      { type: "fix", text: "SSRF protection on reader and discover endpoints (blocks private IPs, cloud metadata, IPv6)" },
      { type: "fix", text: "PostgREST filter injection prevention in search API" },
      { type: "fix", text: "Open redirect prevention in auth callback" },
      { type: "fix", text: "Timing-safe secret comparison for cron authentication" },
      { type: "perf", text: "FeedCard memo optimization prevents unnecessary re-renders from inline callbacks" },
      { type: "feat", text: "CSP, HSTS, and security headers on all responses" },
      { type: "feat", text: "Rate limiting on feed refresh, reader, discover, summarize, and search endpoints" },
      { type: "fix", text: "Removed unsafe-eval from CSP and added upgrade-insecure-requests" },
      { type: "fix", text: "Trending endpoint no longer exposes private feed summaries" },
      { type: "perf", text: "Removed unused @stripe/stripe-js client-side dependency" },
      { type: "fix", text: "Hardcoded URLs replaced with NEXT_PUBLIC_APP_URL env var" },
    ],
  },
  {
    version: "1.9",
    date: "2026-03-26",
    title: "Dashboard Refactor, System Status & Focus Mode",
    changes: [
      { type: "feat", text: "System status page with live service health checks and uptime chart" },
      { type: "feat", text: "Focus reading timer page with Pomodoro-style sessions and stats" },
      { type: "feat", text: "Dedicated import/export page with OPML and JSON support" },
      { type: "feat", text: "Search API endpoint and reading reports/analytics page" },
      { type: "feat", text: "Detailed use cases page with 6 role-specific examples" },
      { type: "feat", text: "About page with mission, values, tech stack, and stats" },
      { type: "feat", text: "Feed duplicate and user stats API endpoints" },
      { type: "perf", text: "Dashboard refactored from 2,124 lines into 5 focused components" },
    ],
  },
  {
    version: "1.8",
    date: "2026-03-26",
    title: "Templates, Feedback & Notifications",
    changes: [
      { type: "feat", text: "Feed templates library with 24 pre-built feeds across 5 categories" },
      { type: "feat", text: "Account management page with profile, plan info, and account deletion" },
      { type: "feat", text: "Notification preferences: email digest, push, quiet hours" },
      { type: "feat", text: "Feedback widget for collecting user insights" },
      { type: "feat", text: "Activity feed page showing all feed operations" },
      { type: "feat", text: "Getting started interactive guide with progress tracking" },
    ],
  },
  {
    version: "1.7",
    date: "2026-03-25",
    title: "Embeds, API Docs & SEO",
    changes: [
      { type: "feat", text: "Embeddable feed widgets with iframe code and public embed API" },
      { type: "feat", text: "Interactive API documentation page for developers" },
      { type: "feat", text: "Feed stats API endpoint with source analytics" },
      { type: "feat", text: "Keyboard shortcuts reference page" },
      { type: "feat", text: "PWA service worker for offline access" },
      { type: "feat", text: "Competitor comparison table on landing page" },
      { type: "feat", text: "4 new blog posts including FeedBot vs Feedly comparison" },
    ],
  },
  {
    version: "1.6",
    date: "2026-03-24",
    title: "AI Intelligence & Smart Features",
    changes: [
      { type: "feat", text: "AI \"For You\" personalized recommendations based on reading history" },
      { type: "feat", text: "Global cross-feed search with Cmd+Shift+F" },
      { type: "feat", text: "Reading goals with daily targets, progress ring, and streak tracking" },
      { type: "feat", text: "Sentiment badges — positive, negative, neutral indicators" },
      { type: "feat", text: "Similar articles — find related content across all feeds" },
      { type: "feat", text: "Pin articles to the top of any feed" },
      { type: "feat", text: "Read later queue with timed reminders" },
      { type: "feat", text: "Content type auto-tags: News, Tutorial, Opinion, Analysis" },
      { type: "feat", text: "Feed backup and restore as JSON" },
    ],
  },
  {
    version: "1.5",
    date: "2026-03-23",
    title: "Folders, Alerts & Daily Brief",
    changes: [
      { type: "feat", text: "Feed folders/categories for organizing feeds" },
      { type: "feat", text: "Keyword alerts with real-time highlighting" },
      { type: "feat", text: "Daily brief — AI morning summary of top stories" },
      { type: "feat", text: "Notification bell for new items" },
      { type: "feat", text: "Quick filter chips: All, Unread, Today" },
    ],
  },
  {
    version: "1.4",
    date: "2026-03-22",
    title: "Reader & Gamification",
    changes: [
      { type: "feat", text: "Inline article reader with full content extraction" },
      { type: "feat", text: "Reading streaks and gamification badges" },
      { type: "feat", text: "Trending tab with algorithm-detected hot articles" },
      { type: "feat", text: "Command palette (Cmd+K) for power users" },
      { type: "feat", text: "Feed health monitor" },
      { type: "feat", text: "Content deduplication in All view" },
    ],
  },
  {
    version: "1.3",
    date: "2026-03-21",
    title: "Polish & Views",
    changes: [
      { type: "feat", text: "Focus/zen mode for distraction-free reading" },
      { type: "feat", text: "Feed item notes and annotations" },
      { type: "feat", text: "Weekly digest preview" },
      { type: "feat", text: "Multi-select actions (mark read, bookmark)" },
      { type: "feat", text: "Feed auto-discovery from any URL" },
      { type: "feat", text: "Drag-and-drop tab reordering" },
    ],
  },
  {
    version: "1.2",
    date: "2026-03-20",
    title: "Core Features",
    changes: [
      { type: "feat", text: "Mark all as read" },
      { type: "feat", text: "Compact and comfortable view toggle" },
      { type: "feat", text: "OPML import for migrating from other readers" },
      { type: "feat", text: "J/K keyboard navigation" },
      { type: "feat", text: "Read/unread tracking" },
      { type: "feat", text: "Source analytics dashboard" },
      { type: "feat", text: "Reading time estimates" },
      { type: "feat", text: "Infinite scroll" },
    ],
  },
  {
    version: "1.1",
    date: "2026-03-19",
    title: "Export & Bookmarks",
    changes: [
      { type: "feat", text: "RSS and JSON feed export" },
      { type: "feat", text: "Toast notifications" },
      { type: "feat", text: "Loading skeleton animations" },
      { type: "feat", text: "Article bookmarking" },
      { type: "feat", text: "Dark mode toggle" },
      { type: "feat", text: "Feed sharing via URL" },
      { type: "perf", text: "Auto-refresh stale feeds on dashboard load" },
    ],
  },
  {
    version: "1.0",
    date: "2026-03-18",
    title: "Launch",
    changes: [
      { type: "feat", text: "AI-powered feed creation with natural language queries" },
      { type: "feat", text: "Brave Search integration for content discovery" },
      { type: "feat", text: "Supabase persistence for feeds and items" },
      { type: "feat", text: "Stripe integration for Pro subscriptions" },
      { type: "feat", text: "Landing page with pricing and testimonials" },
      { type: "feat", text: "Settings page" },
    ],
  },
];

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  feat: { label: "New", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  fix: { label: "Fix", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  perf: { label: "Perf", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Rss className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-text">FeedBot</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <h1 className="text-3xl font-bold text-text">Changelog</h1>
        <p className="mt-2 text-text-muted">All the latest features, improvements, and fixes.</p>

        <div className="mt-12 space-y-12">
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className="relative">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  v{entry.version}
                </span>
                <span className="text-sm text-text-muted">{entry.date}</span>
              </div>
              <h2 className="mb-3 text-xl font-semibold text-text">{entry.title}</h2>
              <ul className="space-y-2">
                {entry.changes.map((change, i) => {
                  const badge = TYPE_BADGE[change.type];
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-sm text-text-muted">{change.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
