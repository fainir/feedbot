"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Newspaper,
  Clock,
  GitCommit,
  Plus,
  Archive,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
} from "lucide-react";

// --- Types ---

interface StoryArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  addedAt: string; // ISO timestamp
  summary: string;
}

interface TrackedStory {
  id: string;
  name: string;
  keywords: string[];
  articles: StoryArticle[];
  createdAt: string;
  status: "active" | "stale" | "archived";
}

interface StoryTrackerProps {
  articles?: { id: string; title: string; source: string; url: string; summary: string; publishedAt: string }[];
}

interface TrackStoryButtonProps {
  article: { id: string; title: string; source: string; url: string; summary: string; publishedAt?: string };
  onTrack?: () => void;
}

interface StoryBadgeProps {
  articleTitle: string;
  stories?: TrackedStory[];
}

// --- Constants ---

const STORAGE_KEY = "feedbot-stories";

const DEMO_STORIES: TrackedStory[] = [
  {
    id: "demo-1",
    name: "AI Regulation Debate",
    keywords: ["AI", "regulation", "policy", "government", "safety"],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    status: "active",
    articles: [
      {
        id: "demo-1a",
        title: "EU Passes Comprehensive AI Safety Act",
        source: "TechCrunch",
        url: "#",
        addedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        summary: "The European Union has passed landmark legislation requiring AI systems to meet strict safety standards before deployment.",
      },
      {
        id: "demo-1b",
        title: "US Senators Introduce Bipartisan AI Oversight Bill",
        source: "Reuters",
        url: "#",
        addedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        summary: "A bipartisan group of senators unveiled new legislation aimed at creating a federal framework for AI governance.",
      },
      {
        id: "demo-1c",
        title: "Tech Giants Form AI Safety Coalition in Response to Regulation",
        source: "The Verge",
        url: "#",
        addedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
        summary: "Major tech companies have banded together to propose self-regulation standards ahead of government mandates.",
      },
    ],
  },
  {
    id: "demo-2",
    name: "SpaceX Starship Program",
    keywords: ["SpaceX", "Starship", "launch", "rocket", "Mars"],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    status: "stale",
    articles: [
      {
        id: "demo-2a",
        title: "SpaceX Starship Completes First Orbital Test Flight",
        source: "Ars Technica",
        url: "#",
        addedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        summary: "Starship achieved orbit for the first time, marking a major milestone in SpaceX's Mars ambitions.",
      },
      {
        id: "demo-2b",
        title: "NASA Selects Starship for Next Lunar Lander Contract",
        source: "Space.com",
        url: "#",
        addedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        summary: "NASA awarded SpaceX a follow-up contract to use Starship as the primary lunar lander for Artemis missions.",
      },
    ],
  },
];

// --- Helpers ---

function loadStories(): TrackedStory[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  // First run: seed with demos
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_STORIES));
  return DEMO_STORIES;
}

function saveStories(stories: TrackedStory[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
}

function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for",
    "of", "with", "and", "or", "but", "not", "has", "have", "had", "its", "it",
    "this", "that", "from", "by", "as", "be", "been", "will", "can", "do", "does",
    "how", "what", "why", "who", "when", "where", "new", "says", "said", "about",
  ]);
  return title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .slice(0, 5);
}

function matchesStory(title: string, keywords: string[]): boolean {
  const lower = title.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function computeStatus(story: TrackedStory): "active" | "stale" | "archived" {
  if (story.status === "archived") return "archived";
  const latest = story.articles.reduce(
    (max, a) => Math.max(max, new Date(a.addedAt).getTime()),
    0
  );
  const daysSince = (Date.now() - latest) / 86400000;
  return daysSince > 3 ? "stale" : "active";
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isNew(addedAt: string): boolean {
  return Date.now() - new Date(addedAt).getTime() < 86400000;
}

function sentimentTrend(articles: StoryArticle[]): "up" | "down" | "neutral" {
  // Simple heuristic: compare positive/negative signal words in first half vs second half
  const positive = new Set(["launch", "success", "growth", "partnership", "milestone", "achieve", "win", "record", "breakthrough"]);
  const negative = new Set(["fail", "decline", "crash", "concern", "risk", "loss", "cut", "delay", "crisis"]);

  if (articles.length < 2) return "neutral";

  const half = Math.ceil(articles.length / 2);
  const sorted = [...articles].sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);

  function score(items: StoryArticle[]): number {
    let s = 0;
    for (const item of items) {
      const words = (item.title + " " + item.summary).toLowerCase().split(/\s+/);
      for (const w of words) {
        if (positive.has(w)) s++;
        if (negative.has(w)) s--;
      }
    }
    return s;
  }

  const diff = score(secondHalf) - score(firstHalf);
  if (diff > 1) return "up";
  if (diff < -1) return "down";
  return "neutral";
}

// --- Components ---

export function TrackStoryButton({ article, onTrack }: TrackStoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  const handleOpen = useCallback(() => {
    setName(article.title.length > 50 ? article.title.slice(0, 50) + "..." : article.title);
    setKeywords(extractKeywords(article.title));
    setKeywordInput("");
    setOpen(true);
  }, [article.title]);

  const addKeyword = useCallback(() => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
      setKeywordInput("");
    }
  }, [keywordInput, keywords]);

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleCreate = useCallback(() => {
    const stories = loadStories();
    const newStory: TrackedStory = {
      id: `story-${Date.now()}`,
      name: name.trim() || article.title,
      keywords,
      createdAt: new Date().toISOString(),
      status: "active",
      articles: [
        {
          id: article.id,
          title: article.title,
          source: article.source,
          url: article.url,
          addedAt: new Date().toISOString(),
          summary: article.summary,
        },
      ],
    };
    stories.unshift(newStory);
    saveStories(stories);
    setOpen(false);
    onTrack?.();
  }, [name, keywords, article, onTrack]);

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Track this story"
      >
        <Newspaper className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Track Story</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-text">Track This Story</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              {/* Story name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Story Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                  placeholder="Enter a name for this story..."
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Tracking Keywords</label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {kw}
                      <button
                        onClick={() => removeKeyword(kw)}
                        className="rounded-full p-0.5 hover:bg-primary/20"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                    placeholder="Add keyword..."
                  />
                  <button
                    onClick={addKeyword}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Source article preview */}
              <div className="rounded-lg bg-bg p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">First Article</p>
                <p className="mt-1 line-clamp-2 text-xs text-text">{article.title}</p>
                <p className="mt-0.5 text-[10px] text-text-muted">{article.source}</p>
              </div>

              <button
                onClick={handleCreate}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Start Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function StoryBadge({ articleTitle, stories: externalStories }: StoryBadgeProps) {
  const [stories, setStories] = useState<TrackedStory[]>([]);

  useEffect(() => {
    if (externalStories) {
      setStories(externalStories);
    } else {
      setStories(loadStories());
    }
  }, [externalStories]);

  const matching = useMemo(
    () =>
      stories.filter(
        (s) => s.status !== "archived" && matchesStory(articleTitle, s.keywords)
      ),
    [stories, articleTitle]
  );

  if (matching.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {matching.map((story) => (
        <span
          key={story.id}
          className="flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-medium text-secondary"
        >
          <Newspaper className="h-2.5 w-2.5" />
          Related to: {story.name}
        </span>
      ))}
    </div>
  );
}

export function StoryTracker({ articles = [] }: StoryTrackerProps) {
  const [stories, setStories] = useState<TrackedStory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "stale" | "archived">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Load stories
  useEffect(() => {
    setStories(loadStories());
  }, []);

  // Refresh statuses
  const storiesWithStatus = useMemo(
    () => stories.map((s) => ({ ...s, status: computeStatus(s) })),
    [stories]
  );

  // Auto-match new articles to existing stories
  useEffect(() => {
    if (articles.length === 0 || stories.length === 0) return;

    let changed = false;
    const updated = stories.map((story) => {
      if (story.status === "archived") return story;
      const existingIds = new Set(story.articles.map((a) => a.id));
      const newMatches = articles.filter(
        (a) => !existingIds.has(a.id) && matchesStory(a.title, story.keywords)
      );
      if (newMatches.length > 0) {
        changed = true;
        return {
          ...story,
          articles: [
            ...story.articles,
            ...newMatches.map((a) => ({
              id: a.id,
              title: a.title,
              source: a.source,
              url: a.url,
              addedAt: new Date().toISOString(),
              summary: a.summary,
            })),
          ],
        };
      }
      return story;
    });

    if (changed) {
      setStories(updated);
      saveStories(updated);
    }
  }, [articles]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleArchive = useCallback((storyId: string) => {
    setStories((prev) => {
      const next = prev.map((s) =>
        s.id === storyId
          ? { ...s, status: (s.status === "archived" ? "active" : "archived") as TrackedStory["status"] }
          : s
      );
      saveStories(next);
      return next;
    });
  }, []);

  const removeStory = useCallback((storyId: string) => {
    setStories((prev) => {
      const next = prev.filter((s) => s.id !== storyId);
      saveStories(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let list = storiesWithStatus;
    if (filter !== "all") list = list.filter((s) => s.status === filter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    }
    return list;
  }, [storiesWithStatus, filter, searchTerm]);

  const counts = useMemo(() => {
    const c = { all: storiesWithStatus.length, active: 0, stale: 0, archived: 0 };
    for (const s of storiesWithStatus) c[s.status]++;
    return c;
  }, [storiesWithStatus]);

  if (stories.length === 0) {
    return (
      <div className="mb-4 rounded-xl border border-border bg-bg-card p-6 text-center">
        <Newspaper className="mx-auto mb-2 h-8 w-8 text-text-muted/50" />
        <p className="text-sm font-medium text-text">No stories tracked yet</p>
        <p className="mt-1 text-xs text-text-muted">
          Use the &quot;Track Story&quot; button on any article to start following a developing story.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Newspaper className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Story Tracker</h3>
          <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-medium text-text-muted">
            {counts.all}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-36 rounded-lg border border-border bg-bg py-1 pl-7 pr-2 text-[11px] text-text placeholder:text-text-muted focus:border-primary focus:outline-none sm:w-48"
            placeholder="Search stories..."
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border px-4 py-2">
        {(["all", "active", "stale", "archived"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
              filter === f
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-bg-hover hover:text-text"
            }`}
          >
            {f}
            {counts[f] > 0 && (
              <span className="ml-1 text-[10px] opacity-60">{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Story cards */}
      <div className="divide-y divide-border">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-xs text-text-muted">
            No stories match this filter.
          </div>
        )}

        {filtered.map((story) => {
          const isExpanded = expandedId === story.id;
          const uniqueSources = new Set(story.articles.map((a) => a.source)).size;
          const trend = sentimentTrend(story.articles);
          const latestArticle = story.articles.reduce(
            (latest, a) =>
              new Date(a.addedAt).getTime() > new Date(latest.addedAt).getTime() ? a : latest,
            story.articles[0]
          );

          return (
            <div key={story.id} className="px-4 py-3">
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : story.id)}
                className="flex w-full items-start justify-between text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-text">{story.name}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        story.status === "active"
                          ? "bg-green-500/10 text-green-400"
                          : story.status === "stale"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-text-muted/10 text-text-muted"
                      }`}
                    >
                      {story.status === "active" ? "Active" : story.status === "stale" ? "Stale" : "Archived"}
                    </span>
                  </div>

                  {/* Keywords */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {story.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="flex items-center gap-0.5 rounded-full bg-bg-hover px-1.5 py-0.5 text-[10px] text-text-muted"
                      >
                        <Tag className="h-2 w-2" />
                        {kw}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Newspaper className="h-2.5 w-2.5" />
                      {story.articles.length} article{story.articles.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-2.5 w-2.5" />
                      {uniqueSources} source{uniqueSources !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatRelativeDate(latestArticle.addedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      {trend === "up" ? (
                        <TrendingUp className="h-2.5 w-2.5 text-green-400" />
                      ) : trend === "down" ? (
                        <TrendingDown className="h-2.5 w-2.5 text-red-400" />
                      ) : (
                        <Minus className="h-2.5 w-2.5" />
                      )}
                      Sentiment
                    </span>
                  </div>
                </div>

                <div className="ml-2 shrink-0 text-text-muted">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {/* Expanded: Timeline + Actions */}
              {isExpanded && (
                <div className="mt-3 border-t border-border pt-3">
                  {/* Insights bar */}
                  <div className="mb-3 flex items-center gap-4 rounded-lg bg-bg p-2.5">
                    <div className="text-center">
                      <p className="text-sm font-bold text-text">{story.articles.length}</p>
                      <p className="text-[9px] text-text-muted">Articles</p>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-text">{uniqueSources}</p>
                      <p className="text-[9px] text-text-muted">Sources</p>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-1 text-center">
                      {trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : trend === "down" ? (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      ) : (
                        <Minus className="h-4 w-4 text-text-muted" />
                      )}
                      <div>
                        <p className="text-xs font-medium text-text capitalize">{trend}</p>
                        <p className="text-[9px] text-text-muted">Sentiment</p>
                      </div>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-xs font-medium text-text">
                        {Math.ceil((Date.now() - new Date(story.createdAt).getTime()) / 86400000)}d
                      </p>
                      <p className="text-[9px] text-text-muted">Tracking</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative ml-2">
                    {/* Vertical line */}
                    <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />

                    {[...story.articles]
                      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
                      .map((article, idx) => (
                        <div key={article.id} className="relative mb-3 pl-6 last:mb-0">
                          {/* Dot */}
                          <div
                            className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 ${
                              idx === 0
                                ? "border-primary bg-primary/20"
                                : "border-border bg-bg"
                            }`}
                          />
                          {/* Connection dot for GitCommit icon */}
                          {idx < story.articles.length - 1 && (
                            <GitCommit className="absolute -left-[1px] top-6 h-3.5 w-3.5 text-border opacity-0" />
                          )}

                          <div className="rounded-lg bg-bg p-2.5 transition-colors hover:bg-bg-hover/50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-medium text-text-muted">
                                    {new Date(article.addedAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                  {isNew(article.addedAt) && (
                                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                                      New
                                    </span>
                                  )}
                                </div>
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 block text-xs font-medium text-text hover:text-primary"
                                >
                                  {article.title}
                                </a>
                                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-text-muted">
                                  {article.summary}
                                </p>
                                <span className="mt-1 inline-block text-[10px] text-text-muted">
                                  {article.source}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => toggleArchive(story.id)}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      {story.status === "archived" ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      onClick={() => removeStory(story.id)}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
