"use client";

import { useState, useEffect } from "react";
import { Gift, X, Sparkles, Search, Pin, Clock, Target, Layers, SmilePlus, Newspaper } from "lucide-react";

interface Feature {
  icon: typeof Gift;
  title: string;
  description: string;
  version: string;
}

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "AI \"For You\" Picks",
    description: "Personalized article recommendations based on your reading patterns and bookmarks.",
    version: "1.6",
  },
  {
    icon: Search,
    title: "Global Cross-Feed Search",
    description: "Search across all your feeds with date and source filters. Use Cmd+Shift+F.",
    version: "1.6",
  },
  {
    icon: Target,
    title: "Reading Goals",
    description: "Set daily reading targets and track streaks with a visual progress ring.",
    version: "1.6",
  },
  {
    icon: SmilePlus,
    title: "Sentiment Indicators",
    description: "See at a glance if articles are positive, negative, or neutral.",
    version: "1.7",
  },
  {
    icon: Layers,
    title: "Similar Articles",
    description: "Find related content across all feeds with one click.",
    version: "1.7",
  },
  {
    icon: Pin,
    title: "Pin Articles",
    description: "Pin important items to the top of any feed for quick access.",
    version: "1.7",
  },
  {
    icon: Clock,
    title: "Read Later Queue",
    description: "Save articles for later with optional timed reminders.",
    version: "1.8",
  },
  {
    icon: Newspaper,
    title: "Content Type Tags",
    description: "Articles auto-tagged as News, Tutorial, Opinion, or Analysis.",
    version: "1.8",
  },
];

const LATEST_VERSION = "1.8";

export function WhatsNew() {
  const [show, setShow] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("feedbot-whats-new-seen");
      if (seen !== LATEST_VERSION) {
        setHasNew(true);
      }
    } catch {}
  }, []);

  const dismiss = () => {
    setShow(false);
    setHasNew(false);
    localStorage.setItem("feedbot-whats-new-seen", LATEST_VERSION);
  };

  return (
    <>
      {/* Badge trigger */}
      <button
        onClick={() => setShow(true)}
        className="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="What's new"
      >
        <Gift className="h-4 w-4" />
        {hasNew && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </button>

      {/* Modal */}
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={dismiss}
        >
          <div
            className="mx-4 max-h-[70vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-text">What&apos;s New</h2>
              </div>
              <button
                onClick={dismiss}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-text">{feature.title}</h3>
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          v{feature.version}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={dismiss}
                className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
