"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Pencil,
  Calendar,
  Hash,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Trash2,
  Link,
  Lightbulb,
  Flame,
  Eye,
} from "lucide-react";

// --- Types ---

type Mood = "great" | "good" | "okay" | "low" | "bad";

interface LinkedArticle {
  id: string;
  title: string;
}

interface JournalEntry {
  id: string;
  date: string; // ISO date "2026-03-25"
  text: string;
  mood: Mood;
  tags: string[];
  articles: LinkedArticle[];
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

interface JournalData {
  entries: JournalEntry[];
}

// --- Constants ---

const STORAGE_KEY = "feedbot-journal";

const MOODS: { key: Mood; emoji: string; label: string }[] = [
  { key: "great", emoji: "🤩", label: "Great" },
  { key: "good", emoji: "😊", label: "Good" },
  { key: "okay", emoji: "😐", label: "Okay" },
  { key: "low", emoji: "😔", label: "Low" },
  { key: "bad", emoji: "😞", label: "Bad" },
];

const PROMPTS = [
  "What was the most surprising thing you read today?",
  "What article changed your perspective?",
  "Summarize today's reading in one sentence",
  "What do you want to explore more?",
  "What idea from your reading do you disagree with?",
  "Which article would you recommend to a friend?",
  "What patterns are you noticing across your reading?",
  "What question did today's reading leave you with?",
];

// --- Helpers ---

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string): string {
  const today = getToday();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dateStr === today) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getDailyPrompt(): string {
  // Stable per-day index based on date
  const today = getToday();
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash * 31 + today.charCodeAt(i)) | 0;
  }
  return PROMPTS[Math.abs(hash) % PROMPTS.length];
}

function loadJournal(): JournalData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { entries: [] };
}

function saveJournal(data: JournalData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function moodEmoji(mood: Mood): string {
  return MOODS.find((m) => m.key === mood)?.emoji || "😐";
}

function previewText(text: string, lines = 2): string {
  const split = text.split("\n").filter(Boolean);
  const preview = split.slice(0, lines).join(" ");
  return preview.length > 160 ? preview.slice(0, 157) + "…" : preview;
}

// --- Simple markdown to HTML (bold, italic, links, headings) ---

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold mt-2 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold mt-2 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold mt-2 mb-1">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-bg-hover px-1 py-0.5 text-xs">$1</code>')
    .replace(/\n/g, "<br />");
}

// --- Exported Components ---

/** Small daily prompt card */
export function JournalPrompt({ onUsePrompt }: { onUsePrompt?: (prompt: string) => void }) {
  const prompt = useMemo(() => getDailyPrompt(), []);

  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10">
          <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-text">Journal Prompt</h3>
      </div>
      <p className="mb-2 text-xs italic leading-relaxed text-text-muted">&ldquo;{prompt}&rdquo;</p>
      {onUsePrompt && (
        <button
          onClick={() => onUsePrompt(prompt)}
          className="text-xs font-medium text-primary hover:text-primary-dark"
        >
          Use this prompt →
        </button>
      )}
    </div>
  );
}

/** Full reading journal component */
export function ReadingJournal() {
  const [journal, setJournal] = useState<JournalData>({ entries: [] });
  const [loaded, setLoaded] = useState(false);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<Mood>("okay");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [articles, setArticles] = useState<LinkedArticle[]>([]);
  const [articleTitleInput, setArticleTitleInput] = useState("");
  const [preview, setPreview] = useState(false);

  // View state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Load from localStorage
  useEffect(() => {
    setJournal(loadJournal());
    setLoaded(true);
  }, []);

  // Persist
  const persist = useCallback((data: JournalData) => {
    setJournal(data);
    saveJournal(data);
  }, []);

  // Reset editor
  const resetEditor = useCallback(() => {
    setText("");
    setMood("okay");
    setTags([]);
    setTagInput("");
    setArticles([]);
    setArticleTitleInput("");
    setPreview(false);
    setEditingId(null);
    setEditorOpen(false);
  }, []);

  // Save entry
  const saveEntry = useCallback(() => {
    if (!text.trim()) return;

    const now = new Date().toISOString();
    const today = getToday();

    if (editingId) {
      // Update existing
      const updated = {
        ...journal,
        entries: journal.entries.map((e) =>
          e.id === editingId
            ? { ...e, text, mood, tags, articles, updatedAt: now }
            : e
        ),
      };
      persist(updated);
    } else {
      // New entry
      const entry: JournalEntry = {
        id: generateId(),
        date: today,
        text,
        mood,
        tags,
        articles,
        createdAt: now,
        updatedAt: now,
      };
      persist({ entries: [entry, ...journal.entries] });
    }
    resetEditor();
  }, [text, mood, tags, articles, editingId, journal, persist, resetEditor]);

  // Edit existing
  const startEdit = useCallback((entry: JournalEntry) => {
    setEditingId(entry.id);
    setText(entry.text);
    setMood(entry.mood);
    setTags(entry.tags);
    setArticles(entry.articles);
    setEditorOpen(true);
    setPreview(false);
  }, []);

  // Delete
  const deleteEntry = useCallback(
    (id: string) => {
      persist({ entries: journal.entries.filter((e) => e.id !== id) });
      if (expandedId === id) setExpandedId(null);
    },
    [journal, persist, expandedId]
  );

  // Tag management
  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // Article linking
  const addArticle = useCallback(() => {
    const title = articleTitleInput.trim();
    if (title) {
      setArticles((prev) => [...prev, { id: generateId(), title }]);
      setArticleTitleInput("");
    }
  }, [articleTitleInput]);

  const removeArticle = useCallback((id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Export as markdown
  const exportMarkdown = useCallback(() => {
    const lines = ["# Reading Journal\n"];
    for (const entry of journal.entries) {
      lines.push(`## ${formatDateLabel(entry.date)} — ${moodEmoji(entry.mood)} ${entry.mood}\n`);
      if (entry.tags.length > 0) {
        lines.push(`Tags: ${entry.tags.map((t) => `#${t}`).join(" ")}\n`);
      }
      if (entry.articles.length > 0) {
        lines.push(`Articles: ${entry.articles.map((a) => a.title).join(", ")}\n`);
      }
      lines.push(`${entry.text}\n`);
      lines.push("---\n");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reading-journal-${getToday()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [journal]);

  // Stats
  const stats = useMemo(() => {
    const entries = journal.entries;
    if (entries.length === 0) {
      return { total: 0, streak: 0, avgWords: 0, topMood: "okay" as Mood };
    }

    const total = entries.length;

    // Streak: consecutive days with entries
    const entryDates = new Set(entries.map((e) => e.date));
    let streak = 0;
    const d = new Date();
    // If today has entry, start counting; otherwise start from yesterday
    if (!entryDates.has(getToday())) {
      d.setDate(d.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().split("T")[0];
      if (entryDates.has(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    // Avg words
    const totalWords = entries.reduce((sum, e) => sum + countWords(e.text), 0);
    const avgWords = Math.round(totalWords / total);

    // Most common mood
    const moodCounts: Record<string, number> = {};
    for (const e of entries) {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0] as Mood;

    return { total, streak, avgWords, topMood };
  }, [journal]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return journal.entries;
    const q = searchQuery.toLowerCase();
    return journal.entries.filter(
      (e) =>
        e.text.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(q)) ||
        e.articles.some((a) => a.title.toLowerCase().includes(q))
    );
  }, [journal.entries, searchQuery]);

  if (!loaded) return null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10">
            <BookOpen className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-text">Reading Journal</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Search entries"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={exportMarkdown}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            title="Export as Markdown"
          >
            <Download className="h-4 w-4" />
          </button>
          {!editorOpen && (
            <button
              onClick={() => {
                resetEditor();
                setEditorOpen(true);
              }}
              className="ml-1 flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-dark"
            >
              <Plus className="h-3 w-3" />
              New Entry
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-bg px-3 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search journal entries…"
            className="flex-1 bg-transparent text-xs text-text placeholder:text-text-muted focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-text-muted hover:text-text">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Stats bar */}
      {journal.entries.length > 0 && (
        <div className="mb-3 flex items-center gap-4 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <Pencil className="h-3 w-3" />
            {stats.total} entries
          </span>
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-400" />
            {stats.streak}d streak
          </span>
          <span>~{stats.avgWords} words/entry</span>
          <span>Top mood: {moodEmoji(stats.topMood)}</span>
        </div>
      )}

      {/* Editor */}
      {editorOpen && (
        <div className="mb-3 rounded-lg border border-border bg-bg p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-text">
              {editingId ? "Edit Entry" : formatDateLabel(getToday())}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted">{countWords(text)} words</span>
              <button
                onClick={() => setPreview((v) => !v)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-text-muted hover:bg-bg-hover hover:text-text"
              >
                <Eye className="h-3 w-3" />
                {preview ? "Edit" : "Preview"}
              </button>
              <button
                onClick={resetEditor}
                className="text-text-muted hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Text area / preview */}
          {preview ? (
            <div
              className="mb-2 min-h-[100px] rounded-md bg-bg-hover/30 p-2 text-xs leading-relaxed text-text"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
            />
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your thoughts…"
              rows={5}
              className="mb-2 w-full resize-y rounded-md border border-border bg-bg-hover/30 p-2 text-xs leading-relaxed text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          )}

          {/* Mood selector */}
          <div className="mb-2 flex items-center gap-1">
            <span className="mr-1 text-[10px] text-text-muted">Mood:</span>
            {MOODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMood(m.key)}
                className={`rounded-md px-1.5 py-0.5 text-sm transition-colors ${
                  mood === m.key
                    ? "bg-primary/20 ring-1 ring-primary"
                    : "hover:bg-bg-hover"
                }`}
                title={m.label}
              >
                {m.emoji}
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="mb-2">
            <div className="mb-1 flex flex-wrap items-center gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-0.5 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400"
                >
                  <Hash className="h-2.5 w-2.5" />
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:text-violet-200"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag…"
                className="w-24 rounded border border-border bg-transparent px-1.5 py-0.5 text-[10px] text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <button
                onClick={addTag}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted hover:bg-bg-hover hover:text-text"
              >
                <Plus className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          {/* Linked articles */}
          <div className="mb-3">
            {articles.length > 0 && (
              <div className="mb-1 flex flex-wrap items-center gap-1">
                {articles.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-0.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400"
                  >
                    <Link className="h-2.5 w-2.5" />
                    {a.title}
                    <button
                      onClick={() => removeArticle(a.id)}
                      className="ml-0.5 hover:text-blue-200"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={articleTitleInput}
                onChange={(e) => setArticleTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addArticle();
                  }
                }}
                placeholder="Link article title…"
                className="w-40 rounded border border-border bg-transparent px-1.5 py-0.5 text-[10px] text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <button
                onClick={addArticle}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted hover:bg-bg-hover hover:text-text"
              >
                <Link className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={saveEntry}
            disabled={!text.trim()}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {editingId ? "Update Entry" : "Save Entry"}
          </button>
        </div>
      )}

      {/* Daily prompt (only when editor closed and no entries today) */}
      {!editorOpen && !journal.entries.some((e) => e.date === getToday()) && (
        <div className="mb-3 rounded-lg border border-dashed border-border bg-bg p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <Lightbulb className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-medium text-text-muted">Today&apos;s prompt</span>
          </div>
          <p className="mb-2 text-xs italic text-text">&ldquo;{getDailyPrompt()}&rdquo;</p>
          <button
            onClick={() => {
              resetEditor();
              setText(getDailyPrompt() + "\n\n");
              setEditorOpen(true);
            }}
            className="text-[10px] font-medium text-primary hover:text-primary-dark"
          >
            Start writing →
          </button>
        </div>
      )}

      {/* Timeline */}
      {filteredEntries.length > 0 ? (
        <div className="space-y-2">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className="rounded-lg border border-border bg-bg transition-colors hover:bg-bg-hover/30"
              >
                {/* Collapsed row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex w-full items-center gap-2 p-2.5 text-left"
                >
                  <span className="text-sm">{moodEmoji(entry.mood)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-text-muted">
                        {formatDateLabel(entry.date)}
                      </span>
                      {entry.articles.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                          <Link className="h-2.5 w-2.5" />
                          {entry.articles.length}
                        </span>
                      )}
                      {entry.tags.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-violet-400">
                          <Hash className="h-2.5 w-2.5" />
                          {entry.tags.length}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-text">
                      {previewText(entry.text)}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  )}
                </button>

                {/* Expanded view */}
                {isExpanded && (
                  <div className="border-t border-border px-3 pb-3 pt-2">
                    {/* Full text */}
                    <div
                      className="mb-2 text-xs leading-relaxed text-text"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.text) }}
                    />

                    {/* Tags */}
                    {entry.tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Linked articles */}
                    {entry.articles.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {entry.articles.map((a) => (
                          <span
                            key={a.id}
                            className="flex items-center gap-0.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400"
                          >
                            <Link className="h-2.5 w-2.5" />
                            {a.title}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta + actions */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">
                        {countWords(entry.text)} words
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(entry)}
                          className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="rounded p-1 text-text-muted hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-center">
          <Calendar className="mb-2 h-8 w-8 text-text-muted/40" />
          <p className="text-xs text-text-muted">
            {searchQuery ? "No entries match your search" : "No journal entries yet"}
          </p>
          {!searchQuery && !editorOpen && (
            <button
              onClick={() => {
                resetEditor();
                setEditorOpen(true);
              }}
              className="mt-2 text-xs font-medium text-primary hover:text-primary-dark"
            >
              Write your first entry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
