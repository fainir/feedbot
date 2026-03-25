"use client";

import { useState, useMemo } from "react";
import { Shield, ShieldCheck, ShieldAlert, Star, BarChart3, ChevronDown, ChevronUp, X, ArrowLeftRight } from "lucide-react";

// --- Data & Heuristics ---

interface SourceProfile {
  domain: string;
  name: string;
  score: number;
  bias: "Left" | "Center-Left" | "Center" | "Center-Right" | "Right";
  tags: string[];
}

const KNOWN_SOURCES: Record<string, Omit<SourceProfile, "domain">> = {
  "reuters.com": { name: "Reuters", score: 97, bias: "Center", tags: ["Original Reporting"] },
  "apnews.com": { name: "AP News", score: 96, bias: "Center", tags: ["Original Reporting"] },
  "bbc.com": { name: "BBC", score: 95, bias: "Center", tags: ["Original Reporting"] },
  "nytimes.com": { name: "The New York Times", score: 95, bias: "Center-Left", tags: ["Original Reporting", "Analysis"] },
  "nature.com": { name: "Nature", score: 98, bias: "Center", tags: ["Original Reporting"] },
  "washingtonpost.com": { name: "Washington Post", score: 90, bias: "Center-Left", tags: ["Original Reporting", "Analysis"] },
  "wsj.com": { name: "Wall Street Journal", score: 92, bias: "Center-Right", tags: ["Original Reporting", "Analysis"] },
  "economist.com": { name: "The Economist", score: 91, bias: "Center", tags: ["Analysis"] },
  "theguardian.com": { name: "The Guardian", score: 88, bias: "Center-Left", tags: ["Original Reporting", "Analysis"] },
  "techcrunch.com": { name: "TechCrunch", score: 86, bias: "Center", tags: ["Original Reporting", "Blog"] },
  "theverge.com": { name: "The Verge", score: 85, bias: "Center-Left", tags: ["Original Reporting", "Analysis"] },
  "arstechnica.com": { name: "Ars Technica", score: 87, bias: "Center", tags: ["Original Reporting", "Analysis"] },
  "wired.com": { name: "Wired", score: 84, bias: "Center-Left", tags: ["Analysis"] },
  "bloomberg.com": { name: "Bloomberg", score: 90, bias: "Center", tags: ["Original Reporting", "Analysis"] },
  "foxnews.com": { name: "Fox News", score: 62, bias: "Right", tags: ["Analysis", "Aggregator"] },
  "cnn.com": { name: "CNN", score: 75, bias: "Center-Left", tags: ["Original Reporting", "Aggregator"] },
  "buzzfeednews.com": { name: "BuzzFeed News", score: 68, bias: "Left", tags: ["Aggregator", "Blog"] },
  "breitbart.com": { name: "Breitbart", score: 45, bias: "Right", tags: ["Blog", "Aggregator"] },
  "medium.com": { name: "Medium", score: 55, bias: "Center", tags: ["Blog"] },
  "substack.com": { name: "Substack", score: 58, bias: "Center", tags: ["Blog"] },
  "prnewswire.com": { name: "PR Newswire", score: 50, bias: "Center", tags: ["Press Release"] },
  "businesswire.com": { name: "Business Wire", score: 50, bias: "Center", tags: ["Press Release"] },
};

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}

function getSourceProfile(domain: string): SourceProfile {
  const known = KNOWN_SOURCES[domain];
  if (known) return { domain, ...known };

  // Heuristic scoring for unknown sources
  let score = 60;
  const tags: string[] = [];

  // Domain age heuristic: shorter, well-known TLDs score higher
  if (domain.endsWith(".edu")) { score += 15; tags.push("Analysis"); }
  else if (domain.endsWith(".gov")) { score += 20; tags.push("Original Reporting"); }
  else if (domain.endsWith(".org")) { score += 5; tags.push("Analysis"); }

  // Known blog platforms
  if (domain.includes("blogspot") || domain.includes("wordpress")) {
    score -= 10;
    tags.push("Blog");
  }

  if (tags.length === 0) tags.push("Aggregator");

  return {
    domain,
    name: domain.replace(/\.\w+$/, "").replace(/[.-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: Math.max(10, Math.min(100, score)),
    bias: "Center",
    tags,
  };
}

function getTrustLevel(score: number): { label: string; color: string; ringColor: string } {
  if (score >= 80) return { label: "Highly Trusted", color: "text-green-400", ringColor: "text-green-400" };
  if (score >= 65) return { label: "Trusted", color: "text-emerald-400", ringColor: "text-emerald-400" };
  if (score >= 50) return { label: "Moderate", color: "text-yellow-400", ringColor: "text-yellow-400" };
  return { label: "Use Caution", color: "text-red-400", ringColor: "text-red-400" };
}

function getBiasPosition(bias: string): number {
  const map: Record<string, number> = { "Left": 0, "Center-Left": 25, "Center": 50, "Center-Right": 75, "Right": 100 };
  return map[bias] ?? 50;
}

// --- Interfaces ---

interface SourceItem {
  url: string;
  source: string;
}

interface SourceCredibilityProps {
  items: SourceItem[];
  /** Map of domain -> number of articles user has read from that source */
  readCounts?: Record<string, number>;
}

// --- Components ---

function TrustRing({ score, size = 40 }: { score: number; size?: number }) {
  const { ringColor } = getTrustLevel(score);
  const r = (size / 2) - 3;
  const circumference = 2 * Math.PI * r;
  const progress = score / 100;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-border"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={`${progress * circumference} ${circumference}`}
          strokeLinecap="round"
          className={ringColor}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-text">{score}</span>
      </div>
    </div>
  );
}

function BiasBar({ bias }: { bias: string }) {
  const pos = getBiasPosition(bias);
  const labels = ["Left", "Center-Left", "Center", "Center-Right", "Right"];

  return (
    <div className="w-full">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-500 via-gray-400 to-red-500">
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-text shadow-sm dark:border-bg"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between">
        {labels.map((l) => (
          <span
            key={l}
            className={`text-[8px] ${l === bias ? "font-bold text-text" : "text-text-muted"}`}
          >
            {l === "Center-Left" ? "C-L" : l === "Center-Right" ? "C-R" : l}
          </span>
        ))}
      </div>
    </div>
  );
}

function SourceCard({
  profile,
  articleCount,
  readCount,
}: {
  profile: SourceProfile;
  articleCount: number;
  readCount: number;
}) {
  const { label, color } = getTrustLevel(profile.score);

  return (
    <div className="rounded-lg bg-bg p-3 transition-colors hover:bg-bg-hover/50">
      <div className="flex items-start gap-3">
        {/* Favicon + Trust ring */}
        <TrustRing score={profile.score} size={40} />

        <div className="min-w-0 flex-1">
          {/* Name + badge */}
          <div className="flex items-center gap-2">
            <img
              src={`https://www.google.com/s2/favicons?domain=${profile.domain}&sz=16`}
              alt=""
              className="h-4 w-4 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="truncate text-sm font-medium text-text">{profile.name}</span>
            <span className={`text-[10px] font-medium ${color}`}>{label}</span>
          </div>

          {/* Stats row */}
          <div className="mt-1 flex items-center gap-3 text-[10px] text-text-muted">
            <span>{articleCount} article{articleCount !== 1 ? "s" : ""}</span>
            <span className="text-border">|</span>
            <span>Read {readCount}x</span>
          </div>

          {/* Tags */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {profile.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Bias */}
          <div className="mt-2">
            <BiasBar bias={profile.bias} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceComparisonPanel({
  sources,
  onClose,
}: {
  sources: SourceProfile[];
  onClose: () => void;
}) {
  const [leftDomain, setLeftDomain] = useState(sources[0]?.domain || "");
  const [rightDomain, setRightDomain] = useState(sources[1]?.domain || "");

  const left = sources.find((s) => s.domain === leftDomain);
  const right = sources.find((s) => s.domain === rightDomain);

  return (
    <div className="mt-3 rounded-lg border border-border bg-bg p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-text">Compare Sources</span>
        <button onClick={onClose} className="rounded-lg p-1 text-text-muted hover:text-text">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={leftDomain}
          onChange={(e) => setLeftDomain(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
        >
          {sources.map((s) => (
            <option key={s.domain} value={s.domain}>{s.name}</option>
          ))}
        </select>
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-text-muted" />
        <select
          value={rightDomain}
          onChange={(e) => setRightDomain(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
        >
          {sources.map((s) => (
            <option key={s.domain} value={s.domain}>{s.name}</option>
          ))}
        </select>
      </div>

      {left && right && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[left, right].map((s) => {
            const { label, color } = getTrustLevel(s.score);
            return (
              <div key={s.domain} className="rounded-lg bg-bg-hover/30 p-2.5 text-center">
                <TrustRing score={s.score} size={48} />
                <p className="mt-1.5 text-xs font-medium text-text">{s.name}</p>
                <p className={`text-[10px] font-medium ${color}`}>{label}</p>
                <div className="mt-2">
                  <BiasBar bias={s.bias} />
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type SortKey = "score" | "name" | "articles";

export function SourceCredibility({ items, readCounts = {} }: SourceCredibilityProps) {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [showComparison, setShowComparison] = useState(false);

  // Aggregate sources from items
  const sourcesData = useMemo(() => {
    const domainMap = new Map<string, number>();
    for (const item of items) {
      const domain = extractDomain(item.url || "");
      if (domain) domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
    }

    const profiles: (SourceProfile & { articleCount: number; readCount: number })[] = [];
    for (const [domain, count] of domainMap) {
      profiles.push({
        ...getSourceProfile(domain),
        articleCount: count,
        readCount: readCounts[domain] || 0,
      });
    }

    return profiles;
  }, [items, readCounts]);

  const sorted = useMemo(() => {
    const list = [...sourcesData];
    if (sortBy === "score") list.sort((a, b) => b.score - a.score);
    else if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "articles") list.sort((a, b) => b.articleCount - a.articleCount);
    return list;
  }, [sourcesData, sortBy]);

  const avgScore = useMemo(() => {
    if (sourcesData.length === 0) return 0;
    return Math.round(sourcesData.reduce((sum, s) => sum + s.score, 0) / sourcesData.length);
  }, [sourcesData]);

  const { label: avgLabel, color: avgColor } = getTrustLevel(avgScore);

  if (sourcesData.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
          <ShieldCheck className="h-4 w-4 text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text">Source Trust</h3>
            <span className={`text-[10px] font-medium ${avgColor}`}>
              Avg: {avgScore} ({avgLabel})
            </span>
          </div>
          <p className="text-[10px] text-text-muted">
            {sourcesData.length} source{sourcesData.length !== 1 ? "s" : ""} in your feed
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Top sources preview (always visible) */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto">
        {sorted.slice(0, 5).map((s) => (
          <div
            key={s.domain}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-bg px-2.5 py-1"
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=16`}
              alt=""
              className="h-3 w-3 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-[10px] font-medium text-text">{s.name}</span>
            <span className={`text-[10px] font-bold ${getTrustLevel(s.score).color}`}>{s.score}</span>
          </div>
        ))}
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {/* Sort controls */}
          <div className="mb-3 flex items-center gap-1">
            <span className="text-[10px] text-text-muted">Sort:</span>
            {(["score", "name", "articles"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  sortBy === key
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {key === "score" ? "Trust Score" : key === "name" ? "Name" : "Articles"}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => setShowComparison((v) => !v)}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-text-muted transition-colors hover:text-primary"
            >
              <ArrowLeftRight className="h-3 w-3" />
              Compare
            </button>
          </div>

          {/* Comparison panel */}
          {showComparison && sourcesData.length >= 2 && (
            <SourceComparisonPanel
              sources={sorted}
              onClose={() => setShowComparison(false)}
            />
          )}

          {/* Source list */}
          <div className="space-y-2">
            {sorted.map((s) => (
              <SourceCard
                key={s.domain}
                profile={s}
                articleCount={s.articleCount}
                readCount={s.readCount}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Small inline badge for article lists — shows source trust level next to source name. */
export function SourceTrustBadge({ domain }: { domain: string }) {
  const profile = getSourceProfile(domain);
  const { label, color } = getTrustLevel(profile.score);

  const Icon = profile.score >= 80 ? ShieldCheck : profile.score >= 50 ? Shield : ShieldAlert;

  return (
    <span className={`inline-flex items-center gap-0.5 ${color}`} title={`${label} (${profile.score}/100)`}>
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-medium">{profile.score}</span>
    </span>
  );
}

/** Trust indicator with label — slightly larger, for article detail views. */
export function SourceTrustIndicator({ domain }: { domain: string }) {
  const profile = getSourceProfile(domain);
  const { label, color } = getTrustLevel(profile.score);

  const Icon = profile.score >= 80 ? ShieldCheck : profile.score >= 50 ? Shield : ShieldAlert;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-bg px-2 py-0.5">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-[10px] font-medium text-text">{profile.name}</span>
      <span className={`text-[10px] font-bold ${color}`}>{profile.score}</span>
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}
