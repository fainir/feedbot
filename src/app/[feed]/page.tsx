// Server component. Fetches the initial article payload SSR-side so the
// HTML response contains the feed inline — no client round-trip needed
// for first paint. The FeedClient below takes over for interactivity
// (reactions, customize, theme, infinite scroll).
//
// Streaming: we don't wrap the data fetch in Suspense because the whole
// page below the header IS the article list — there's nothing to render
// independently of it. The Cache-Control + Redis L2 keep the fetch
// itself fast.

import FeedClient from "./feed-client";
import { ALL_SYSTEM_FEEDS } from "@/lib/system-feeds";

const SLUG_TO_QUERY: Record<string, string> = Object.fromEntries(
  ALL_SYSTEM_FEEDS.map((f) => [f.id, f.query]),
);

type FeedItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  image_url?: string;
  publishedAt: string;
};

type FetchResult = {
  items?: FeedItem[];
  hasMore?: boolean;
  nextCursor?: string | null;
  feed?: {
    id: string;
    name: string;
    description: string;
    creator: string;
    followers: number;
  } | null;
  notFound?: boolean;
};

function originUrl(): string {
  // Loopback to ourselves — skips DNS / TLS overhead vs hitting the public
  // domain back through Railway's edge. PORT is set automatically by Railway
  // in prod (and defaults to 3000 locally). The route handler still hits
  // L1/L2 cache the same way.
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

async function fetchInitial(slug: string): Promise<FetchResult> {
  const base = originUrl();
  const tabQuery = SLUG_TO_QUERY[slug];
  try {
    if (tabQuery) {
      const url = `${base}/api/public/feeds?q=${encodeURIComponent(tabQuery)}&limit=50`;
      // Tag with the s-maxage so Next.js's data cache layer also benefits
      // — same TTL as the in-app cache headers.
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) return { notFound: false, items: [] };
      const d = (await res.json()) as FetchResult;
      return { items: d.items || [], hasMore: !!d.hasMore, nextCursor: d.nextCursor || null };
    }
    // Custom slug — try feed-by-slug.
    const url = `${base}/api/public/feed-by-slug?slug=${encodeURIComponent(slug)}&limit=50`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.status === 404) return { notFound: true, items: [] };
    if (!res.ok) return { items: [] };
    const d = (await res.json()) as FetchResult;
    if (!d || !d.items) return { notFound: true, items: [] };
    return {
      items: d.items,
      hasMore: !!d.hasMore,
      nextCursor: d.nextCursor || null,
      feed: d.feed || null,
    };
  } catch {
    // Network blip or upstream error — fall back to client fetch on mount.
    return { items: [] };
  }
}

export default async function Page({ params }: { params: Promise<{ feed: string }> }) {
  const { feed } = await params;
  const initial = await fetchInitial(feed);

  return (
    <FeedClient
      initialSlug={feed}
      initialItems={initial.items ?? null}
      initialHasMore={initial.hasMore ?? false}
      initialNextCursor={initial.nextCursor ?? null}
      initialCommunityFeed={initial.feed ?? null}
      initialNotFound={!!initial.notFound}
    />
  );
}
