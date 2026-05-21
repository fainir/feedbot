// Server component for the homepage / "For You" feed.
//
// SSR the initial article payload so the HTML response already contains the
// feed inline — no client round-trip needed for first paint. The client
// component below takes over for interactivity (reactions, customize,
// theme, infinite scroll).
//
// First-paint flow:
//   1. Server hits the public feeds API (same instance, L1/L2 cache HIT
//      on the warm path → typically <50ms).
//   2. HTML with the article cards ships to the browser.
//   3. ForYouClient hydrates with initialItems prefilled — no spinner flash.
//   4. Client refreshes in the background (SWR) to catch any new posts.

import ForYouClient from "./for-you-client";
import { normalizeImageUrl } from "@/lib/source-info";

// SSR per request. Otherwise Next.js pre-renders this at build time, fails
// the localhost fetch (no server running), and bakes empty HTML into the
// build. The fetch below still hits the route handler's L1/L2 cache, so
// dynamic rendering is cheap on the warm path.
export const dynamic = "force-dynamic";

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
  items: FeedItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

// Default 14 feeds that "For You" blends — matches FEEDS in for-you-client.
const DEFAULT_FOR_YOU_FEEDS = [
  "AI & ML", "Tech News", "Startups", "Dev", "Science",
  "Design", "Security", "Gaming", "Business", "Space",
  "Health", "Open Source", "Robotics", "Energy",
].join(",");

function originUrl(): string {
  // Prefer loopback inside Railway — it skips DNS / TLS overhead vs hitting
  // the public domain back to ourselves. PORT defaults to 3000 in dev and
  // is set automatically by Railway in prod.
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

async function fetchForYou(): Promise<FetchResult> {
  const base = originUrl();
  const url = `${base}/api/public/feeds?q=all&feeds=${encodeURIComponent(
    DEFAULT_FOR_YOU_FEEDS,
  )}&limit=50`;
  try {
    // revalidate: 60 enrolls this in Next.js's data cache layer so a second
    // server render within the minute reuses the response.
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return { items: [], hasMore: false, nextCursor: null };
    const d = (await res.json()) as Partial<FetchResult>;
    return {
      items: d.items || [],
      hasMore: !!d.hasMore,
      nextCursor: d.nextCursor || null,
    };
  } catch {
    // Network blip / upstream error → fall back to client fetch on mount.
    return { items: [], hasMore: false, nextCursor: null };
  }
}

export default async function Page() {
  const initial = await fetchForYou();
  // Normalize the URL so the preload matches the rewritten URL the <img>
  // tag actually requests — otherwise the browser fetches both.
  const firstImageRaw = initial.items.find((it) => it.image_url)?.image_url || null;
  const firstImage = firstImageRaw ? normalizeImageUrl(firstImageRaw) : null;

  return (
    <>
      {/* Preload the first article cover image so it shows up in the same
          paint as the rest of the card. Saves ~100-300ms vs waiting for the
          <img> tag to be discovered after hydration. */}
      {firstImage && (
        <link
          rel="preload"
          as="image"
          href={firstImage}
          fetchPriority="high"
        />
      )}
      <ForYouClient
        initialItems={initial.items}
        initialHasMore={initial.hasMore}
        initialNextCursor={initial.nextCursor}
      />
    </>
  );
}
