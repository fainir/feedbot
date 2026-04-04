"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, Sun, Moon, Sparkles, ThumbsUp, ThumbsDown, X, Bookmark, BookmarkCheck, Share2, Zap, Globe, TrendingUp, MoreVertical, LogIn } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { trackEvent } from "@/components/analytics";
import { useToast } from "@/components/ui/toast";
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

// ─── Helpers ───

function cleanSummary(text: string): string {
  return text
    .replace(/Continue reading on [^»]+»/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(submitted by \/u\/\w+\s*\[link\]\s*\[comments\])/i, "")
    .replace(/Article URL: https?:\/\/\S+/g, "")
    .replace(/Comments URL: https?:\/\/\S+/g, "")
    .replace(/Points: \d+ # Comments: \d+/g, "")
    .trim();
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Gradient fallback for articles without cover images
const GRADIENTS = [
  "from-blue-900/40 to-blue-800/20",
  "from-purple-900/40 to-purple-800/20",
  "from-green-900/40 to-green-800/20",
  "from-orange-900/40 to-orange-800/20",
  "from-red-900/40 to-red-800/20",
  "from-cyan-900/40 to-cyan-800/20",
  "from-pink-900/40 to-pink-800/20",
  "from-indigo-900/40 to-indigo-800/20",
];

function getGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function getSourceInfo(raw: string): { name: string; icon: string; color: string } {
  const s = raw.toLowerCase();
  if (s.includes("hacker news") || s.includes("hnrss"))
    return { name: "Hacker News", icon: "https://news.ycombinator.com/favicon.ico", color: "bg-orange-500/10 text-orange-400" };
  if (s.includes("reddit") || s.includes("everything science") || s.includes("the community for"))
    return { name: raw.includes("/r/") ? "r/" + (raw.split("/r/")[1]?.split("/")[0]?.split("?")[0] || "reddit") : "Reddit", icon: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png", color: "bg-orange-600/10 text-orange-300" };
  if (s.includes("medium"))
    return { name: "Medium", icon: "https://cdn-static-1.medium.com/_/fp/icons/Medium-Avatar-500x500.svg", color: "bg-white/10 text-white" };
  if (s.includes("dev community") || s.includes("dev.to"))
    return { name: "DEV", icon: "https://dev.to/favicon.ico", color: "bg-indigo-500/10 text-indigo-400" };
  if (s.includes("ars technica"))
    return { name: "Ars Technica", icon: "https://cdn.arstechnica.net/favicon.ico", color: "bg-red-500/10 text-red-400" };
  if (s.includes("the verge"))
    return { name: "The Verge", icon: "https://www.theverge.com/favicon.ico", color: "bg-purple-500/10 text-purple-400" };
  if (s.includes("techcrunch"))
    return { name: "TechCrunch", icon: "https://techcrunch.com/favicon.ico", color: "bg-green-500/10 text-green-400" };
  if (s.includes("bloomberg"))
    return { name: "Bloomberg", icon: "", color: "bg-blue-500/10 text-blue-400" };
  if (s.includes("entrepreneur"))
    return { name: "Entrepreneur", icon: "", color: "bg-red-500/10 text-red-400" };
  if (s.includes("google news") || s.includes("- google") || s.includes("artificial intelligence") || s.includes("machine learning") || s.includes("big tech") || s.includes("startup funding") || s.includes("software engineering") || s.includes("scientific discoveries"))
    return { name: "News", icon: "", color: "bg-blue-500/10 text-blue-400" };
  return { name: raw.length > 25 ? raw.slice(0, 22) + "..." : raw, icon: "", color: "bg-text/5 text-text-muted" };
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–|]\s*(Google News|Bloomberg\.com|Bioengineer\.org|Pulse 2\.0|technologymagazine\.com|Yahoo Finance|ADWEEK|TradingView|SpaceNews|Entrepreneur|Washington Technology|Sports Video Group|Stock Titan|Physics World|Focus2Move|KIMT|E3-Magazin|Global Design News|Community Impact \| News|Ocean News & Technology|EMJ|Professional Carwash Magazine|EquiManagement|Black PR Wire|carwash\.com|The Cannata Report -).*$/i, "")
    .trim();
}

const TABS = [
  { id: "ai", name: "AI & ML", icon: "🤖", query: "artificial intelligence breakthroughs, LLM models, AI startups, machine learning research, GPT Claude Gemini, AI tools and products" },
  { id: "tech", name: "Tech", icon: "💻", query: "tech industry news, product launches, big tech companies, gadgets, consumer technology, tech business" },
  { id: "startups", name: "Startups", icon: "🚀", query: "startup funding rounds, venture capital deals, Y Combinator, new startup launches, founder stories, seed series A B funding" },
  { id: "dev", name: "Dev", icon: "⚡", query: "software engineering, programming tutorials, developer tools, open source projects, React Next.js Python Rust, coding best practices" },
  { id: "science", name: "Science", icon: "🔬", query: "scientific discoveries, space exploration, physics breakthroughs, biology research, climate science, nature published papers" },
  { id: "crypto", name: "Crypto", icon: "₿", query: "cryptocurrency bitcoin ethereum blockchain DeFi web3 NFT crypto market analysis trading" },
  { id: "design", name: "Design", icon: "🎨", query: "UI UX design, product design, Figma, design systems, typography, visual design trends" },
  { id: "security", name: "Security", icon: "🔒", query: "cybersecurity, data breaches, zero-day exploits, infosec tools, penetration testing, security research" },
  { id: "gaming", name: "Gaming", icon: "🎮", query: "video games, game releases, gaming industry news, esports, game development, indie games" },
  { id: "business", name: "Business", icon: "📈", query: "business strategy, leadership, management, entrepreneurship, market trends, corporate news" },
  { id: "space", name: "Space", icon: "🚀", query: "SpaceX launches, NASA missions, Mars exploration, James Webb telescope, space industry, rocket launches, satellites" },
  { id: "health", name: "Health", icon: "🏥", query: "health research, medical breakthroughs, mental health, nutrition science, fitness studies, biotech news" },
  { id: "climate", name: "Climate", icon: "🌍", query: "climate change, renewable energy, solar wind power, sustainability, carbon emissions, green technology, electric vehicles" },
  { id: "fintech", name: "Fintech", icon: "💳", query: "fintech news, digital banking, payment technology, neobanks, financial APIs, open banking, insurtech" },
  { id: "devops", name: "DevOps", icon: "🔧", query: "DevOps, cloud infrastructure, Kubernetes Docker, CI CD pipelines, AWS Azure GCP, platform engineering, SRE" },
  { id: "data", name: "Data", icon: "📊", query: "data science, analytics, big data, data engineering, SQL databases, data visualization, business intelligence" },
  { id: "mobile", name: "Mobile", icon: "📱", query: "mobile app development, iOS Android, React Native Flutter, mobile UX, app store trends, Swift Kotlin" },
  { id: "marketing", name: "Marketing", icon: "📣", query: "digital marketing, SEO, content marketing, growth hacking, social media marketing, email marketing, conversion optimization" },
];

const PROMPT_EXAMPLES = [
  "Latest React and Next.js tutorials, new CSS features",
  "AI startup funding, new AI product launches",
  "Indie game development, pixel art, game jams",
  "Climate change research, renewable energy news",
];

export default function FeedPage() {
  const params = useParams();
  const feedSlug = (params.feed as string) || "tech";
  const activeTab = TABS.find((t) => t.id === feedSlug);

  // 404 for invalid slugs — render not-found instead of defaulting
  if (!activeTab) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-2">404</h1>
          <p className="text-text-muted mb-6">Feed not found</p>
          <Link href="/tech" className="bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">Go to feeds</Link>
        </div>
      </div>
    );
  }

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showNewFeed, setShowNewFeed] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, "like" | "dislike">>({});
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());
  const tabBarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => setMounted(true), []);

  // Scroll active tab into view on mount
  useEffect(() => {
    if (!tabBarRef.current) return;
    const activeEl = tabBarRef.current.querySelector("[data-active='true']") as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
    }
  }, [feedSlug]);

  // Check auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleReaction = useCallback(async (feedItemId: string, reaction: "like" | "dislike") => {
    if (!user) { toast("Sign up to save your preferences", "info"); return; }
    const prev = userReactions[feedItemId];
    // Optimistic update
    setUserReactions((r) => {
      const next = { ...r };
      if (next[feedItemId] === reaction) delete next[feedItemId];
      else next[feedItemId] = reaction;
      return next;
    });
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feed_item_id: feedItemId, reaction }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setUserReactions((r) => {
        const next = { ...r };
        if (prev) next[feedItemId] = prev;
        else delete next[feedItemId];
        return next;
      });
    }
  }, [user, userReactions]);

  const handleBookmark = useCallback(async (feedItemId: string) => {
    if (!user) { toast("Sign up to save articles", "info"); return; }
    const wasBookmarked = userBookmarks.has(feedItemId);
    // Optimistic update
    setUserBookmarks((s) => {
      const next = new Set(s);
      if (next.has(feedItemId)) next.delete(feedItemId);
      else next.add(feedItemId);
      return next;
    });
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feed_item_id: feedItemId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setUserBookmarks((s) => {
        const next = new Set(s);
        if (wasBookmarked) next.add(feedItemId);
        else next.delete(feedItemId);
        return next;
      });
    }
  }, [user, userBookmarks]);

  const handleShare = useCallback(async (item: FeedItem) => {
    trackEvent("share_article", { source: item.source, feed: feedSlug });
    const shareData = { title: item.title, url: item.url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(item.url);
    }
  }, [feedSlug]);

  const fetchFeed = useCallback((query: string, cursor?: string) => {
    const url = `/api/public/feeds?q=${encodeURIComponent(query)}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    return fetch(url).then((r) => r.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    fetchFeed(activeTab.query)
      .then((d) => { setItems(d.items || []); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeTab.query, fetchFeed]);

  const dedupedItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.url.split("?")[0].split("#")[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items]);

  const loadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    fetchFeed(activeTab.query, nextCursor)
      .then((d) => { setItems((p) => [...p, ...(d.items || [])]); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Single top bar: logo | tabs | actions */}
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border flex items-center h-11">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
        </Link>

        {/* Scrollable tabs */}
        <div ref={tabBarRef} className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-0 min-w-0">
          <Link href="/" className="px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-text-muted hover:text-text hover:bg-bg-hover transition-colors flex items-center gap-1">
            <span className="text-sm">✨</span><span className="hidden sm:inline">For You</span>
          </Link>
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/${tab.id}`}
              data-active={feedSlug === tab.id}
              className={`px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1 ${
                feedSlug === tab.id ? "border-text text-text" : "border-transparent text-text-muted hover:text-text hover:bg-bg-hover"
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.name}</span>
            </Link>
          ))}
          <Link href="/explore" className="px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-text-muted hover:text-text hover:bg-bg-hover transition-colors flex items-center gap-1">
            <span className="text-sm">🔍</span><span className="hidden sm:inline">Explore</span>
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 border-l border-border">
          <button
            onClick={() => setShowNewFeed(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">Create feed</span>
            <span className="sm:hidden">New</span>
          </button>
          {user ? (
            <Link href="/dashboard" className="text-[11px] font-semibold bg-text text-bg px-3 py-1 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap">Dashboard</Link>
          ) : (
            <Link href="/login" className="text-[11px] font-semibold bg-text text-bg px-3 py-1 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap">Sign in</Link>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-bg-hover transition-colors" aria-label="More options">
              <MoreVertical className="h-4 w-4 text-text-muted" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-lg py-1 z-50" onMouseLeave={() => setShowMenu(false)}>
                {mounted && (
                  <button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </button>
                )}
                {!user && (
                  <Link href="/login" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Link>
                )}
                {user && (
                  <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">
                    <LogIn className="h-4 w-4" />
                    Sign out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Feed header */}
      <div className="max-w-4xl mx-auto px-3 pt-3 pb-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text flex items-center gap-1.5">{activeTab.icon} {activeTab.name}</h2>
            <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{activeTab.query}</p>
          </div>
          <button
            onClick={() => { setShowCustomize(true); setNewPrompt(activeTab.query); }}
            className="flex-shrink-0 flex items-center gap-1 text-[11px] text-text-muted hover:text-text transition-colors mt-0.5"
          >
            <Sparkles className="h-3 w-3" />
            Customize
          </button>
        </div>
      </div>

      {/* Feed */}
      <main id="main-content" className="max-w-4xl mx-auto px-3 pb-6">
        {loading ? (
          <div className="space-y-4 pt-2">{[1,2,3,4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border overflow-hidden bg-bg-card">
              {i <= 2 && <div className="w-full aspect-[2.5/1] bg-bg-hover" />}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3"><div className="w-4 h-4 rounded-full bg-bg-hover" /><div className="h-3 bg-bg-hover rounded w-16" /></div>
                <div className="h-5 bg-bg-hover rounded w-4/5 mb-2" />
                <div className="h-3 bg-bg-hover rounded w-full" />
              </div>
            </div>
          ))}</div>
        ) : dedupedItems.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-text-muted font-medium">Scanning the internet...</p>
            <p className="text-xs text-text-muted mt-1">Content refreshes automatically every 15 minutes</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {dedupedItems.map((item, i) => {
              const src = getSourceInfo(item.source);
              const title = cleanTitle(item.title);
              const summary = cleanSummary(item.summary);
              const hasImage = !!item.image_url;
              return (
                <article key={item.id || i} className="group rounded-2xl border border-border overflow-hidden bg-bg-card hover:border-text/20 transition-all duration-200">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                    {hasImage ? (
                      <div className="w-full aspect-[2.5/1] bg-bg-hover overflow-hidden relative">
                        <img src={item.image_url} alt={title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).parentElement!.classList.add("hidden"); }} />
                      </div>
                    ) : i < 5 ? (
                      <div className={`w-full aspect-[3/1] bg-gradient-to-br ${getGradient(title)} flex items-end p-4`}>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${src.color}`}>{src.name}</span>
                      </div>
                    ) : null}
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${src.color}`}>
                          {src.icon ? <img src={src.icon} alt="" className="w-3 h-3 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : null}
                          {src.name}
                        </span>
                        <span className="text-[11px] text-text-muted">{timeAgo(item.publishedAt)}</span>
                      </div>
                      <h2 className="font-semibold text-text leading-snug text-[15px] group-hover:text-text/80 transition-colors">{title}</h2>
                      {summary && summary !== title && summary.length > 10 && (
                        <p className="text-sm text-text-muted mt-1.5 line-clamp-2 leading-relaxed">{summary}</p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "like"); }} className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all ${userReactions[item.id] === "like" ? "text-green-400 bg-green-500/10" : "text-text-muted hover:text-green-400 hover:bg-green-500/10"}`} aria-label="More like this"><ThumbsUp className="h-3.5 w-3.5" /></button>
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "dislike"); }} className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all ${userReactions[item.id] === "dislike" ? "text-red-400 bg-red-500/10" : "text-text-muted hover:text-red-400 hover:bg-red-500/10"}`} aria-label="Less like this"><ThumbsDown className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.preventDefault(); handleBookmark(item.id); }} className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition-all ${userBookmarks.has(item.id) ? "text-yellow-400 bg-yellow-500/10" : "text-text-muted hover:text-text hover:bg-bg-hover"}`} aria-label="Save">{userBookmarks.has(item.id) ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}</button>
                          <button onClick={(e) => { e.preventDefault(); handleShare(item); }} className="px-2 py-1 rounded-lg text-xs text-text-muted hover:text-text hover:bg-bg-hover flex items-center gap-1 transition-all" aria-label="Share"><Share2 className="h-3.5 w-3.5" /></button>
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
          <LoadMoreSentinel loading={loadingMore} onVisible={loadMore} />
        )}
        {!hasMore && dedupedItems.length > 0 && (
          <p className="text-center py-6 text-xs text-text-muted">You&apos;ve reached the end of this feed</p>
        )}

        {/* CTA */}
        <div className="mt-8 rounded-2xl border border-border bg-bg-card overflow-hidden">
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-text/5 mb-4">
              <Zap className="h-6 w-6 text-text" />
            </div>
            <h3 className="font-bold text-lg mb-2">Your internet, curated by AI</h3>
            <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">
              Describe what you care about in plain English. MyFeed scans thousands of sources and delivers only what matters to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setShowNewFeed(true)} className="inline-flex items-center justify-center gap-2 bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">
                <Sparkles className="h-4 w-4" />
                Create your custom feed
              </button>
            </div>
          </div>
          <div className="border-t border-border/50 px-6 py-4 bg-bg-hover/30">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2 font-medium">Popular feeds</p>
            <div className="flex flex-wrap gap-2">
              {["AI tools & products", "Startup funding", "React & Next.js", "Space exploration", "Cybersecurity"].map((ex) => (
                <span key={ex} className="text-xs px-3 py-1 rounded-full border border-border/50 text-text-muted">{ex}</span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 mt-8">
        <div className="max-w-4xl mx-auto px-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-text-muted">
          <span>MyFeed &copy; {new Date().getFullYear()}</span>
          <Link href="/privacy" className="hover:text-text transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-text transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-text transition-colors">Contact</Link>
        </div>
      </footer>

      {/* New Feed Modal */}
      {showNewFeed && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewFeed(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-text/5 flex items-center justify-center"><Sparkles className="h-4 w-4 text-text" /></div>
                  <h2 className="font-bold text-lg">Create a Feed</h2>
                </div>
                <button onClick={() => setShowNewFeed(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4 ml-10">Describe what you want to follow. AI will find the best content.</p>
              <textarea autoFocus placeholder="e.g. Latest React and Next.js tutorials, new CSS features, web performance tips" className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 transition-all placeholder:text-text-muted/50" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
              <div className="mt-3 mb-4">
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2 font-medium">Try these</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => setNewPrompt(ex)} className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-text-muted hover:text-text hover:border-text/30 transition-all">{ex.length > 40 ? ex.slice(0, 37) + "..." : ex}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewFeed(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                {user ? (
                  <button
                    onClick={async () => {
                      if (!newPrompt.trim()) return;
                      trackEvent("create_feed", { prompt: newPrompt.slice(0, 100), logged_in: true });
                      try {
                        const res = await fetch("/api/feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPrompt.slice(0, 40), query_text: newPrompt }) });
                        const data = await res.json();
                        const id = data.feed?.id;
                        if (id) { fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {}); window.location.href = `/my/${id}`; return; }
                        window.location.href = "/dashboard";
                      } catch { window.location.href = "/dashboard"; }
                    }}
                    className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Create feed
                  </button>
                ) : (
                  <Link href={`/login?signup=true${newPrompt ? `&prompt=${encodeURIComponent(newPrompt)}` : ""}`} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sign up to create
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load More Sentinel is defined below */}

      {/* Customize Feed Modal */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCustomize(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-text/5 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-text" /></div>
                  <h2 className="font-bold text-lg">Customize Feed</h2>
                </div>
                <button onClick={() => setShowCustomize(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4 ml-10">Change the prompt to adjust what articles appear.</p>
              <textarea autoFocus className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 transition-all" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowCustomize(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                <Link href={`/login?signup=true${newPrompt ? `&prompt=${encodeURIComponent(newPrompt)}` : ""}`} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sign up to customize
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadMoreSentinel({ loading, onVisible }: { loading: boolean; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onVisibleRef.current(); },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex justify-center py-6">
      {loading && (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
      )}
    </div>
  );
}
