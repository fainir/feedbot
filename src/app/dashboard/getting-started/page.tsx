"use client";

import { useState } from "react";
import { ArrowLeft, Check, Rss, Bookmark, Search, Keyboard, Bell, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Step {
  icon: typeof Rss;
  title: string;
  description: string;
  action: string;
  actionUrl?: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    icon: Rss,
    title: "Create your first feed",
    description: "Go to the dashboard and click \"New Tab\" or pick a template like AI News, Startups, or Dev Tools. Type what you want to follow in plain English.",
    action: "Go to Dashboard",
    actionUrl: "/dashboard",
    tip: "Be specific! \"AI safety research papers\" works better than just \"AI\".",
  },
  {
    icon: Bookmark,
    title: "Save articles you love",
    description: "Click the bookmark icon on any article to save it. Access your saved items from the \"Saved\" tab in the tab bar.",
    action: "Try bookmarking",
    tip: "Use the 'B' key to jump to your saved items anytime.",
  },
  {
    icon: Search,
    title: "Search across all feeds",
    description: "Press Cmd+Shift+F (or Ctrl+Shift+F on Windows) to open the global search. Search by keyword, filter by date range or source.",
    action: "Try searching",
    tip: "You can also filter by content type: News, Tutorial, Opinion, or Analysis.",
  },
  {
    icon: Keyboard,
    title: "Master keyboard shortcuts",
    description: "MyFeed is built for speed. Press '?' to see all shortcuts. Use J/K to navigate items, O to open, R to read inline, M to mark as read.",
    action: "Press ? for shortcuts",
    tip: "Use Cmd+K to open the command palette - the fastest way to do anything.",
  },
  {
    icon: Bell,
    title: "Set up notifications",
    description: "Enable push notifications in the header to get alerts for new items. Set up keyword alerts to be notified when specific topics appear.",
    action: "Enable notifications",
    tip: "Keyword alerts with push notifications are perfect for monitoring competitors.",
  },
  {
    icon: Sparkles,
    title: "Discover AI features",
    description: "Check out the \"For You\" picks for personalized recommendations, Daily Brief for a morning summary, and \"Catch Me Up\" to summarize what you missed.",
    action: "Explore features",
    actionUrl: "/dashboard",
    tip: "The more you read, the better \"For You\" gets at recommending articles.",
  },
];

export default function GettingStartedPage() {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem("myfeed-getting-started");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      localStorage.setItem("myfeed-getting-started", JSON.stringify([...next]));
      return next;
    });
  };

  const progress = Math.round((completedSteps.size / STEPS.length) * 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Getting Started with MyFeed</h1>
        <p className="mt-1 text-sm text-text-muted">
          Complete these steps to get the most out of your feeds.
        </p>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 rounded-full bg-border">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-text">
            {completedSteps.size}/{STEPS.length}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const completed = completedSteps.has(idx);

          return (
            <div
              key={idx}
              className={`rounded-xl border p-5 transition-colors ${
                completed
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-border bg-bg-card"
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleStep(idx)}
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    completed
                      ? "bg-green-500/20 text-green-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className={`text-base font-semibold ${completed ? "text-green-400 line-through" : "text-text"}`}>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">{step.description}</p>
                  {step.tip && (
                    <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
                      Tip: {step.tip}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    {step.actionUrl ? (
                      <Link
                        href={step.actionUrl}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
                      >
                        {step.action}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-xs text-text-muted">{step.action}</span>
                    )}
                    <button
                      onClick={() => toggleStep(idx)}
                      className="text-xs text-text-muted hover:text-text"
                    >
                      {completed ? "Undo" : "Mark as done"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {completedSteps.size === STEPS.length && (
        <div className="mt-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="text-xl font-bold text-text">You&apos;re a MyFeed pro!</h2>
          <p className="mt-2 text-sm text-text-muted">
            You&apos;ve completed all the getting started steps. Enjoy your curated feeds!
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
