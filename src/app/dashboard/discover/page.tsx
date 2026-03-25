"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  TrendingUp,
  TrendingDown,
  Star,
  Zap,
  Search,
  Plus,
  ChevronRight,
  Sparkles,
  Flame,
  Grid3X3,
  Cpu,
  FlaskConical,
  Briefcase,
  Bitcoin,
  Palette,
  HeartPulse,
  Rocket,
  CloudSun,
  Gamepad2,
  ExternalLink,
  Check,
} from "lucide-react";

// --- Mock Data ---

type TrendDirection = "up" | "down" | "new";

interface TrendingTopic {
  id: string;
  name: string;
  trend: TrendDirection;
  articleCount: number;
  headlines: string[];
  category: string;
}

interface RecommendedFeed {
  id: string;
  name: string;
  description: string;
  reason: string;
  articleCount: number;
}

interface PopularArticle {
  id: string;
  title: string;
  source: string;
  engagement: number;
  publishedAt: string;
  url: string;
}

interface Category {
  id: string;
  name: string;
  feedCount: number;
  icon: React.ReactNode;
  color: string;
}

const TRENDING_TOPICS: TrendingTopic[] = [
  {
    id: "ai",
    name: "Artificial Intelligence",
    trend: "up",
    articleCount: 342,
    headlines: [
      "GPT-5 rumored to launch next quarter",
      "New open-source LLM beats commercial models",
      "AI regulation bill passes Senate committee",
    ],
    category: "AI",
  },
  {
    id: "tech",
    name: "Tech Industry",
    trend: "up",
    articleCount: 289,
    headlines: [
      "Apple unveils mixed reality headset update",
      "Startup funding rebounds in Q1 2026",
      "New chip architecture promises 10x efficiency",
    ],
    category: "Tech",
  },
  {
    id: "science",
    name: "Science",
    trend: "new",
    articleCount: 156,
    headlines: [
      "CRISPR therapy approved for rare disease",
      "James Webb discovers high-redshift galaxy cluster",
      "Fusion milestone: sustained reaction for 10 minutes",
    ],
    category: "Science",
  },
  {
    id: "business",
    name: "Business & Finance",
    trend: "down",
    articleCount: 198,
    headlines: [
      "Fed signals rate hold through summer",
      "Global supply chains stabilize post-disruption",
      "Remote work adoption plateaus at 35%",
    ],
    category: "Business",
  },
  {
    id: "crypto",
    name: "Crypto & Web3",
    trend: "up",
    articleCount: 134,
    headlines: [
      "Bitcoin ETF inflows hit new monthly record",
      "Ethereum layer-2 TVL surpasses $50B",
      "Major bank launches stablecoin platform",
    ],
    category: "Crypto",
  },
  {
    id: "design",
    name: "Design & UX",
    trend: "new",
    articleCount: 87,
    headlines: [
      "Spatial design patterns for AR interfaces",
      "Minimalism backlash: maximalist UI trend rises",
      "Figma introduces AI layout suggestions",
    ],
    category: "Design",
  },
  {
    id: "health",
    name: "Health & Wellness",
    trend: "up",
    articleCount: 203,
    headlines: [
      "mRNA vaccines expand to cancer treatment",
      "Wearable detects early cardiac events in study",
      "WHO updates global mental health guidelines",
    ],
    category: "Health",
  },
  {
    id: "space",
    name: "Space Exploration",
    trend: "new",
    articleCount: 64,
    headlines: [
      "SpaceX Starship completes orbital cargo mission",
      "Lunar Gateway module passes final tests",
      "Private asteroid mining venture secures funding",
    ],
    category: "Space",
  },
  {
    id: "climate",
    name: "Climate & Energy",
    trend: "up",
    articleCount: 178,
    headlines: [
      "Solar generation exceeds coal for first time",
      "Carbon capture plant opens in Iceland",
      "EV sales hit 40% market share in Europe",
    ],
    category: "Climate",
  },
  {
    id: "gaming",
    name: "Gaming",
    trend: "down",
    articleCount: 145,
    headlines: [
      "Nintendo announces next-gen console specs",
      "Cloud gaming latency drops below 20ms",
      "Indie game wins Game of the Year",
    ],
    category: "Gaming",
  },
];

const RECOMMENDED_FEEDS: RecommendedFeed[] = [
  {
    id: "ml-research",
    name: "ML Research Digest",
    description: "Daily summaries of top machine learning papers from arXiv",
    reason: "Because you read AI News",
    articleCount: 45,
  },
  {
    id: "ai-ethics",
    name: "AI Ethics Weekly",
    description: "Policy, governance, and ethical implications of AI systems",
    reason: "Because you read AI News",
    articleCount: 12,
  },
  {
    id: "robotics-today",
    name: "Robotics Today",
    description: "Advances in robotics, automation, and embodied AI",
    reason: "Because you read AI News",
    articleCount: 28,
  },
  {
    id: "startup-weekly",
    name: "Startup Weekly",
    description: "Funding rounds, launches, and founder interviews",
    reason: "Because you read Tech Industry",
    articleCount: 34,
  },
  {
    id: "dev-tools",
    name: "Dev Tools Radar",
    description: "New developer tools, frameworks, and productivity hacks",
    reason: "Because you read Tech Industry",
    articleCount: 22,
  },
  {
    id: "biotech-pulse",
    name: "Biotech Pulse",
    description: "Clinical trials, drug approvals, and biotech breakthroughs",
    reason: "Because you read Science",
    articleCount: 19,
  },
];

const POPULAR_ARTICLES: PopularArticle[] = [
  { id: "p1", title: "The Real Cost of Running AI at Scale", source: "The Verge", engagement: 9847, publishedAt: "2026-03-24T10:00:00Z", url: "#" },
  { id: "p2", title: "Why Every Developer Should Understand Compilers", source: "Hacker News", engagement: 8234, publishedAt: "2026-03-23T14:00:00Z", url: "#" },
  { id: "p3", title: "Inside the Lab Building Room-Temperature Superconductors", source: "MIT Tech Review", engagement: 7891, publishedAt: "2026-03-22T09:00:00Z", url: "#" },
  { id: "p4", title: "Remote Work Is Reshaping Global Real Estate", source: "Bloomberg", engagement: 6543, publishedAt: "2026-03-24T08:00:00Z", url: "#" },
  { id: "p5", title: "The Unexpected Rise of Retro Computing", source: "Ars Technica", engagement: 5987, publishedAt: "2026-03-21T16:00:00Z", url: "#" },
  { id: "p6", title: "How Open Source Won the AI Race", source: "Wired", engagement: 5432, publishedAt: "2026-03-23T11:00:00Z", url: "#" },
  { id: "p7", title: "A New Framework for Understanding Climate Tipping Points", source: "Nature", engagement: 4876, publishedAt: "2026-03-20T07:00:00Z", url: "#" },
  { id: "p8", title: "The Psychology of Infinite Scrolling", source: "The Atlantic", engagement: 4321, publishedAt: "2026-03-22T13:00:00Z", url: "#" },
  { id: "p9", title: "Quantum Computing Hits Its iPhone Moment", source: "TechCrunch", engagement: 3998, publishedAt: "2026-03-24T06:00:00Z", url: "#" },
  { id: "p10", title: "Why Sleep Science Is Finally Being Taken Seriously", source: "Scientific American", engagement: 3654, publishedAt: "2026-03-21T10:00:00Z", url: "#" },
];

const CATEGORIES: Category[] = [
  { id: "ai", name: "AI & Machine Learning", feedCount: 48, icon: <Cpu className="h-5 w-5" />, color: "text-purple-400 bg-purple-500/10" },
  { id: "tech", name: "Technology", feedCount: 62, icon: <Zap className="h-5 w-5" />, color: "text-blue-400 bg-blue-500/10" },
  { id: "science", name: "Science", feedCount: 35, icon: <FlaskConical className="h-5 w-5" />, color: "text-green-400 bg-green-500/10" },
  { id: "business", name: "Business & Finance", feedCount: 41, icon: <Briefcase className="h-5 w-5" />, color: "text-yellow-400 bg-yellow-500/10" },
  { id: "crypto", name: "Crypto & Web3", feedCount: 29, icon: <Bitcoin className="h-5 w-5" />, color: "text-orange-400 bg-orange-500/10" },
  { id: "design", name: "Design & UX", feedCount: 22, icon: <Palette className="h-5 w-5" />, color: "text-pink-400 bg-pink-500/10" },
  { id: "health", name: "Health & Wellness", feedCount: 31, icon: <HeartPulse className="h-5 w-5" />, color: "text-red-400 bg-red-500/10" },
  { id: "space", name: "Space & Astronomy", feedCount: 18, icon: <Rocket className="h-5 w-5" />, color: "text-indigo-400 bg-indigo-500/10" },
  { id: "climate", name: "Climate & Energy", feedCount: 24, icon: <CloudSun className="h-5 w-5" />, color: "text-teal-400 bg-teal-500/10" },
  { id: "gaming", name: "Gaming", feedCount: 27, icon: <Gamepad2 className="h-5 w-5" />, color: "text-emerald-400 bg-emerald-500/10" },
];

// --- Helpers ---

function TrendBadge({ trend }: { trend: TrendDirection }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">
        <TrendingUp className="h-3 w-3" /> Trending
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
        <TrendingDown className="h-3 w-3" /> Cooling
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
      <Sparkles className="h-3 w-3" /> New
    </span>
  );
}

function formatEngagement(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// --- Page ---

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addedFeeds, setAddedFeeds] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return TRENDING_TOPICS;
    const q = searchQuery.toLowerCase();
    return TRENDING_TOPICS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.headlines.some((h) => h.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredFeeds = useMemo(() => {
    if (!searchQuery.trim()) return RECOMMENDED_FEEDS;
    const q = searchQuery.toLowerCase();
    return RECOMMENDED_FEEDS.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;
    const q = searchQuery.toLowerCase();
    return CATEGORIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_ARTICLES;
    const q = searchQuery.toLowerCase();
    return POPULAR_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleAddFeed = (feedId: string) => {
    setAddedFeeds((prev) => {
      const next = new Set(prev);
      if (next.has(feedId)) {
        next.delete(feedId);
      } else {
        next.add(feedId);
      }
      return next;
    });
  };

  const topicDetail = selectedTopic
    ? TRENDING_TOPICS.find((t) => t.id === selectedTopic)
    : null;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3">
          {/* Breadcrumb & Back */}
          <div className="mb-3 flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3 text-text-muted/50" />
            <span className="text-xs font-medium text-text">Discover</span>
          </div>

          {/* Title & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                <Compass className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text">Discover</h1>
                <p className="text-xs text-text-muted">
                  Explore trending topics, feeds, and popular content
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search topics, feeds, articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-card py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Topic Detail Overlay */}
        {topicDetail && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text">{topicDetail.name}</h2>
                <TrendBadge trend={topicDetail.trend} />
              </div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                Close
              </button>
            </div>
            <p className="mb-3 text-xs text-text-muted">
              {topicDetail.articleCount} articles this week
            </p>
            <div className="space-y-2">
              {topicDetail.headlines.map((headline, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-bg-card/60 p-3 transition-colors hover:bg-bg-card"
                >
                  <span className="mt-0.5 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm text-text">{headline}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Topics */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/10">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
            </div>
            <h2 className="text-sm font-semibold text-text">Trending Topics</h2>
            <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-medium text-text-muted">
              {filteredTopics.length} topics
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {filteredTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() =>
                  setSelectedTopic(
                    selectedTopic === topic.id ? null : topic.id
                  )
                }
                className={`group rounded-xl border p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm ${
                  selectedTopic === topic.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-bg-card"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text group-hover:text-primary">
                    {topic.name}
                  </h3>
                  <TrendBadge trend={topic.trend} />
                </div>
                <p className="mb-2.5 text-xs text-text-muted">
                  {topic.articleCount} articles this week
                </p>
                <div className="space-y-1">
                  {topic.headlines.slice(0, 2).map((h, i) => (
                    <p
                      key={i}
                      className="truncate text-[11px] leading-relaxed text-text-muted/80"
                    >
                      {h}
                    </p>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Recommended Feeds */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10">
              <Star className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold text-text">
              Recommended Feeds
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFeeds.map((feed) => (
              <div
                key={feed.id}
                className="group rounded-xl border border-border bg-bg-card p-4 transition-all hover:border-purple-500/30 hover:shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-text">
                      {feed.name}
                    </h3>
                    <p className="mt-0.5 text-[10px] font-medium text-purple-400">
                      {feed.reason}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddFeed(feed.id)}
                    className={`ml-2 flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                      addedFeeds.has(feed.id)
                        ? "bg-green-500/10 text-green-400"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {addedFeeds.has(feed.id) ? (
                      <>
                        <Check className="h-3 w-3" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" /> Add Feed
                      </>
                    )}
                  </button>
                </div>
                <p className="mb-2 text-xs leading-relaxed text-text-muted">
                  {feed.description}
                </p>
                <p className="text-[10px] text-text-muted/60">
                  ~{feed.articleCount} articles/week
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Popular This Week */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-text">
              Popular This Week
            </h2>
            <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-medium text-text-muted">
              Top 10
            </span>
          </div>
          <div className="rounded-xl border border-border bg-bg-card">
            {filteredArticles.map((article, i) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-bg-hover/50 ${
                  i < filteredArticles.length - 1
                    ? "border-b border-border/50"
                    : ""
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg text-xs font-bold text-text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text group-hover:text-primary">
                    {article.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-muted">
                    <span>{article.source}</span>
                    <span className="text-text-muted/40">·</span>
                    <span>{daysAgo(article.publishedAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
                  <Flame className="h-3 w-3 text-orange-400/70" />
                  <span className="font-medium">
                    {formatEngagement(article.engagement)}
                  </span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted/40 transition-colors group-hover:text-primary" />
              </a>
            ))}
          </div>
        </section>

        {/* Category Browser */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10">
              <Grid3X3 className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-text">
              Browse by Category
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSearchQuery(cat.name.split(" ")[0]);
                }}
                className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.color}`}
                >
                  {cat.icon}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-text group-hover:text-primary">
                    {cat.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-text-muted">
                    {cat.feedCount} feeds
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
