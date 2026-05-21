// FeedBot Service Worker — offline support + speed-up cache
//
// v3 strategy:
//   - /api/public/feeds and /api/public/feed-by-slug: stale-while-revalidate.
//     Return cached response instantly, refresh in background. Repeat visits
//     feel sub-100ms even with the network involved.
//   - Other /api/*: network-first (avoid stale mutations / auth data).
//   - Static assets, /_next/static/*: cache-first.
//   - HTML pages: network-first, offline fallback.
const CACHE_NAME = "feedbot-v3";
const RUNTIME_API_CACHE = "feedbot-api-v3";
const OFFLINE_URL = "/offline";

// Assets to cache on install
const PRECACHE_URLS = [
  "/",
  "/login",
];

// How long an SWR cache entry stays usable. Beyond this, we drop the cached
// response and treat the request as a cold miss — keeps the UI from showing
// truly stale content if the user comes back days later.
const SWR_MAX_AGE_MS = 30 * 60 * 1000; // 30 min

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== RUNTIME_API_CACHE)
          .map((n) => caches.delete(n)),
      ),
    ),
  );
  self.clients.claim();
});

function isPublicFeedRequest(url) {
  return (
    url.pathname.startsWith("/api/public/feeds") ||
    url.pathname.startsWith("/api/public/feed-by-slug")
  );
}

async function swrFetch(request) {
  const cache = await caches.open(RUNTIME_API_CACHE);
  const cached = await cache.match(request);

  // Always kick off a network refresh. Tag the response with the time it
  // landed so we can age-out stale entries below.
  const networkPromise = fetch(request)
    .then((res) => {
      if (res.ok) {
        // Stamp with sw-cached-at via a wrapped Response so headers survive.
        const headers = new Headers(res.headers);
        headers.set("sw-cached-at", String(Date.now()));
        const clone = new Response(res.clone().body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
        cache.put(request, clone);
      }
      return res;
    })
    .catch(() => cached); // Offline → fall back to whatever's in cache.

  if (cached) {
    // Age check — if the cached entry is too old, skip it and wait for net.
    const ts = Number(cached.headers.get("sw-cached-at") || 0);
    if (ts && Date.now() - ts < SWR_MAX_AGE_MS) {
      // Serve the cache instantly; the network promise continues in the
      // background to refresh for next time.
      return cached;
    }
  }
  return networkPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Public read endpoints — stale-while-revalidate.
  if (isPublicFeedRequest(url)) {
    event.respondWith(swrFetch(request));
    return;
  }

  // Other API — network-first with offline cache fallback.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request)),
    );
    return;
  }

  // Static assets — cache-first.
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        });
      }),
    );
    return;
  }

  // HTML pages — network-first, offline fallback.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)),
      ),
  );
});
