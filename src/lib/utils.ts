import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Normalize user-typed feed text (a feed name or prompt): trim surrounding
 * whitespace and collapse internal whitespace runs (incl. stray newlines) to
 * single spaces. Without this, a trailing space or a pasted newline produces a
 * near-duplicate feed with a divergent slug (e.g. "Drum covers" vs "\nDrum
 * covers"). Returns "" for non-strings so callers can reject empty input.
 */
export function normalizeFeedText(input: unknown): string {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

export function timeAgo(date: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
