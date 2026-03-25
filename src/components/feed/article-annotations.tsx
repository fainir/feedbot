"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Highlighter, MessageSquare, Trash2, ChevronRight, Copy, X, Check, StickyNote, BookOpen } from "lucide-react";

// --- Types ---

export interface Annotation {
  id: string;
  articleUrl: string;
  text: string;
  note: string;
  color: HighlightColor;
  createdAt: string;
  startOffset: number;
  endOffset: number;
}

type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";

const HIGHLIGHT_COLORS: { name: HighlightColor; bg: string; ring: string; pill: string }[] = [
  { name: "yellow", bg: "bg-yellow-200/40", ring: "ring-yellow-400", pill: "bg-yellow-400" },
  { name: "green", bg: "bg-green-200/40", ring: "ring-green-400", pill: "bg-green-400" },
  { name: "blue", bg: "bg-blue-200/40", ring: "ring-blue-400", pill: "bg-blue-400" },
  { name: "pink", bg: "bg-pink-200/40", ring: "ring-pink-400", pill: "bg-pink-400" },
  { name: "orange", bg: "bg-orange-200/40", ring: "ring-orange-400", pill: "bg-orange-400" },
];

const STORAGE_KEY = "feedbot-annotations";

function colorBg(color: HighlightColor): string {
  return HIGHLIGHT_COLORS.find((c) => c.name === color)?.bg ?? "bg-yellow-200/40";
}

function colorPill(color: HighlightColor): string {
  return HIGHLIGHT_COLORS.find((c) => c.name === color)?.pill ?? "bg-yellow-400";
}

// --- Hook ---

export function useAnnotations(articleUrl?: string) {
  const [allAnnotations, setAllAnnotations] = useState<Record<string, Annotation[]>>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAllAnnotations(JSON.parse(raw));
    } catch {
      // ignore malformed data
    }
  }, []);

  // Persist whenever annotations change
  const persist = useCallback((data: Record<string, Annotation[]>) => {
    setAllAnnotations(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full or unavailable
    }
  }, []);

  const annotations = articleUrl ? allAnnotations[articleUrl] ?? [] : [];

  const addAnnotation = useCallback(
    (annotation: Omit<Annotation, "id" | "createdAt">) => {
      const newAnnotation: Annotation = {
        ...annotation,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setAllAnnotations((prev) => {
        const updated = { ...prev };
        const list = updated[annotation.articleUrl] ?? [];
        updated[annotation.articleUrl] = [...list, newAnnotation];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // storage full
        }
        return updated;
      });
      return newAnnotation;
    },
    []
  );

  const updateNote = useCallback(
    (articleUrl: string, annotationId: string, note: string) => {
      setAllAnnotations((prev) => {
        const updated = { ...prev };
        const list = (updated[articleUrl] ?? []).map((a) =>
          a.id === annotationId ? { ...a, note } : a
        );
        updated[articleUrl] = list;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // storage full
        }
        return updated;
      });
    },
    []
  );

  const removeAnnotation = useCallback(
    (articleUrl: string, annotationId: string) => {
      setAllAnnotations((prev) => {
        const updated = { ...prev };
        updated[articleUrl] = (updated[articleUrl] ?? []).filter(
          (a) => a.id !== annotationId
        );
        if (updated[articleUrl].length === 0) {
          delete updated[articleUrl];
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // storage full
        }
        return updated;
      });
    },
    []
  );

  return {
    annotations,
    allAnnotations,
    addAnnotation,
    updateNote,
    removeAnnotation,
  };
}

// --- Annotation Toolbar (floating, appears on text selection) ---

interface AnnotationToolbarProps {
  articleUrl: string;
  onAddAnnotation: (annotation: Omit<Annotation, "id" | "createdAt">) => Annotation;
  containerRef: React.RefObject<HTMLElement | null>;
}

export function AnnotationToolbar({
  articleUrl,
  onAddAnnotation,
  containerRef,
}: AnnotationToolbarProps) {
  const [selection, setSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
    rect: DOMRect;
  } | null>(null);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("yellow");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [copied, setCopied] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Detect text selection within the container
  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to let the browser finalize selection
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          return;
        }

        const range = sel.getRangeAt(0);
        const container = containerRef.current;
        if (!container || !container.contains(range.commonAncestorContainer)) {
          return;
        }

        const text = sel.toString().trim();
        if (!text) return;

        // Compute offsets relative to the container's text content
        const preRange = document.createRange();
        preRange.selectNodeContents(container);
        preRange.setEnd(range.startContainer, range.startOffset);
        const startOffset = preRange.toString().length;
        const endOffset = startOffset + text.length;

        const rect = range.getBoundingClientRect();
        setSelection({ text, startOffset, endOffset, rect });
        setShowNoteInput(false);
        setNoteText("");
        setCopied(false);
      }, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Close toolbar if clicking outside it
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        setSelection(null);
        setShowNoteInput(false);
        setNoteText("");
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [containerRef]);

  const handleHighlight = () => {
    if (!selection) return;
    onAddAnnotation({
      articleUrl,
      text: selection.text,
      note: "",
      color: selectedColor,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
    });
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  const handleNoteSubmit = () => {
    if (!selection) return;
    onAddAnnotation({
      articleUrl,
      text: selection.text,
      note: noteText,
      color: selectedColor,
      startOffset: selection.startOffset,
      endOffset: selection.endOffset,
    });
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setShowNoteInput(false);
    setNoteText("");
  };

  const handleCopy = async () => {
    if (!selection) return;
    await navigator.clipboard.writeText(selection.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selection) return null;

  // Position toolbar above the selection
  const containerRect = containerRef.current?.getBoundingClientRect();
  const scrollTop = containerRef.current?.scrollTop ?? 0;
  const top = containerRect
    ? selection.rect.top - containerRect.top + scrollTop - 12
    : selection.rect.top - 12;
  const left = containerRect
    ? selection.rect.left - containerRect.left + selection.rect.width / 2
    : selection.rect.left + selection.rect.width / 2;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 -translate-x-1/2 -translate-y-full"
      style={{ top, left }}
    >
      <div className="rounded-xl border border-border bg-bg-card p-2 shadow-lg">
        {/* Color pills */}
        <div className="mb-2 flex items-center justify-center gap-1.5">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => setSelectedColor(c.name)}
              className={`h-5 w-5 rounded-full ${c.pill} transition-all ${
                selectedColor === c.name ? `ring-2 ${c.ring} ring-offset-1 ring-offset-bg-card scale-110` : "opacity-60 hover:opacity-100"
              }`}
              title={c.name}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleHighlight}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-bg-hover"
            title="Highlight"
          >
            <Highlighter className="h-3.5 w-3.5" />
            Highlight
          </button>
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              showNoteInput ? "bg-primary/10 text-primary" : "text-text hover:bg-bg-hover"
            }`}
            title="Add note"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Note
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-bg-hover"
            title="Copy"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copy
          </button>
        </div>

        {/* Note input */}
        {showNoteInput && (
          <div className="mt-2 flex gap-1.5 border-t border-border pt-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNoteSubmit();
                if (e.key === "Escape") {
                  setShowNoteInput(false);
                  setNoteText("");
                }
              }}
              placeholder="Add a note..."
              className="flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleNoteSubmit}
              className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Annotations Sidebar ---

interface AnnotationsSidebarProps {
  articleUrl: string;
  annotations: Annotation[];
  onRemove: (articleUrl: string, annotationId: string) => void;
  onUpdateNote: (articleUrl: string, annotationId: string, note: string) => void;
  onScrollTo?: (annotation: Annotation) => void;
}

export function AnnotationsSidebar({
  articleUrl,
  annotations,
  onRemove,
  onUpdateNote,
  onScrollTo,
}: AnnotationsSidebarProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  if (annotations.length === 0 && !open) return null;

  return (
    <div className="border-t border-border bg-bg-card">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-text transition-colors hover:bg-bg-hover"
      >
        <div className="flex items-center gap-2">
          <Highlighter className="h-4 w-4 text-primary" />
          <span>Annotations</span>
          {annotations.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {annotations.length}
            </span>
          )}
        </div>
        <ChevronRight
          className={`h-4 w-4 text-text-muted transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {/* Annotations list */}
      {open && (
        <div className="max-h-64 overflow-y-auto px-4 pb-4">
          {annotations.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">
              Select text in the article to add highlights and notes.
            </p>
          ) : (
            <div className="space-y-2">
              {annotations
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((annotation) => (
                  <div
                    key={annotation.id}
                    className="group rounded-lg border border-border bg-bg p-3 transition-colors hover:bg-bg-hover/50"
                  >
                    {/* Highlighted text */}
                    <button
                      onClick={() => onScrollTo?.(annotation)}
                      className={`mb-1.5 block w-full rounded px-2 py-1 text-left text-xs leading-relaxed text-text ${colorBg(annotation.color)}`}
                    >
                      &ldquo;{annotation.text}&rdquo;
                    </button>

                    {/* Note */}
                    {editingId === annotation.id ? (
                      <div className="mb-1.5 flex gap-1.5">
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              onUpdateNote(articleUrl, annotation.id, editNote);
                              setEditingId(null);
                            }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                          placeholder="Add a note..."
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            onUpdateNote(articleUrl, annotation.id, editNote);
                            setEditingId(null);
                          }}
                          className="rounded bg-primary px-2 py-1 text-xs text-white"
                        >
                          Save
                        </button>
                      </div>
                    ) : annotation.note ? (
                      <button
                        onClick={() => {
                          setEditingId(annotation.id);
                          setEditNote(annotation.note);
                        }}
                        className="mb-1.5 block w-full text-left text-xs text-text-muted hover:text-text"
                      >
                        <MessageSquare className="mr-1 inline h-3 w-3" />
                        {annotation.note}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(annotation.id);
                          setEditNote("");
                        }}
                        className="mb-1.5 text-xs text-text-muted hover:text-primary"
                      >
                        + Add note
                      </button>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">
                        {new Date(annotation.createdAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
                        )}
                      </span>
                      <button
                        onClick={() => onRemove(articleUrl, annotation.id)}
                        className="rounded p-1 text-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                        title="Delete annotation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- All Annotations Page ---

interface AllAnnotationsProps {
  allAnnotations: Record<string, Annotation[]>;
  onRemove: (articleUrl: string, annotationId: string) => void;
  onNavigateToArticle?: (url: string) => void;
}

export function AllAnnotations({
  allAnnotations,
  onRemove,
  onNavigateToArticle,
}: AllAnnotationsProps) {
  const articleUrls = Object.keys(allAnnotations).filter(
    (url) => allAnnotations[url].length > 0
  );

  const totalCount = articleUrls.reduce(
    (sum, url) => sum + allAnnotations[url].length,
    0
  );

  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  if (articleUrls.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <StickyNote className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-text">
            No annotations yet
          </h3>
          <p className="max-w-xs text-center text-xs text-text-muted">
            Open an article and select text to create highlights and notes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Highlighter className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">All Annotations</h3>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {totalCount} total
        </span>
      </div>

      <div className="space-y-2">
        {articleUrls.map((url) => {
          const items = allAnnotations[url];
          const isExpanded = expandedUrl === url;
          // Extract a readable title from URL
          const displayUrl = (() => {
            try {
              const parsed = new URL(url);
              const path = parsed.pathname
                .replace(/^\//, "")
                .replace(/\/$/, "")
                .replace(/-/g, " ")
                .replace(/\//g, " / ");
              return path || parsed.hostname;
            } catch {
              return url;
            }
          })();

          return (
            <div key={url} className="rounded-lg border border-border bg-bg">
              {/* Article group header */}
              <button
                onClick={() =>
                  setExpandedUrl(isExpanded ? null : url)
                }
                className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  <span className="truncate text-xs font-medium text-text">
                    {displayUrl}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted">
                    {items.length} {items.length === 1 ? "note" : "notes"}
                  </span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 text-text-muted transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Expanded annotations */}
              {isExpanded && (
                <div className="border-t border-border px-3 pb-3 pt-2">
                  <div className="space-y-2">
                    {items
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .map((annotation) => (
                        <div
                          key={annotation.id}
                          className="group flex items-start gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className={`rounded px-2 py-1 text-xs leading-relaxed text-text ${colorBg(annotation.color)}`}
                            >
                              &ldquo;{annotation.text}&rdquo;
                            </p>
                            {annotation.note && (
                              <p className="mt-1 flex items-center gap-1 px-2 text-[10px] text-text-muted">
                                <MessageSquare className="h-2.5 w-2.5" />
                                {annotation.note}
                              </p>
                            )}
                            <p className="mt-0.5 px-2 text-[10px] text-text-muted">
                              {new Date(
                                annotation.createdAt
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <button
                            onClick={() => onRemove(url, annotation.id)}
                            className="rounded p-1 text-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                  {onNavigateToArticle && (
                    <button
                      onClick={() => onNavigateToArticle(url)}
                      className="mt-2 text-xs font-medium text-primary hover:text-primary-dark"
                    >
                      Open article
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
