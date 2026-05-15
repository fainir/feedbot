"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Sun, Moon, Sparkles, ThumbsUp, ThumbsDown, X, Bookmark, BookmarkCheck, Share2, MoreVertical, LogIn, SlidersHorizontal, Check, Mail, Search, RefreshCw, Rss } from "lucide-react";
import { usePullToRefresh, PullToRefreshIndicator } from "@/components/pull-to-refresh";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { trackEvent } from "@/components/analytics";
import { useToast } from "@/components/ui/toast";
import { useThemeSync } from "@/components/layout/use-theme-sync";
import { cleanSummary, cleanTitle, getSourceInfo, getSourceFavicon, timeAgo, normalizeImageUrl } from "@/lib/source-info";
import { useFeedPrefetch } from "@/components/feed/use-feed-prefetch";
import type { User } from "@supabase/supabase-js";

interface FeedItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url?: string;
  publishedAt: string;
}

const FEEDS = [
  { id: "ai", name: "AI & ML", icon: "🤖" },
  { id: "tech", name: "Tech", icon: "💻" },
  { id: "startups", name: "Startups", icon: "🚀" },
  { id: "dev", name: "Dev", icon: "⚡" },
  { id: "science", name: "Science", icon: "🔬" },
  { id: "design", name: "Design", icon: "🎨" },
  { id: "security", name: "Security", icon: "🔒" },
  { id: "gaming", name: "Gaming", icon: "🎮" },
  { id: "business", name: "Business", icon: "📈" },
  { id: "space", name: "Space", icon: "🪐" },
  { id: "health", name: "Health", icon: "🏥" },
  { id: "open-source", name: "Open Source", icon: "🐙" },
  { id: "robotics", name: "Robotics", icon: "🦾" },
  { id: "energy", name: "Energy", icon: "⚡" },
];

// Feed name mapping (matches TAB_MAP in API)
const FEED_NAME_MAP: Record<string, string> = {
  ai: "AI & ML", tech: "Tech News", startups: "Startups", dev: "Dev", science: "Science",
  crypto: "Crypto", design: "Design", security: "Security", gaming: "Gaming", business: "Business",
  space: "Space", health: "Health", "open-source": "Open Source", robotics: "Robotics", energy: "Energy",
};

const DEFAULT_ENABLED = new Set(FEEDS.map((f) => f.id));

function useScrollFade() {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 2);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);
  return { ref, atStart, atEnd };
}

export default function ForYouPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showNewFeed, setShowNewFeed] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const desktopTabs = useScrollFade();
  const mobileTabs = useScrollFade();
  const [hideTopRow, setHideTopRow] = useState(false);
  const lastScrollY = useRef(0);
  const [newPrompt, setNewPrompt] = useState("");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, "like" | "dislike">>({});
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());
  const [enabledFeeds, setEnabledFeeds] = useState<Set<string>>(DEFAULT_ENABLED);
  // Hydration-safe defaults: server and first client render must match.
  // Hydrate from localStorage in an effect after mount (see below).
  const [showAllFeeds, setShowAllFeeds] = useState(true);
  const [showEmailPrefs, setShowEmailPrefs] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState({ enabled: true, frequency: "daily", time: "08:00", feeds: ["for-you"] as string[] });
  // Per-feed digest cadence — keyed by slug (FEEDS[i].id) for client convenience;
  // we resolve slugs to feed UUIDs on save via the system-feeds endpoint.
  type FeedFreq = "daily" | "weekly" | "never";
  const [feedFreqs, setFeedFreqs] = useState<Record<string, FeedFreq>>({});
  const [systemFeedMap, setSystemFeedMap] = useState<Record<string, string>>({}); // slug -> uuid
  const [heroDismissed, setHeroDismissed] = useState(false);
  const [hiddenFeeds, setHiddenFeeds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  useThemeSync(user);
  const prefetchFeed = useFeedPrefetch();

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    // Hydrate UI prefs from localStorage AFTER mount so SSR HTML matches the
    // first client render (prevents React #418 hydration mismatch).
    try {
      setShowAllFeeds(localStorage.getItem("myfeed-show-all") !== "0");
      const dismissed = localStorage.getItem("myfeed-hero-dismissed") === "1";
      const visits = parseInt(localStorage.getItem("myfeed-visit-count") || "0", 10);
      if (dismissed || visits >= 2) setHeroDismissed(true);
      const savedHidden = localStorage.getItem("myfeed-hidden-feeds");
      if (savedHidden) setHiddenFeeds(new Set(JSON.parse(savedHidden)));
    } catch {}
    // Increment visit counter so the hero CTA auto-collapses on the 3rd visit.
    try {
      const n = parseInt(localStorage.getItem("myfeed-visit-count") || "0", 10) + 1;
      localStorage.setItem("myfeed-visit-count", String(Math.min(n, 99)));
    } catch {}
  }, []);

  // Collapse top bar on scroll down (mobile only; CSS gates the transform on sm: breakpoint)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if (y < 48) setHideTopRow(false);
      else if (delta > 6) setHideTopRow(true);
      else if (delta < -6) setHideTopRow(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Close transient overlays (menu, modals) on outside click and Escape so the
  // mobile experience matches user expectations. The legacy onMouseLeave-only
  // close only works on desktop pointer devices — no touch user can dismiss it.
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showMenu && !showNewFeed && !showEmailPrefs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showNewFeed) setShowNewFeed(false);
        else if (showEmailPrefs) setShowEmailPrefs(false);
        else if (showMenu) setShowMenu(false);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      // Only the floating dropdown closes on outside-tap; the modals already
      // have a backdrop-click handler.
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [showMenu, showNewFeed, showEmailPrefs]);

  // Hydrate the email-prefs dialog whenever it opens. We do this lazily so a
  // logged-out viewer (or one who never opens the dialog) doesn't pay for it.
  useEffect(() => {
    if (!showEmailPrefs || !user) return;
    let cancelled = false;
    (async () => {
      try {
        // Fetch in parallel: existing prefs + the slug→UUID map.
        const [pRes, sRes] = await Promise.all([
          fetch("/api/email-preferences").then((r) => r.ok ? r.json() : null),
          fetch("/api/public/system-feeds").then((r) => r.ok ? r.json() : null),
        ]);
        if (cancelled) return;
        // Build the slug→uuid map. The FEEDS constant uses short ids like
        // "ai", "tech"; DB system feeds carry slugs like "ai-ml" and names
        // like "AI & ML". Try several normalisation strategies + a manual
        // synonym list so the lookup is resilient.
        const slugToUuid: Record<string, string> = {};
        if (sRes?.feeds) {
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          // Manual synonyms for slugs that don't match by normalisation alone.
          const SYNONYMS: Record<string, string[]> = {
            ai: ["aiml", "ai-ml", "ai-and-ml", "artificialintelligence", "machinelearning"],
            tech: ["technology", "techindustry"],
            dev: ["development", "developer", "developers", "programming", "softwaredevelopment"],
            "open-source": ["opensource"],
            energy: ["renewableenergy", "cleanenergy", "climate"],
          };
          const byKey = new Map<string, string>();
          for (const sf of sRes.feeds as Array<{ id: string; name: string; slug: string | null }>) {
            if (sf.slug) byKey.set(sf.slug, sf.id);
            byKey.set(norm(sf.name), sf.id);
            byKey.set(norm(sf.slug || ""), sf.id);
          }
          for (const f of FEEDS) {
            const candidates = [
              f.id,
              norm(f.id),
              norm(f.name),
              ...(SYNONYMS[f.id] || []),
            ];
            let uuid: string | undefined;
            for (const c of candidates) {
              if (!c) continue;
              uuid = byKey.get(c);
              if (uuid) break;
            }
            // Last-ditch fuzzy: name contains feed id or vice versa.
            if (!uuid) {
              const target = norm(f.name);
              for (const sf of sRes.feeds as Array<{ id: string; name: string; slug: string | null }>) {
                const sName = norm(sf.name);
                if (sName === target || sName.includes(target) || target.includes(sName)) {
                  uuid = sf.id;
                  break;
                }
              }
            }
            if (uuid) slugToUuid[f.id] = uuid;
          }
        }
        setSystemFeedMap(slugToUuid);
        // Project the server's feed_frequencies (UUID keys) back onto slugs for the UI.
        if (pRes?.feedFrequencies) {
          const uuidToSlug: Record<string, string> = {};
          for (const [slug, uuid] of Object.entries(slugToUuid)) uuidToSlug[uuid] = slug;
          const ff: Record<string, FeedFreq> = {};
          for (const [uuid, cfg] of Object.entries(pRes.feedFrequencies as Record<string, { frequency: FeedFreq }>)) {
            const slug = uuidToSlug[uuid];
            if (slug && cfg?.frequency) ff[slug] = cfg.frequency;
          }
          setFeedFreqs(ff);
        }
        if (typeof pRes?.enabled === "boolean") {
          setEmailPrefs((p) => ({ ...p, enabled: pRes.enabled, frequency: pRes.frequency || p.frequency }));
        }
      } catch { /* dialog still works with defaults */ }
    })();
    return () => { cancelled = true; };
  }, [showEmailPrefs, user]);

  // Load feed preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("myfeed-for-you-feeds");
    if (saved) {
      try { setEnabledFeeds(new Set(JSON.parse(saved))); } catch {}
    }
  }, []);

  const toggleFeed = (id: string) => {
    // If Show All is on, clicking a chip turns it off and deselects that chip
    if (showAllFeeds) {
      setShowAllFeeds(false);
      localStorage.setItem("myfeed-show-all", "0");
      const next = new Set(FEEDS.map(f => f.id));
      next.delete(id);
      setEnabledFeeds(next);
      localStorage.setItem("myfeed-for-you-feeds", JSON.stringify([...next]));
      return;
    }
    setEnabledFeeds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id);
      localStorage.setItem("myfeed-for-you-feeds", JSON.stringify([...next]));
      return next;
    });
  };

  const feedNames = useMemo(() => {
    if (showAllFeeds) return Object.values(FEED_NAME_MAP);
    return [...enabledFeeds].map((id) => FEED_NAME_MAP[id]).filter(Boolean);
  }, [enabledFeeds, showAllFeeds]);

  const fetchFeed = useCallback((cursor?: string) => {
    const feedsParam = feedNames.join(",");
    const url = `/api/public/feeds?q=all&feeds=${encodeURIComponent(feedsParam)}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    return fetch(url).then((r) => r.json());
  }, [feedNames]);

  // Pull-to-refresh — silent fetch, swap items in when it lands.
  const pullRefresh = useCallback(async () => {
    try {
      const d = await fetchFeed();
      setItems(d.items || []);
      setHasMore(d.hasMore || false);
      setNextCursor(d.nextCursor || null);
      trackEvent("feed_refresh", { feed: "for-you", source: "pull" });
    } catch { /* keep current items on failure */ }
  }, [fetchFeed]);
  const { pullPx, refreshing: pulling } = usePullToRefresh(pullRefresh);

  useEffect(() => {
    // Stale-while-revalidate: render the last cached response immediately
    // (no spinner flash on repeat visits), then refresh from the network.
    let cancelled = false;
    const cacheKey = `myfeed:for-you:v1:${feedNames.join(",")}`;
    const CACHE_MAX_AGE_MS = 30 * 60_000; // 30 min — bounded staleness
    let hadCache = false;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const c = JSON.parse(raw) as { items?: FeedItem[]; hasMore?: boolean; nextCursor?: string | null; ts?: number };
        if (c?.items?.length && Date.now() - (c.ts || 0) < CACHE_MAX_AGE_MS) {
          setItems(c.items);
          setHasMore(!!c.hasMore);
          setNextCursor(c.nextCursor || null);
          setLoading(false);
          hadCache = true;
        }
      }
    } catch {}
    if (!hadCache) {
      setLoading(true);
      setItems([]);
      setNextCursor(null);
    }
    fetchFeed()
      .then((d) => {
        if (cancelled) return;
        setItems(d.items || []);
        setHasMore(d.hasMore || false);
        setNextCursor(d.nextCursor || null);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            items: (d.items || []).slice(0, 50),
            hasMore: !!d.hasMore,
            nextCursor: d.nextCursor || null,
            ts: Date.now(),
          }));
        } catch {}
      })
      .catch(() => { if (!hadCache && !cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchFeed, feedNames]);

  const { dedupedItems, trendingTopics } = useMemo(() => {
    // Load source preferences for personalization
    let sourcePrefs: Record<string, number> = {};
    try { sourcePrefs = JSON.parse(localStorage.getItem("myfeed-source-prefs") || "{}"); } catch {}

    // URL dedup
    const seenUrls = new Set<string>();
    const urlDeduped = items.filter((item) => {
      const key = item.url.split("?")[0].split("#")[0];
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });

    // Apply personalization: boost liked sources, penalize disliked
    if (Object.keys(sourcePrefs).length > 0) {
      urlDeduped.sort((a, b) => {
        const aBoost = sourcePrefs[a.source.toLowerCase()] || 0;
        const bBoost = sourcePrefs[b.source.toLowerCase()] || 0;
        if (aBoost !== bBoost) return bBoost - aBoost; // higher preference first
        return 0; // keep original order (by date)
      });
    }

    // Story clustering -group by similar titles, keep best + track trending
    const stopWords = new Set(["this","that","with","from","have","been","will","they","their","about","what","when","which","these","those","would","could","should","here","there","your","more","just","into"]);
    const clusters: typeof urlDeduped = [];
    const clusterKeys = new Map<string, number>();
    const clusterCounts = new Map<number, number>(); // cluster index → count of similar stories
    for (const item of urlDeduped) {
      const words = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w)).slice(0, 5);
      const key = words.join(" ");
      if (key.length < 8) { clusters.push(item); continue; }
      let matched = false;
      for (const [ek, idx] of clusterKeys) {
        const overlap = words.filter((w) => ek.includes(w)).length;
        if (overlap >= 3) {
          clusterCounts.set(idx, (clusterCounts.get(idx) || 1) + 1);
          matched = true;
          break;
        }
      }
      if (!matched) { clusterKeys.set(key, clusters.length); clusterCounts.set(clusters.length, 1); clusters.push(item); }
    }
    // Build trending set: items with 3+ similar stories
    const trending = new Set<string>();
    for (const [idx, count] of clusterCounts) {
      if (count >= 3 && clusters[idx]) trending.add(clusters[idx].id);
    }
    return { dedupedItems: clusters, trendingTopics: trending };
  }, [items]);

  const loadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    fetchFeed(nextCursor)
      .then((d) => { setItems((p) => [...p, ...(d.items || [])]); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .finally(() => setLoadingMore(false));
  };

  const handleReaction = useCallback(async (feedItemId: string, reaction: "like" | "dislike") => {
    trackEvent("article_reaction", { reaction, feed: "for-you" });
    if (!user) { toast("Sign up to save your preferences", "info", { label: "Sign up", href: "/login?signup=true" }); return; }
    const prev = userReactions[feedItemId];
    setUserReactions((r) => { const next = { ...r }; if (next[feedItemId] === reaction) delete next[feedItemId]; else next[feedItemId] = reaction; return next; });
    // Track source preferences for personalization
    const item = items.find((i) => i.id === feedItemId);
    if (item) {
      try {
        const prefs = JSON.parse(localStorage.getItem("myfeed-source-prefs") || "{}");
        const src = item.source.toLowerCase();
        if (!prefs[src]) prefs[src] = 0;
        if (reaction === "like") prefs[src] = Math.min(5, prefs[src] + 1);
        else prefs[src] = Math.max(-5, prefs[src] - 1);
        localStorage.setItem("myfeed-source-prefs", JSON.stringify(prefs));
      } catch {}
    }
    try { const res = await fetch("/api/reactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feed_item_id: feedItemId, reaction }) }); if (!res.ok) throw new Error(); } catch { setUserReactions((r) => { const next = { ...r }; if (prev) next[feedItemId] = prev; else delete next[feedItemId]; return next; }); }
  }, [user, userReactions, items]);

  const handleBookmark = useCallback(async (feedItemId: string) => {
    if (!user) { toast("Sign up to save your finds", "info", { label: "Sign up", href: "/login?signup=true" }); return; }
    const was = userBookmarks.has(feedItemId);
    setUserBookmarks((s) => { const next = new Set(s); if (next.has(feedItemId)) next.delete(feedItemId); else next.add(feedItemId); return next; });
    try {
      const res = await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feed_item_id: feedItemId }) });
      if (!res.ok) throw new Error();
      // Tell /bookmarks (open in another tab or about to be opened) to refetch.
      window.dispatchEvent(new CustomEvent("myfeed:bookmark-changed"));
    } catch { setUserBookmarks((s) => { const next = new Set(s); if (was) next.add(feedItemId); else next.delete(feedItemId); return next; }); }
  }, [user, userBookmarks]);

  const handleShare = useCallback(async (item: FeedItem) => {
    trackEvent("share_article", { source: item.source, feed: "for-you" });
    if (!navigator.share) return;
    try { await navigator.share({ title: item.title, url: item.url }); } catch { /* user cancelled or share unavailable */ }
  }, []);

  const handleHeroSubmit = useCallback(() => {
    const prompt = newPrompt.trim();
    trackEvent("hero_create_feed", { has_prompt: !!prompt, logged_in: !!user });
    if (!prompt) {
      setShowNewFeed(true);
      return;
    }

    if (user) {
      setShowNewFeed(true);
      return;
    }

    window.location.href = `/login?signup=true&prompt=${encodeURIComponent(prompt)}`;
  }, [newPrompt, user]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <PullToRefreshIndicator pullPx={pullPx} refreshing={pulling} />
      {/* Top bar -fixed so it never scrolls away. On mobile, slides up to hide row 1 on scroll down. */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-bg-card border-b border-border transition-transform duration-200 will-change-transform ${hideTopRow ? "-translate-y-12" : "translate-y-0"} sm:!translate-y-0`}>
        <div className="flex items-center h-12">
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 pl-3 sm:pl-4 pr-2 sm:pr-3">
            <span className="flex items-center justify-center w-7 h-7 bg-text text-bg rounded-md text-[12px] font-black leading-none" style={{ letterSpacing: "-0.02em" }}>MF</span>
          </Link>
          {/* Desktop inline tabs (with scroll fade) */}
          <div className="hidden sm:block relative flex-1 min-w-0 h-12">
            <div ref={desktopTabs.ref} className="flex overflow-x-auto scrollbar-hide items-center gap-0 h-full">
              <Link href="/" className="px-3 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 border-text text-text flex items-center gap-1.5 flex-shrink-0">
                <Rss className="h-3.5 w-3.5" />My Feed
              </Link>
              <div className="w-px h-5 bg-border/50 mx-1 flex-shrink-0" />
              {FEEDS.filter(f => showAllFeeds || !hiddenFeeds.has(f.id)).map((tab) => (
                <div key={tab.id} className="group relative shrink-0 border-b-2 border-transparent text-text-muted hover:text-text transition-colors">
                  <Link
                    href={`/${tab.id}`}
                    onMouseEnter={() => prefetchFeed(tab.id)}
                    onTouchStart={() => prefetchFeed(tab.id)}
                    onFocus={() => prefetchFeed(tab.id)}
                    className="flex items-center gap-1.5 px-2.5 py-3.5 text-sm font-medium whitespace-nowrap"
                  >
                    <span>{tab.icon}</span>{tab.name}
                  </Link>
                  {!showAllFeeds && <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHiddenFeeds(prev => { const next = new Set(prev); next.add(tab.id); localStorage.setItem("myfeed-hidden-feeds", JSON.stringify([...next])); return next; }); }} className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded-full bg-bg-card border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Hide ${tab.name}`}><X className="h-2.5 w-2.5 text-text-muted" /></button>}
                </div>
              ))}
            </div>
            {!desktopTabs.atStart && <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg-card to-transparent" />}
            {!desktopTabs.atEnd && <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg-card to-transparent" />}
          </div>
          {/* Actions: right-aligned on both viewports, tighter on mobile */}
          <div className="ml-auto sm:ml-0 flex-shrink-0 flex items-center gap-1 sm:gap-2 pr-2 sm:pr-4 pl-2 sm:pl-3 sm:border-l sm:border-border/50">
            {/* relative + before:-inset-y-2.5 extends the touch target to ~44px
                tall on mobile (WCAG 2.5.5) without inflating the visual chip. */}
            <Link href="/explore" className="relative flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap before:absolute before:content-[''] before:-inset-y-2.5 before:inset-x-0 sm:before:hidden"><Search className="h-3.5 w-3.5" />Explore</Link>
            <button onClick={() => setShowNewFeed(true)} className="relative flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold bg-text text-bg rounded-full hover:opacity-90 transition-opacity whitespace-nowrap before:absolute before:content-[''] before:-inset-y-2.5 before:inset-x-0 sm:before:hidden">
              <Sparkles className="h-3.5 w-3.5" />Create feed
            </button>
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="relative inline-flex items-center justify-center p-1.5 rounded-full before:absolute before:content-[''] before:-inset-2.5 sm:before:hidden hover:bg-bg-hover transition-colors"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-text-muted" /> : <Moon className="h-4 w-4 text-text-muted" />}
              </button>
            )}
            <div ref={menuRef} className="relative -ml-1 sm:-ml-1.5">
              <button onClick={() => setShowMenu(!showMenu)} className="relative inline-flex items-center justify-center p-1.5 rounded-full before:absolute before:content-[''] before:-inset-2.5 sm:before:hidden hover:bg-bg-hover transition-colors" aria-label="More options" aria-haspopup="true" aria-expanded={showMenu}><MoreVertical className="h-4 w-4 text-text-muted" /></button>
              {showMenu && (
                <div role="menu" className="absolute right-0 top-full mt-1 w-52 bg-bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                  {user && <div className="px-3 py-2 border-b border-border"><p className="text-xs font-medium text-text truncate">{user.email}</p></div>}
                  {!user && <Link href="/login?signup=true" className="flex items-center gap-2 px-3 py-2 text-sm text-text font-medium hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}><LogIn className="h-4 w-4" />Sign up / Sign in</Link>}
                  {user && <Link href="/bookmarks" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}><Bookmark className="h-4 w-4" />Bookmarks</Link>}
                  {user && <button onClick={() => { setShowEmailPrefs(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"><Mail className="h-4 w-4" />Email digest</button>}
                  {user && <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}><SlidersHorizontal className="h-4 w-4" />Settings</Link>}
                  {user && <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"><LogIn className="h-4 w-4" />Sign out</button>}
                  <div className="border-t border-border my-1" />
                  <Link href="/contact" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>Contact</Link>
                  <Link href="/privacy" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>Privacy</Link>
                  <Link href="/terms" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>Terms</Link>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Mobile second row: scrollable tabs */}
        <div className="sm:hidden relative border-t border-border/50">
          <div ref={mobileTabs.ref} className="flex overflow-x-auto scrollbar-hide items-center gap-0 h-11">
            <Link href="/" className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 border-text text-text flex items-center gap-1.5 flex-shrink-0 h-full">
              <Rss className="h-3.5 w-3.5" />My Feed
            </Link>
            <div className="w-px h-4 bg-border/50 mx-1 flex-shrink-0" />
            {FEEDS.filter(f => showAllFeeds || !hiddenFeeds.has(f.id)).map((tab) => (
              <Link key={tab.id} href={`/${tab.id}`} className="shrink-0 flex items-center gap-1.5 px-2.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-text-muted hover:text-text transition-colors h-full">
                <span>{tab.icon}</span>{tab.name}
              </Link>
            ))}
          </div>
          {!mobileTabs.atStart && <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-bg-card to-transparent" />}
          {!mobileTabs.atEnd && <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg-card to-transparent" />}
        </div>
      </header>
      <div className="h-[5.75rem] sm:h-12" /> {/* Spacer: h-12 + h-11 + 1px border on mobile */}

      {/* Feed header -full width, 2 rows */}
      <div className="border-b border-border bg-bg">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-1.5 pb-1.5">
          {/* Row 1: title left, action buttons right */}
          <div className="flex items-center justify-between gap-3 mb-1">
            <h1 className="text-base font-bold text-text flex items-center gap-2">
              <Rss className="h-4 w-4" /> My Feed
            </h1>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => { trackEvent("feed_refresh", { feed: "for-you" }); setLoading(true); setItems([]); setNextCursor(null); fetchFeed().then((d) => { setItems(d.items || []); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); }).catch(() => setItems([])).finally(() => setLoading(false)); }} className="relative inline-flex items-center justify-center p-2 rounded-full before:absolute before:content-[''] before:-inset-2 sm:before:hidden text-text-muted hover:text-text hover:bg-bg-hover transition-all" aria-label="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              {user ? (
                <button onClick={() => setShowEmailPrefs(true)} className="relative inline-flex items-center justify-center p-2 rounded-full before:absolute before:content-[''] before:-inset-2 sm:before:hidden text-text-muted hover:text-text hover:bg-bg-hover transition-all" aria-label="Email updates">
                  <Mail className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Link href="/login?signup=true&email=true" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-text text-bg hover:opacity-90 transition-opacity">
                  <Mail className="h-3 w-3" />Get in email
                </Link>
              )}
            </div>
          </div>
          {/* Row 2: explanatory subtitle + inline Customize toggle */}
          {(() => {
            const total = FEEDS.length;
            const count = showAllFeeds ? total : FEEDS.filter((f) => enabledFeeds.has(f.id)).length;
            const sourceText = count === total ? `${total} topic feeds` : `${count} of ${total} topic feeds`;
            return (
              <div className="flex items-center gap-1 min-w-0">
                <p className="text-xs text-text-muted min-w-0 truncate">
                  Top stories blended from <span className="text-text">{sourceText}</span>
                </p>
                <button
                  onClick={() => setShowFilter((v) => !v)}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap text-text-muted hover:text-text hover:bg-bg-hover transition-all"
                  aria-expanded={showFilter}
                >
                  <Sparkles className="h-3 w-3" />
                  {showFilter ? "Done" : "Customize"}
                </button>
              </div>
            );
          })()}

          {/* Inline customize controls (no card) */}
          {showFilter && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-text-muted">
                  <button onClick={() => { const next = !showAllFeeds; setShowAllFeeds(next); localStorage.setItem("myfeed-show-all", next ? "1" : "0"); if (next) { setEnabledFeeds(DEFAULT_ENABLED); localStorage.setItem("myfeed-for-you-feeds", JSON.stringify([...DEFAULT_ENABLED])); } }} className={`relative w-8 h-4 rounded-full transition-colors ${showAllFeeds ? "bg-green-500" : "bg-border"}`} aria-pressed={showAllFeeds}>
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showAllFeeds ? "translate-x-4" : ""}`} />
                  </button>
                  <span>Show all feeds</span>
                </label>
                {!showAllFeeds && (
                  <button onClick={() => { setEnabledFeeds(enabledFeeds.size === FEEDS.length ? new Set(["ai"]) : DEFAULT_ENABLED); localStorage.setItem("myfeed-for-you-feeds", JSON.stringify(enabledFeeds.size === FEEDS.length ? ["ai"] : [...DEFAULT_ENABLED])); }} className="text-[11px] text-text-muted hover:text-text transition-colors">
                    {enabledFeeds.size === FEEDS.length ? "Deselect all" : "Select defaults"}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FEEDS.map((f) => {
                  const active = showAllFeeds || enabledFeeds.has(f.id);
                  return (
                    <button key={f.id} onClick={() => toggleFeed(f.id)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all ${active ? "border-text/30 bg-text/10 text-text" : "border-border text-text-muted hover:border-text/20 hover:text-text"}`}>
                      <span>{f.icon}</span>
                      <span>{f.name}</span>
                      {active && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero banner for guests -create feed.
          The gradient classes (from-X/via-X/to-X) only set CSS vars — they
          don't reset background-image, so the gradient bleeds through in dark
          mode. We resolve the effective theme (next-themes `resolvedTheme` —
          unwraps "system") and pick the right surface. Until mounted we use
          the neutral surface so server HTML and first client render match,
          preventing both hydration error and the white-banner flash that
          dark-mode users were reporting. */}
      {!user && !heroDismissed && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-2">
          <div className={`relative rounded-xl border border-border overflow-hidden p-4 ${!mounted || resolvedTheme === "dark" ? "bg-bg-hover" : "bg-gradient-to-br from-indigo-50 via-white to-orange-50"}`}>
            <button onClick={() => { setHeroDismissed(true); localStorage.setItem("myfeed-hero-dismissed", "1"); }} className="absolute top-2 right-2 inline-flex items-center justify-center p-1.5 rounded-full before:absolute before:content-[''] before:-inset-2.5 sm:before:hidden text-text-muted hover:text-text hover:bg-bg-hover transition-colors" aria-label="Dismiss"><X className="h-4 w-4" /></button>
            <div className="flex items-start gap-2.5 mb-3 pr-6">
              <Rss className="h-5 w-5 text-text mt-0.5 flex-shrink-0" />
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-text leading-tight">Create a feed about anything</h2>
                <p className="text-sm text-text-muted leading-snug">Describe a topic you care about. Our AI scans thousands of sources across the web and builds a custom feed just for you — always fresh, delivered to your inbox.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="e.g. React tutorials, SpaceX launches, startup funding..."
                inputMode="text"
                autoCapitalize="sentences"
                enterKeyHint="go"
                className="min-w-0 w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-text/30 focus:border-text/40 placeholder:text-text-muted/70 transition-colors"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleHeroSubmit(); }}
              />
              <button
                onClick={handleHeroSubmit}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-text px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Create my feed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-1">
      </div>

      {/* Feed content */}
      <main id="main-content" className="max-w-2xl mx-auto px-3 sm:px-4 pb-4 sm:pb-6">
        {loading ? (
          <div className="space-y-2 pt-1">{[1,2,3,4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border overflow-hidden bg-bg-card">
              {i <= 2 && <div className="w-full aspect-[2.5/1] bg-bg-hover" />}
              <div className="p-4"><div className="flex items-center gap-2 mb-3"><div className="w-4 h-4 rounded-full bg-bg-hover" /><div className="h-3 bg-bg-hover rounded w-16" /></div><div className="h-5 bg-bg-hover rounded w-4/5 mb-2" /><div className="h-3 bg-bg-hover rounded w-full" /></div>
            </div>
          ))}</div>
        ) : dedupedItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-muted font-medium">Nothing here yet</p>
            <p className="text-xs text-text-muted mt-1">Fresh picks keep rolling in automatically</p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {dedupedItems.map((item, i) => {
              const src = getSourceInfo(item.source, item.title);
              const favicon = src.icon || getSourceFavicon(item.source, item.url);
              const titleRaw = cleanTitle(item.title);
              const title = src.name && titleRaw.endsWith(` - ${src.name}`)
                ? titleRaw.slice(0, -3 - src.name.length).trim()
                : titleRaw;
              const summary = cleanSummary(item.summary, title);
              const hasImage = !!item.image_url;
              const ytMatch = item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
              const ytId = ytMatch?.[1];
              return (
                <article key={item.id || i} className="group rounded-xl border border-border overflow-hidden bg-bg-card hover:border-text/20 transition-colors duration-150">
                  {ytId ? (
                    <div className="w-full aspect-video">
                      <iframe src={`https://www.youtube.com/embed/${ytId}`} title={title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                    </div>
                  ) : null}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block" onClick={() => trackEvent("article_click", { source: item.source, feed: "for-you" })}>
                    {!ytId && hasImage && !/imgs\.search\.brave\.com|favicons?\.|\/favicon\.|:32:32|:16:16|:64:64/i.test(item.image_url || "") && (
                      <div className="w-full h-36 sm:h-40 overflow-hidden relative">
                        <img
                          src={normalizeImageUrl(item.image_url)}
                          alt={title}
                          className="w-full h-full object-cover"
                          loading={i === 0 ? "eager" : "lazy"}
                          fetchPriority={i === 0 ? "high" : "auto"}
                          onError={(e) => { const container = (e.target as HTMLImageElement).parentElement; if (container) container.style.display = "none"; }}
                        />
                      </div>
                    )}
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${src.color}`}>
                          {favicon ? <img src={favicon} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-3 h-3 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : null}
                          {src.name}
                        </span>
                        <span className="text-[10px] text-text-muted">{timeAgo(item.publishedAt)}</span>
                          {trendingTopics.has(item.id) && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400">Trending</span>}
                      </div>
                      <h2 className="font-semibold text-text leading-tight text-[15px] group-hover:text-text/80 transition-colors">{title}</h2>
                      {summary && summary !== title && summary.length > 10 && (
                        <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-snug">{summary}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/50">
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "like"); }} className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all ${userReactions[item.id] === "like" ? "text-green-400 bg-green-500/10" : "text-text-muted hover:text-green-400 hover:bg-green-500/10"}`} aria-label="More like this"><ThumbsUp className="h-3 w-3" />More</button>
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "dislike"); }} className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all ${userReactions[item.id] === "dislike" ? "text-red-400 bg-red-500/10" : "text-text-muted hover:text-red-400 hover:bg-red-500/10"}`} aria-label="Less like this"><ThumbsDown className="h-3 w-3" />Less</button>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={(e) => { e.preventDefault(); handleBookmark(item.id); }} className={`p-1.5 rounded-md flex items-center justify-center transition-all ${userBookmarks.has(item.id) ? "text-yellow-400 bg-yellow-500/10" : "text-text-muted hover:text-text hover:bg-bg-hover"}`} aria-label="Save">{userBookmarks.has(item.id) ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}</button>
                          <button onClick={(e) => { e.preventDefault(); handleShare(item); }} className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-bg-hover flex items-center justify-center transition-all" aria-label="Share"><Share2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  </a>
                </article>
              );
            })}
          </div>
        )}
        {hasMore && (
          <button onClick={loadMore} disabled={loadingMore} className="w-full mt-4 py-3 text-sm font-medium text-text-muted hover:text-text border border-border rounded-2xl hover:bg-bg-card transition-all">
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}
        {!hasMore && !loading && dedupedItems.length > 0 && (
          <p className="text-center py-8 text-xs text-text-muted">You&apos;re all caught up</p>
        )}
      </main>

      <footer className="border-t border-border py-6 mt-8">
        <div className="max-w-2xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-text-muted">
          <span>MyFeed &copy; {new Date().getFullYear()}</span>
          <Link href="/privacy" className="hover:text-text transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-text transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-text transition-colors">Contact</Link>
        </div>
      </footer>

      {/* New Feed Modal */}
      {/* Email Digest Preferences Modal */}
      {showEmailPrefs && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEmailPrefs(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Mail className="h-5 w-5" /><h2 className="font-bold text-lg">Email Digest</h2></div>
                <button onClick={() => setShowEmailPrefs(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>

              <div className="space-y-4">
                {/* Enable/disable */}
                <label className="flex items-center justify-between">
                  <span className="text-sm">Receive email digests</span>
                  <input type="checkbox" checked={emailPrefs.enabled} onChange={(e) => setEmailPrefs({ ...emailPrefs, enabled: e.target.checked })} className="rounded" />
                </label>

                {emailPrefs.enabled && (
                  <>
                    {/* Delivery time */}
                    <div>
                      <label className="text-xs text-text-muted font-medium uppercase tracking-wider block mb-1.5">Delivery time</label>
                      <select value={emailPrefs.time} onChange={(e) => setEmailPrefs({ ...emailPrefs, time: e.target.value })} className="w-full bg-bg-hover border border-border rounded-lg px-3 py-2 text-sm">
                        <option value="06:00">6:00 AM</option>
                        <option value="07:00">7:00 AM</option>
                        <option value="08:00">8:00 AM (default)</option>
                        <option value="09:00">9:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="18:00">6:00 PM</option>
                      </select>
                    </div>

                    {/* Per-feed frequency */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-text-muted font-medium uppercase tracking-wider">Each feed&apos;s cadence</label>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => { const all: Record<string, FeedFreq> = {}; for (const f of FEEDS) all[f.id] = "daily"; setFeedFreqs(all); }}
                            className="px-1.5 py-0.5 rounded text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
                          >All daily</button>
                          <button
                            type="button"
                            onClick={() => setFeedFreqs({})}
                            className="px-1.5 py-0.5 rounded text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
                          >Clear</button>
                        </div>
                      </div>
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        {FEEDS.map((feed) => {
                          const current = feedFreqs[feed.id] || "never";
                          return (
                            <div key={feed.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-hover">
                              <span className="text-sm truncate flex-1">{feed.icon} {feed.name}</span>
                              <select
                                value={current}
                                onChange={(e) => setFeedFreqs((s) => ({ ...s, [feed.id]: e.target.value as FeedFreq }))}
                                className="bg-bg border border-border rounded-md px-2 py-1 text-xs"
                                aria-label={`${feed.name} email frequency`}
                              >
                                <option value="never">Off</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-text-muted mt-2">Daily feeds arrive at your delivery time. Weekly feeds arrive once every 7 days at the same time.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowEmailPrefs(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                <button onClick={async () => {
                  // Resolve slugs to UUIDs and ship the per-feed map. Slugs without
                  // a UUID mapping are dropped (server would strip them anyway).
                  const feedFrequencies: Record<string, FeedFreq> = {};
                  for (const slug of Object.keys(feedFreqs)) {
                    const uuid = systemFeedMap[slug];
                    const freq = feedFreqs[slug];
                    if (uuid && freq) feedFrequencies[uuid] = freq;
                  }
                  try {
                    await fetch("/api/email-preferences", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        enabled: emailPrefs.enabled,
                        frequency: emailPrefs.frequency,
                        time: emailPrefs.time,
                        feedFrequencies,
                      }),
                    });
                    toast("Email preferences saved", "success");
                  } catch { toast("Failed to save", "error"); }
                  setShowEmailPrefs(false);
                }} className="flex-1 py-2.5 text-sm bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewFeed && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewFeed(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-text/5 flex items-center justify-center"><Sparkles className="h-4 w-4 text-text" /></div><h2 className="font-bold text-lg">Create a Feed</h2></div>
                <button onClick={() => setShowNewFeed(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4 ml-10">Describe what you want to follow. AI will find the best content.</p>
              <textarea autoFocus placeholder="e.g. Latest React and Next.js tutorials, new CSS features" className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 transition-all placeholder:text-text-muted/50" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowNewFeed(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                {user ? (
                  <button onClick={async () => { if (!newPrompt.trim()) return; trackEvent("create_feed", { prompt: newPrompt.slice(0, 100), logged_in: true }); try { const res = await fetch("/api/feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPrompt.slice(0, 40), query_text: newPrompt }) }); const data = await res.json(); const id = data.feed?.id; if (id) { fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {}); window.location.href = `/my/${id}`; return; } window.location.href = "/"; } catch { window.location.href = "/"; } }} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Create feed</button>
                ) : (
                  <Link href={`/login?signup=true${newPrompt ? `&prompt=${encodeURIComponent(newPrompt)}` : ""}`} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Sign up to create</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
