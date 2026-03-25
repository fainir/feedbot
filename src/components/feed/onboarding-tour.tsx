"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Rss, Search, Bookmark, Keyboard, BarChart3 } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to FeedBot!",
    description: "Your AI-powered feed reader. Describe any topic and get a curated feed from across the internet.",
    icon: <Rss className="h-6 w-6 text-primary" />,
    tip: "Start by clicking \"New Tab\" or picking a template to create your first feed.",
  },
  {
    title: "Create Custom Feeds",
    description: "Each tab is a feed. Describe what you want to see in natural language — FeedBot finds relevant content.",
    icon: <Sparkles className="h-6 w-6 text-secondary" />,
    tip: "Try: \"AI research papers\" or \"startup fundraising news\" or anything you're curious about.",
  },
  {
    title: "Search & Filter",
    description: "Use the search bar (press /) to find articles. Filter by unread, today, or bookmarked with quick chips.",
    icon: <Search className="h-6 w-6 text-primary" />,
    tip: "Press Cmd+K to open the command palette for quick actions.",
  },
  {
    title: "Save & Organize",
    description: "Bookmark articles to read later. Create collections to organize saved items by project or topic.",
    icon: <Bookmark className="h-6 w-6 text-secondary" />,
    tip: "React to articles with emoji (👍🔥💡) to track your engagement.",
  },
  {
    title: "Keyboard Power User",
    description: "Navigate with J/K keys, open with O, bookmark with B, mark read with M. Press ? for all shortcuts.",
    icon: <Keyboard className="h-6 w-6 text-primary" />,
    tip: "Press F to enter Focus Mode for distraction-free reading.",
  },
  {
    title: "Stay Informed",
    description: "Track your reading streaks, compare feeds side-by-side, and get AI-powered catch-me-up digests.",
    icon: <BarChart3 className="h-6 w-6 text-secondary" />,
    tip: "Enable push notifications to get alerts for your keyword matches.",
  },
];

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("feedbot-tour-seen");
    if (!seen) {
      // Delay tour start slightly for better UX
      const timer = setTimeout(() => setShowTour(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeTour = useCallback(() => {
    setShowTour(false);
    localStorage.setItem("feedbot-tour-seen", "true");
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((p) => p + 1);
    } else {
      closeTour();
    }
  }, [currentStep, closeTour]);

  const prevStep = useCallback(() => {
    setCurrentStep((p) => Math.max(0, p - 1));
  }, []);

  if (!showTour) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep
                    ? "w-6 bg-primary"
                    : i < currentStep
                    ? "w-3 bg-primary/40"
                    : "w-3 bg-border"
                }`}
              />
            ))}
          </div>
          <button
            onClick={closeTour}
            className="rounded-lg p-1 text-text-muted transition-colors hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10">
            {step.icon}
          </div>
          <h2 className="mb-2 text-lg font-bold text-text">{step.title}</h2>
          <p className="mb-4 text-sm leading-relaxed text-text-muted">
            {step.description}
          </p>
          <div className="rounded-lg bg-primary/5 px-3 py-2.5">
            <p className="text-xs text-primary">
              <span className="font-semibold">Tip:</span> {step.tip}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text disabled:opacity-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={closeTour}
              className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            >
              Skip tour
            </button>
            <button
              onClick={nextStep}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
