"use client";

import { useState, useEffect } from "react";
import { MessageCircle, ThumbsUp, ThumbsDown, X, Send } from "lucide-react";

export function FeedbackWidget() {
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const lastDismissed = localStorage.getItem("feedbot-feedback-dismissed");
      if (lastDismissed) {
        const elapsed = Date.now() - parseInt(lastDismissed);
        if (elapsed < 7 * 24 * 3600000) setDismissed(true); // 7 day cooldown
      }
    } catch {}
  }, []);

  // Show after 5 minutes of use
  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => setShow(true), 300000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  const dismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("feedbot-feedback-dismissed", Date.now().toString());
  };

  const submit = () => {
    // In production, this would POST to an API
    try {
      const feedback = JSON.parse(localStorage.getItem("feedbot-feedback-log") || "[]");
      feedback.push({
        rating,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("feedbot-feedback-log", JSON.stringify(feedback));
    } catch {}
    setSent(true);
    setTimeout(() => {
      setShow(false);
      setDismissed(true);
      localStorage.setItem("feedbot-feedback-dismissed", Date.now().toString());
    }, 2000);
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {sent ? (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-6 py-4 shadow-lg backdrop-blur-sm">
          <p className="text-sm font-medium text-green-400">Thanks for your feedback!</p>
        </div>
      ) : (
        <div className="w-72 rounded-xl border border-border bg-bg-card p-4 shadow-lg backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-text">Quick Feedback</span>
            </div>
            <button onClick={dismiss} className="text-text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-3 text-xs text-text-muted">How&apos;s your FeedBot experience?</p>

          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setRating("up")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                rating === "up"
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-border text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Love it
            </button>
            <button
              onClick={() => setRating("down")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                rating === "down"
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-border text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              Needs work
            </button>
          </div>

          {rating && (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={rating === "up" ? "What do you love most?" : "What could be better?"}
                rows={2}
                className="mb-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                autoFocus
              />
              <button
                onClick={submit}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
              >
                <Send className="h-3 w-3" />
                Send Feedback
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
