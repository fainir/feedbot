"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Trash2,
  Clock,
  ExternalLink,
  Hash,
  Star,
  TrendingUp,
  Play,
  Rocket,
  Code2,
  MessageSquare,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

type PlatformId = "twitter" | "reddit" | "hackernews" | "youtube" | "producthunt" | "github";

interface PlatformDef {
  id: PlatformId;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  exampleInput: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputType: "text" | "select";
  selectOptions?: { value: string; label: string }[];
}

interface MockItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  author?: string;
}

interface ImportedSource {
  id: string;
  platform: PlatformId;
  input: string;
  label: string;
  importedAt: string;
  itemCount: number;
}

// ─── Platform Definitions ───────────────────────────────────────

const PLATFORMS: PlatformDef[] = [
  {
    id: "twitter",
    name: "Twitter / X",
    description: "Import tweets from a user or list",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    exampleInput: "@elonmusk or list URL",
    inputLabel: "Username or List URL",
    inputPlaceholder: "@username or https://x.com/i/lists/...",
    inputType: "text",
  },
  {
    id: "reddit",
    name: "Reddit",
    description: "Follow a subreddit's top posts",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    exampleInput: "r/programming",
    inputLabel: "Subreddit",
    inputPlaceholder: "r/programming",
    inputType: "text",
  },
  {
    id: "hackernews",
    name: "Hacker News",
    description: "Top stories from Y Combinator's HN",
    color: "text-orange-300",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/30",
    exampleInput: "Top, Best, New, Ask HN, Show HN",
    inputLabel: "Feed Type",
    inputPlaceholder: "",
    inputType: "select",
    selectOptions: [
      { value: "top", label: "Top Stories" },
      { value: "best", label: "Best Stories" },
      { value: "new", label: "New Stories" },
      { value: "ask", label: "Ask HN" },
      { value: "show", label: "Show HN" },
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Video feed from a channel",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    exampleInput: "channel URL or name",
    inputLabel: "Channel URL or Name",
    inputPlaceholder: "https://youtube.com/@mkbhd or MKBHD",
    inputType: "text",
  },
  {
    id: "producthunt",
    name: "Product Hunt",
    description: "Daily top product launches",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    exampleInput: "Daily top products (no input needed)",
    inputLabel: "Feed",
    inputPlaceholder: "",
    inputType: "select",
    selectOptions: [
      { value: "daily", label: "Daily Top Products" },
    ],
  },
  {
    id: "github",
    name: "GitHub Trending",
    description: "Trending repos by language",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    exampleInput: "TypeScript, Python, Rust...",
    inputLabel: "Language (optional)",
    inputPlaceholder: "TypeScript",
    inputType: "text",
  },
];

// ─── Platform SVG Icons ─────────────────────────────────────────

function PlatformIcon({ platform, size = 20 }: { platform: PlatformId; size?: number }) {
  const s = size;
  switch (platform) {
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "reddit":
      return (
        <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    case "hackernews":
      return (
        <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor">
          <path d="M0 0v24h24V0H0zm11.09 13.11V18h1.82v-4.89L17.1 6h-2.04l-3.06 5.61L8.94 6H6.9l4.19 7.11z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "producthunt":
      return (
        <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor">
          <path d="M13.604 8.4h-3.405V12h3.405a1.8 1.8 0 0 0 0-3.6zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H8.4V6h5.204a4.2 4.2 0 0 1 0 8.4z" />
        </svg>
      );
    case "github":
      return (
        <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
  }
}

// ─── Mock Data Generators ───────────────────────────────────────

function generateMockItems(platform: PlatformId, input: string): MockItem[] {
  const now = new Date();
  const ago = (hours: number) => new Date(now.getTime() - hours * 3600000).toISOString();

  switch (platform) {
    case "twitter": {
      const user = input.replace(/^@/, "").replace(/https?:\/\/(x|twitter)\.com\//, "").split("/")[0] || "user";
      return [
        { id: `tw-1-${Date.now()}`, title: `Just shipped a major update to our platform. Threading is now 10x faster.`, summary: `@${user} announced a significant performance improvement to their platform's threading system, claiming a 10x speed increase.`, source: `@${user} on X`, url: `https://x.com/${user}/status/1`, publishedAt: ago(1), author: `@${user}` },
        { id: `tw-2-${Date.now()}`, title: `Hot take: AI-generated code will be 80% of all new code by 2027`, summary: `@${user} shared a bold prediction about the future of software development, sparking debate in the replies.`, source: `@${user} on X`, url: `https://x.com/${user}/status/2`, publishedAt: ago(3), author: `@${user}` },
        { id: `tw-3-${Date.now()}`, title: `We're hiring senior engineers. Remote-first, competitive comp. DMs open.`, summary: `@${user} posted about open engineering positions at their company with remote work options.`, source: `@${user} on X`, url: `https://x.com/${user}/status/3`, publishedAt: ago(6), author: `@${user}` },
        { id: `tw-4-${Date.now()}`, title: `Thread: 7 lessons I learned from scaling to 1M users`, summary: `@${user} shared a detailed thread about scaling challenges and lessons learned while growing to one million users.`, source: `@${user} on X`, url: `https://x.com/${user}/status/4`, publishedAt: ago(12), author: `@${user}` },
      ];
    }
    case "reddit": {
      const sub = input.replace(/^r\//, "") || "programming";
      return [
        { id: `rd-1-${Date.now()}`, title: `Why I switched from TypeScript to Go for our backend (and back again)`, summary: `A detailed post about the tradeoffs of switching languages mid-project, with benchmarks and team productivity metrics.`, source: `r/${sub}`, url: `https://reddit.com/r/${sub}/comments/abc1`, publishedAt: ago(2), author: "u/dev_wanderer" },
        { id: `rd-2-${Date.now()}`, title: `PSA: Critical vulnerability found in popular npm package`, summary: `Community alert about a supply chain attack affecting a widely-used package with over 2M weekly downloads.`, source: `r/${sub}`, url: `https://reddit.com/r/${sub}/comments/abc2`, publishedAt: ago(4), author: "u/security_hawk" },
        { id: `rd-3-${Date.now()}`, title: `I built a CLI tool that generates API docs from your codebase`, summary: `Show-off post presenting a new open-source tool that automatically generates OpenAPI specs from code annotations.`, source: `r/${sub}`, url: `https://reddit.com/r/${sub}/comments/abc3`, publishedAt: ago(8), author: "u/toolsmith99" },
        { id: `rd-4-${Date.now()}`, title: `Unpopular opinion: Unit tests are overrated, integration tests are king`, summary: `A controversial take that triggered a lively discussion about testing strategies and best practices.`, source: `r/${sub}`, url: `https://reddit.com/r/${sub}/comments/abc4`, publishedAt: ago(14), author: "u/test_skeptic" },
      ];
    }
    case "hackernews": {
      const labelMap: Record<string, string> = { top: "Top", best: "Best", new: "New", ask: "Ask HN", show: "Show HN" };
      const label = labelMap[input] || "Top";
      return [
        { id: `hn-1-${Date.now()}`, title: `Show HN: I built a search engine that respects your privacy`, summary: `A new privacy-focused search engine that doesn't track queries or build user profiles. Uses its own crawler.`, source: `Hacker News (${label})`, url: `https://news.ycombinator.com/item?id=1001`, publishedAt: ago(1) },
        { id: `hn-2-${Date.now()}`, title: `SQLite is the only database you need for most applications`, summary: `Article arguing that SQLite is sufficient for the vast majority of web applications, with performance benchmarks.`, source: `Hacker News (${label})`, url: `https://news.ycombinator.com/item?id=1002`, publishedAt: ago(3) },
        { id: `hn-3-${Date.now()}`, title: `The unreasonable effectiveness of plain text files`, summary: `An essay about why plain text remains the most durable, portable, and useful format for storing information.`, source: `Hacker News (${label})`, url: `https://news.ycombinator.com/item?id=1003`, publishedAt: ago(5) },
        { id: `hn-4-${Date.now()}`, title: `Reverse-engineering the new Apple M4 chip architecture`, summary: `Deep technical dive into the M4 chip's microarchitecture, cache hierarchy, and neural engine improvements.`, source: `Hacker News (${label})`, url: `https://news.ycombinator.com/item?id=1004`, publishedAt: ago(10) },
      ];
    }
    case "youtube": {
      const channel = input.replace(/^https?:\/\/(www\.)?youtube\.com\/@?/, "").replace(/\/.*/, "") || "channel";
      return [
        { id: `yt-1-${Date.now()}`, title: `I Tried Every AI Coding Tool So You Don't Have To`, summary: `Comprehensive comparison of Copilot, Cursor, Claude Code, and other AI coding assistants with real-world benchmarks.`, source: `${channel} on YouTube`, url: `https://youtube.com/watch?v=abc1`, publishedAt: ago(2), author: channel },
        { id: `yt-2-${Date.now()}`, title: `The Future of Web Development in 2026`, summary: `A look at emerging web technologies, frameworks, and patterns that are shaping the future of web development.`, source: `${channel} on YouTube`, url: `https://youtube.com/watch?v=abc2`, publishedAt: ago(24), author: channel },
        { id: `yt-3-${Date.now()}`, title: `Building a Full-Stack App in 30 Minutes`, summary: `Speed-run of building a complete application using modern tools and frameworks, from setup to deployment.`, source: `${channel} on YouTube`, url: `https://youtube.com/watch?v=abc3`, publishedAt: ago(72), author: channel },
      ];
    }
    case "producthunt":
      return [
        { id: `ph-1-${Date.now()}`, title: `LaunchPad AI - Your startup co-pilot from idea to launch`, summary: `AI-powered tool that helps founders validate ideas, generate landing pages, and create go-to-market strategies.`, source: "Product Hunt", url: `https://producthunt.com/posts/launchpad-ai`, publishedAt: ago(2) },
        { id: `ph-2-${Date.now()}`, title: `PixelSnap 3.0 - Measure anything on your screen, instantly`, summary: `Major update to the popular measurement tool with new AI-powered element detection and comparison features.`, source: "Product Hunt", url: `https://producthunt.com/posts/pixelsnap-3`, publishedAt: ago(4) },
        { id: `ph-3-${Date.now()}`, title: `NoteGraph - Turn your notes into an interactive knowledge graph`, summary: `A note-taking app that automatically builds connections between your notes and visualizes them as an interactive graph.`, source: "Product Hunt", url: `https://producthunt.com/posts/notegraph`, publishedAt: ago(6) },
        { id: `ph-4-${Date.now()}`, title: `DevDash - A customizable dashboard for developers`, summary: `All-in-one developer dashboard combining GitHub activity, CI/CD status, error tracking, and productivity metrics.`, source: "Product Hunt", url: `https://producthunt.com/posts/devdash`, publishedAt: ago(8) },
      ];
    case "github": {
      const lang = input || "All Languages";
      return [
        { id: `gh-1-${Date.now()}`, title: `open-sauce/mega-framework - A next-gen full-stack framework`, summary: `New framework combining server components, edge computing, and built-in auth. 2.3k stars this week.`, source: `GitHub Trending (${lang})`, url: `https://github.com/open-sauce/mega-framework`, publishedAt: ago(1) },
        { id: `gh-2-${Date.now()}`, title: `ai-labs/neural-search - Semantic search engine in 500 lines`, summary: `Minimal implementation of a semantic search engine using embeddings. Great for learning and small projects.`, source: `GitHub Trending (${lang})`, url: `https://github.com/ai-labs/neural-search`, publishedAt: ago(3) },
        { id: `gh-3-${Date.now()}`, title: `toolchainz/fast-bundler - 100x faster JS bundler written in Rust`, summary: `A JavaScript bundler that benchmarks at 100x the speed of webpack, with near-complete compatibility.`, source: `GitHub Trending (${lang})`, url: `https://github.com/toolchainz/fast-bundler`, publishedAt: ago(8) },
        { id: `gh-4-${Date.now()}`, title: `devops-pro/kube-lite - Lightweight Kubernetes for edge devices`, summary: `A stripped-down Kubernetes distribution optimized for IoT and edge computing with minimal resource usage.`, source: `GitHub Trending (${lang})`, url: `https://github.com/devops-pro/kube-lite`, publishedAt: ago(16) },
      ];
    }
  }
}

// ─── Lucide icon mapping per platform ───────────────────────────

function PlatformLucideIcon({ platform }: { platform: PlatformId }) {
  switch (platform) {
    case "twitter": return <MessageSquare className="h-3 w-3" />;
    case "reddit": return <Hash className="h-3 w-3" />;
    case "hackernews": return <TrendingUp className="h-3 w-3" />;
    case "youtube": return <Play className="h-3 w-3" />;
    case "producthunt": return <Rocket className="h-3 w-3" />;
    case "github": return <Code2 className="h-3 w-3" />;
  }
}

// ─── Storage ────────────────────────────────────────────────────

const STORAGE_KEY = "feedbot-social-imports";

function loadImports(): ImportedSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveImports(imports: ImportedSource[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(imports));
}

// ─── Main Component ─────────────────────────────────────────────

export function SocialImport() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformDef | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [previewItems, setPreviewItems] = useState<MockItem[]>([]);
  const [imports, setImports] = useState<ImportedSource[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load saved imports on mount
  useEffect(() => {
    setImports(loadImports());
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setSelectedPlatform(null);
    setInputValue("");
    setPreviewItems([]);
  }, []);

  const handleSelectPlatform = useCallback((p: PlatformDef) => {
    setSelectedPlatform(p);
    setInputValue(p.selectOptions?.[0]?.value || "");
    setStep(2);
  }, []);

  const handlePreview = useCallback(() => {
    if (!selectedPlatform) return;
    const items = generateMockItems(selectedPlatform.id, inputValue);
    setPreviewItems(items);
    setStep(3);
  }, [selectedPlatform, inputValue]);

  const handleConfirm = useCallback(() => {
    if (!selectedPlatform) return;
    const newImport: ImportedSource = {
      id: `import-${Date.now()}`,
      platform: selectedPlatform.id,
      input: inputValue,
      label: selectedPlatform.name + (inputValue ? `: ${inputValue}` : ""),
      importedAt: new Date().toISOString(),
      itemCount: previewItems.length,
    };
    const updated = [newImport, ...imports];
    setImports(updated);
    saveImports(updated);
    setStep(4);
  }, [selectedPlatform, inputValue, previewItems, imports]);

  const handleDeleteImport = useCallback((id: string) => {
    setImports((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveImports(updated);
      return updated;
    });
  }, []);

  if (!open) {
    return (
      <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-text">Social Feed Import</h3>
            {imports.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {imports.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {imports.length > 0 && (
              <button
                onClick={() => { setOpen(true); setShowHistory(true); }}
                className="text-[11px] text-text-muted transition-colors hover:text-text"
              >
                History
              </button>
            )}
            <button
              onClick={() => { setOpen(true); setShowHistory(false); reset(); }}
              className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              Import Feed
            </button>
          </div>
        </div>

        {/* Quick badges of imported sources */}
        {imports.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {imports.slice(0, 6).map((imp) => {
              const p = PLATFORMS.find((pl) => pl.id === imp.platform)!;
              return (
                <span
                  key={imp.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${p.bgColor} ${p.borderColor} ${p.color}`}
                >
                  <PlatformLucideIcon platform={imp.platform} />
                  {imp.input || imp.platform}
                </span>
              );
            })}
            {imports.length > 6 && (
              <span className="text-[10px] text-text-muted">+{imports.length - 6} more</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">
            {showHistory ? "Import History" : "Import Social Feed"}
          </h3>
        </div>
        <button
          onClick={() => { setOpen(false); setShowHistory(false); reset(); }}
          className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* History view */}
      {showHistory && (
        <div className="space-y-2">
          {imports.length === 0 ? (
            <p className="py-6 text-center text-xs text-text-muted">No imports yet</p>
          ) : (
            imports.map((imp) => {
              const p = PLATFORMS.find((pl) => pl.id === imp.platform)!;
              return (
                <div
                  key={imp.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-bg p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.bgColor} ${p.color}`}>
                      <PlatformIcon platform={imp.platform} size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text">{imp.label}</p>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(imp.importedAt).toLocaleDateString()}
                        </span>
                        <span>{imp.itemCount} items</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteImport(imp.id)}
                    className="rounded p-1 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
          <button
            onClick={() => { setShowHistory(false); reset(); }}
            className="mt-2 w-full rounded-lg bg-primary/10 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            Import New Feed
          </button>
        </div>
      )}

      {/* Import flow */}
      {!showHistory && (
        <>
          {/* Step indicators */}
          <div className="mb-4 flex items-center gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                    step >= s
                      ? "bg-primary text-white"
                      : "bg-bg-hover text-text-muted"
                  }`}
                >
                  {step > s ? <Check className="h-3 w-3" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`h-px w-6 transition-colors ${
                      step > s ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
            <span className="ml-2 text-[10px] text-text-muted">
              {step === 1 && "Select platform"}
              {step === 2 && "Enter details"}
              {step === 3 && "Preview items"}
              {step === 4 && "Done!"}
            </span>
          </div>

          {/* Step 1: Platform grid */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPlatform(p)}
                  className={`group flex flex-col items-start gap-2 rounded-lg border border-border bg-bg p-3 text-left transition-all hover:border-primary/50 hover:bg-bg-hover`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.bgColor} ${p.color} transition-transform group-hover:scale-110`}>
                    <PlatformIcon platform={p.id} size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text">{p.name}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-text-muted">{p.description}</p>
                  </div>
                  <p className="text-[9px] text-text-muted/60">e.g. {p.exampleInput}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Input details */}
          {step === 2 && selectedPlatform && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${selectedPlatform.bgColor} ${selectedPlatform.color}`}>
                  <PlatformIcon platform={selectedPlatform.id} size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text">{selectedPlatform.name}</p>
                  <p className="text-[10px] text-text-muted">{selectedPlatform.description}</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-muted">
                  {selectedPlatform.inputLabel}
                </label>
                {selectedPlatform.inputType === "select" ? (
                  <select
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text outline-none transition-colors focus:border-primary"
                  >
                    {selectedPlatform.selectOptions!.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={selectedPlatform.inputPlaceholder}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-muted/50 outline-none transition-colors focus:border-primary"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
                <button
                  onClick={handlePreview}
                  disabled={selectedPlatform.inputType === "text" && !inputValue.trim()}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Preview
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && selectedPlatform && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-text-muted">
                  Showing {previewItems.length} sample items from{" "}
                  <span className={selectedPlatform.color}>{selectedPlatform.name}</span>
                </p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${selectedPlatform.bgColor} ${selectedPlatform.borderColor} ${selectedPlatform.color}`}>
                  <PlatformLucideIcon platform={selectedPlatform.id} />
                  {inputValue || selectedPlatform.name}
                </span>
              </div>

              <div className="max-h-56 space-y-2 overflow-y-auto">
                {previewItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-bg p-2.5 transition-colors hover:bg-bg-hover/50"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${selectedPlatform.bgColor} ${selectedPlatform.color}`}>
                        <PlatformIcon platform={selectedPlatform.id} size={10} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug text-text">{item.title}</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-text-muted line-clamp-2">
                          {item.summary}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[9px] text-text-muted/70">
                          <span>{item.source}</span>
                          {item.author && <span>by {item.author}</span>}
                          <span>{new Date(item.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <Check className="h-3 w-3" />
                  Import Feed
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && selectedPlatform && (
            <div className="py-4 text-center">
              <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${selectedPlatform.bgColor}`}>
                <Check className={`h-6 w-6 ${selectedPlatform.color}`} />
              </div>
              <p className="text-sm font-semibold text-text">Feed Imported!</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {previewItems.length} items from{" "}
                <span className={selectedPlatform.color}>{selectedPlatform.name}</span>
                {inputValue ? ` (${inputValue})` : ""} have been added.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={reset}
                  className="rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-border"
                >
                  Import Another
                </button>
                <button
                  onClick={() => { setOpen(false); reset(); }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Button Trigger ─────────────────────────────────────────────

export function SocialImportButton() {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-20 backdrop-blur-sm" onClick={() => setOpen(false)}>
        <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
          <SocialImportInline onClose={() => setOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
      title="Import social feed"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Import</span>
    </button>
  );
}

// ─── Inline variant used by the button modal ────────────────────

function SocialImportInline({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformDef | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [previewItems, setPreviewItems] = useState<MockItem[]>([]);
  const [imports, setImports] = useState<ImportedSource[]>([]);

  useEffect(() => {
    setImports(loadImports());
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setSelectedPlatform(null);
    setInputValue("");
    setPreviewItems([]);
  }, []);

  const handleSelectPlatform = useCallback((p: PlatformDef) => {
    setSelectedPlatform(p);
    setInputValue(p.selectOptions?.[0]?.value || "");
    setStep(2);
  }, []);

  const handlePreview = useCallback(() => {
    if (!selectedPlatform) return;
    setPreviewItems(generateMockItems(selectedPlatform.id, inputValue));
    setStep(3);
  }, [selectedPlatform, inputValue]);

  const handleConfirm = useCallback(() => {
    if (!selectedPlatform) return;
    const newImport: ImportedSource = {
      id: `import-${Date.now()}`,
      platform: selectedPlatform.id,
      input: inputValue,
      label: selectedPlatform.name + (inputValue ? `: ${inputValue}` : ""),
      importedAt: new Date().toISOString(),
      itemCount: previewItems.length,
    };
    const updated = [newImport, ...imports];
    setImports(updated);
    saveImports(updated);
    setStep(4);
  }, [selectedPlatform, inputValue, previewItems, imports]);

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 shadow-xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Import Social Feed</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step indicators */}
      <div className="mb-4 flex items-center gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                step >= s ? "bg-primary text-white" : "bg-bg-hover text-text-muted"
              }`}
            >
              {step > s ? <Check className="h-3 w-3" /> : s}
            </div>
            {s < 4 && (
              <div className={`h-px w-6 transition-colors ${step > s ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
        <span className="ml-2 text-[10px] text-text-muted">
          {step === 1 && "Select platform"}
          {step === 2 && "Enter details"}
          {step === 3 && "Preview items"}
          {step === 4 && "Done!"}
        </span>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPlatform(p)}
              className="group flex flex-col items-start gap-2 rounded-lg border border-border bg-bg p-3 text-left transition-all hover:border-primary/50 hover:bg-bg-hover"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.bgColor} ${p.color} transition-transform group-hover:scale-110`}>
                <PlatformIcon platform={p.id} size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-text">{p.name}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-text-muted">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && selectedPlatform && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${selectedPlatform.bgColor} ${selectedPlatform.color}`}>
              <PlatformIcon platform={selectedPlatform.id} size={16} />
            </div>
            <p className="text-xs font-semibold text-text">{selectedPlatform.name}</p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-muted">{selectedPlatform.inputLabel}</label>
            {selectedPlatform.inputType === "select" ? (
              <select
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text outline-none focus:border-primary"
              >
                {selectedPlatform.selectOptions!.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={selectedPlatform.inputPlaceholder}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder:text-text-muted/50 outline-none focus:border-primary"
                autoFocus
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text">
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            <button
              onClick={handlePreview}
              disabled={selectedPlatform.inputType === "text" && !inputValue.trim()}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Preview <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && selectedPlatform && (
        <div className="space-y-3">
          <p className="text-[11px] text-text-muted">
            {previewItems.length} items from <span className={selectedPlatform.color}>{selectedPlatform.name}</span>
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {previewItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-bg p-2.5">
                <p className="text-xs font-medium text-text">{item.title}</p>
                <p className="mt-0.5 text-[10px] text-text-muted line-clamp-2">{item.summary}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text">
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            <button onClick={handleConfirm} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90">
              <Check className="h-3 w-3" /> Import Feed
            </button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && selectedPlatform && (
        <div className="py-4 text-center">
          <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${selectedPlatform.bgColor}`}>
            <Check className={`h-6 w-6 ${selectedPlatform.color}`} />
          </div>
          <p className="text-sm font-semibold text-text">Feed Imported!</p>
          <p className="mt-1 text-[11px] text-text-muted">
            {previewItems.length} items from <span className={selectedPlatform.color}>{selectedPlatform.name}</span> added.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button onClick={reset} className="rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-medium text-text hover:bg-border">
              Import Another
            </button>
            <button onClick={onClose} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
