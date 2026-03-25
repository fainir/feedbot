"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  Zap,
  Coffee,
  Briefcase,
  Brain,
  Plus,
  X,
  Play,
  Pause,
  ChevronRight,
  Music,
  Palette,
} from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
}

interface MoodPreset {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  gradientText: string;
  keywords: string[];
  custom?: boolean;
}

interface CustomPlaylist {
  id: string;
  name: string;
  keywords: string[];
  gradient: string;
}

interface MoodPlaylistsProps {
  items: FeedItem[];
}

interface MoodPlaylistBarProps {
  items: FeedItem[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  BookOpen,
  Zap,
  Coffee,
  Briefcase,
  Brain,
  Palette,
};

const PRESET_MOODS: MoodPreset[] = [
  {
    id: "inspiring",
    name: "Inspiring",
    icon: "Sparkles",
    gradient: "from-orange-400 to-rose-500",
    gradientText: "text-orange-100",
    keywords: ["breakthrough", "innovation", "achievement", "milestone", "inspiring", "transform", "remarkable", "pioneer"],
  },
  {
    id: "deep-dive",
    name: "Deep Dive",
    icon: "BookOpen",
    gradient: "from-blue-500 to-indigo-600",
    gradientText: "text-blue-100",
    keywords: ["technical", "research", "analysis", "comprehensive", "in-depth", "study", "framework", "architecture"],
  },
  {
    id: "quick-bites",
    name: "Quick Bites",
    icon: "Zap",
    gradient: "from-yellow-400 to-amber-500",
    gradientText: "text-yellow-100",
    keywords: ["update", "brief", "summary", "announce", "launch", "release", "news", "report"],
  },
  {
    id: "relaxing",
    name: "Relaxing",
    icon: "Coffee",
    gradient: "from-emerald-400 to-teal-500",
    gradientText: "text-emerald-100",
    keywords: ["lifestyle", "design", "culture", "creative", "art", "craft", "story", "journey"],
  },
  {
    id: "business-intel",
    name: "Business Intel",
    icon: "Briefcase",
    gradient: "from-slate-400 to-slate-600",
    gradientText: "text-slate-100",
    keywords: ["market", "funding", "strategy", "revenue", "growth", "investment", "acquisition", "startup"],
  },
  {
    id: "mind-expanding",
    name: "Mind Expanding",
    icon: "Brain",
    gradient: "from-purple-400 to-violet-600",
    gradientText: "text-purple-100",
    keywords: ["science", "philosophy", "space", "quantum", "discovery", "theory", "consciousness", "universe"],
  },
];

const STORAGE_KEY = "feedbot-mood-playlists";

function loadCustomPlaylists(): CustomPlaylist[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveCustomPlaylists(playlists: CustomPlaylist[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch {}
}

function scoreItem(item: FeedItem, keywords: string[]): number {
  let score = 0;
  const text = `${item.title} ${item.summary}`.toLowerCase();
  for (const keyword of keywords) {
    const re = new RegExp(keyword.toLowerCase(), "g");
    const matches = text.match(re);
    if (matches) {
      // Title matches are worth more
      const titleMatches = item.title.toLowerCase().match(re);
      score += matches.length + (titleMatches ? titleMatches.length * 2 : 0);
    }
  }
  return score;
}

function getMatchingItems(items: FeedItem[], keywords: string[]): (FeedItem & { score: number })[] {
  return items
    .map((item) => ({ ...item, score: scoreItem(item, keywords) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

const CUSTOM_GRADIENTS = [
  "from-pink-400 to-fuchsia-500",
  "from-cyan-400 to-blue-500",
  "from-lime-400 to-green-500",
  "from-red-400 to-orange-500",
  "from-indigo-400 to-purple-500",
  "from-teal-400 to-cyan-500",
];

export function MoodPlaylists({ items }: MoodPlaylistsProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlayIndex, setAutoPlayIndex] = useState(0);
  const [newName, setNewName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newGradient, setNewGradient] = useState(CUSTOM_GRADIENTS[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load custom playlists
  useEffect(() => {
    setCustomPlaylists(loadCustomPlaylists());
  }, []);

  // Build combined mood list
  const allMoods: MoodPreset[] = useMemo(() => {
    const customs: MoodPreset[] = customPlaylists.map((cp) => ({
      id: cp.id,
      name: cp.name,
      icon: "Palette",
      gradient: cp.gradient,
      gradientText: "text-white",
      keywords: cp.keywords,
      custom: true,
    }));
    return [...PRESET_MOODS, ...customs];
  }, [customPlaylists]);

  // Get current mood data
  const activeMood = allMoods.find((m) => m.id === selectedMood) ?? null;

  const matchedItems = useMemo(() => {
    if (!activeMood) return [];
    return getMatchingItems(items, activeMood.keywords);
  }, [items, activeMood]);

  // Counts per mood for badges
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const mood of allMoods) {
      counts[mood.id] = items.filter((item) => scoreItem(item, mood.keywords) > 0).length;
    }
    return counts;
  }, [items, allMoods]);

  // Auto-play: cycle through articles
  useEffect(() => {
    if (autoPlay && matchedItems.length > 0) {
      autoPlayTimer.current = setInterval(() => {
        setAutoPlayIndex((prev) => (prev + 1) % matchedItems.length);
      }, 5000);
    }
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [autoPlay, matchedItems.length]);

  const handleCreatePlaylist = useCallback(() => {
    if (!newName.trim() || !newKeywords.trim()) return;
    const playlist: CustomPlaylist = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      keywords: newKeywords.split(",").map((k) => k.trim()).filter(Boolean),
      gradient: newGradient,
    };
    const updated = [...customPlaylists, playlist];
    setCustomPlaylists(updated);
    saveCustomPlaylists(updated);
    setNewName("");
    setNewKeywords("");
    setShowCreate(false);
    setSelectedMood(playlist.id);
  }, [newName, newKeywords, newGradient, customPlaylists]);

  const handleDeleteCustom = useCallback(
    (id: string) => {
      const updated = customPlaylists.filter((p) => p.id !== id);
      setCustomPlaylists(updated);
      saveCustomPlaylists(updated);
      if (selectedMood === id) setSelectedMood(null);
    },
    [customPlaylists, selectedMood]
  );

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10">
            <Music className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-text">Mood Playlists</h3>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          <Plus className="h-3 w-3" />
          Custom
        </button>
      </div>

      {/* Horizontal scrollable mood cards */}
      <div
        ref={scrollRef}
        className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      >
        {allMoods.map((mood) => {
          const Icon = ICON_MAP[mood.icon] ?? Sparkles;
          const isActive = selectedMood === mood.id;
          const count = moodCounts[mood.id] || 0;
          return (
            <button
              key={mood.id}
              onClick={() => {
                setSelectedMood(isActive ? null : mood.id);
                setAutoPlay(false);
                setAutoPlayIndex(0);
              }}
              className={`group relative flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-4 py-3 transition-all ${
                isActive
                  ? `bg-gradient-to-br ${mood.gradient} shadow-lg shadow-black/10`
                  : "bg-bg-hover/50 hover:bg-bg-hover"
              }`}
            >
              {mood.custom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustom(mood.id);
                  }}
                  className="absolute -right-1 -top-1 hidden rounded-full bg-bg-card p-0.5 text-text-muted shadow-sm hover:text-red-400 group-hover:block"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <Icon
                className={`h-5 w-5 ${
                  isActive ? mood.gradientText : "text-text-muted"
                }`}
              />
              <span
                className={`text-[11px] font-medium ${
                  isActive ? mood.gradientText : "text-text"
                }`}
              >
                {mood.name}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  isActive
                    ? "bg-white/20 " + mood.gradientText
                    : "bg-bg text-text-muted"
                }`}
              >
                {count} articles
              </span>
            </button>
          );
        })}
      </div>

      {/* Create custom playlist form */}
      {showCreate && (
        <div className="mb-3 rounded-lg border border-border bg-bg p-3">
          <div className="mb-2 text-xs font-medium text-text">Create Custom Playlist</div>
          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Playlist name"
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              placeholder="Keywords (comma-separated)"
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted">Color:</span>
              {CUSTOM_GRADIENTS.map((g) => (
                <button
                  key={g}
                  onClick={() => setNewGradient(g)}
                  className={`h-5 w-5 rounded-full bg-gradient-to-br ${g} ring-offset-1 ring-offset-bg-card ${
                    newGradient === g ? "ring-2 ring-primary" : ""
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreatePlaylist}
                disabled={!newName.trim() || !newKeywords.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected mood: article list */}
      {activeMood && (
        <div>
          {/* Mood header + auto-play toggle */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text">
                {activeMood.name}
              </span>
              <span className="text-[10px] text-text-muted">
                {matchedItems.length} matched
              </span>
            </div>
            <button
              onClick={() => {
                setAutoPlay((v) => !v);
                setAutoPlayIndex(0);
              }}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                autoPlay
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-bg-hover hover:text-text"
              }`}
            >
              {autoPlay ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {autoPlay ? "Pause" : "Auto-play"}
            </button>
          </div>

          {/* Articles */}
          {matchedItems.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">
              No articles match this mood yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {(autoPlay
                ? [matchedItems[autoPlayIndex % matchedItems.length]]
                : matchedItems.slice(0, 8)
              ).map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2.5 rounded-lg p-2.5 transition-colors hover:bg-bg-hover/50 ${
                    autoPlay ? "bg-bg-hover/30" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${activeMood.gradient}`}
                  >
                    <span className="text-[9px] font-bold text-white">
                      {autoPlay ? autoPlayIndex + 1 : i + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-medium text-text">
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-text-muted">
                      {item.summary}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-text-muted">{item.source}</span>
                      <span className="text-[10px] text-text-muted">
                        Relevance: {Math.min(item.score * 10, 100)}%
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-text-muted" />
                </div>
              ))}
              {!autoPlay && matchedItems.length > 8 && (
                <p className="pl-8 text-[10px] text-text-muted">
                  +{matchedItems.length - 8} more articles
                </p>
              )}
            </div>
          )}

          {/* Auto-play progress */}
          {autoPlay && matchedItems.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-border">
                <div
                  className={`h-1 rounded-full bg-gradient-to-r ${activeMood.gradient} transition-all duration-[5000ms] ease-linear`}
                  style={{
                    width: "100%",
                    animation: "moodAutoPlay 5s linear infinite",
                  }}
                />
              </div>
              <span className="text-[10px] text-text-muted">
                {(autoPlayIndex % matchedItems.length) + 1}/{matchedItems.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact "Now Playing" bar showing the active mood playlist */
export function MoodPlaylistBar({ items }: MoodPlaylistBarProps) {
  const [activeMoodId, setActiveMoodId] = useState<string | null>(null);
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);

  useEffect(() => {
    setCustomPlaylists(loadCustomPlaylists());
  }, []);

  const allMoods: MoodPreset[] = useMemo(() => {
    const customs: MoodPreset[] = customPlaylists.map((cp) => ({
      id: cp.id,
      name: cp.name,
      icon: "Palette",
      gradient: cp.gradient,
      gradientText: "text-white",
      keywords: cp.keywords,
      custom: true,
    }));
    return [...PRESET_MOODS, ...customs];
  }, [customPlaylists]);

  const activeMood = allMoods.find((m) => m.id === activeMoodId) ?? null;

  const matchCount = useMemo(() => {
    if (!activeMood) return 0;
    return items.filter((item) => scoreItem(item, activeMood.keywords) > 0).length;
  }, [items, activeMood]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
      {allMoods.map((mood) => {
        const Icon = ICON_MAP[mood.icon] ?? Sparkles;
        const isActive = activeMoodId === mood.id;
        return (
          <button
            key={mood.id}
            onClick={() => setActiveMoodId(isActive ? null : mood.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
              isActive
                ? `bg-gradient-to-r ${mood.gradient} text-white shadow-sm`
                : "text-text-muted hover:bg-bg-hover hover:text-text"
            }`}
          >
            {isActive && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
            )}
            <Icon className="h-3 w-3" />
            {mood.name}
            {isActive && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px]">
                {matchCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
