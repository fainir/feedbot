"use client";

import { useCallback, useRef } from "react";

/**
 * Warms the public feed API cache for a given tab. Triggered on tab hover
 * (desktop) or as a tab scrolls into view (mobile horizontal tab bar).
 *
 * Dedupes per slug within a session so a hover-storm doesn't fire 14
 * requests. The browser will honour the response's Cache-Control headers
 * for the subsequent real request — if Cache-Control passes through the
 * fetch lifecycle (it does, the browser cache stores the body), the tap
 * that follows the hover serves from disk cache instantly.
 *
 * For Next.js <Link prefetch>, the HTML is already prefetched — this
 * just adds the article data so the page lands populated.
 */

const TABS_TO_QUERY: Record<string, string> = {
  ai: "AI & ML",
  tech: "Tech News",
  startups: "Startups",
  dev: "Dev",
  science: "Science",
  crypto: "Crypto",
  design: "Design",
  security: "Security",
  gaming: "Gaming",
  business: "Business",
  space: "Space",
  health: "Health",
  "open-source": "Open Source",
  robotics: "Robotics",
  energy: "Energy",
};

export function useFeedPrefetch() {
  // One Set per page lifetime — cleared on full navigation.
  const seen = useRef<Set<string>>(new Set());

  const prefetch = useCallback((slug: string) => {
    if (!slug || seen.current.has(slug)) return;
    seen.current.add(slug);
    const query = TABS_TO_QUERY[slug];
    const url = query
      ? `/api/public/feeds?q=${encodeURIComponent(query)}&limit=50`
      : `/api/public/feed-by-slug?slug=${encodeURIComponent(slug)}&limit=50`;
    // Browser caches the response per Cache-Control; we throw the result
    // away.
    fetch(url, { priority: "low" } as RequestInit).catch(() => {
      // Treat as no-op — the real navigation will retry.
      seen.current.delete(slug);
    });
  }, []);

  return prefetch;
}
