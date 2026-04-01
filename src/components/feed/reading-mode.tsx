"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import DOMPurify from "dompurify";
import {
  X,
  ChevronUp,
  Type,
  Minus,
  Plus,
  Play,
  Pause,
  Sun,
  Moon,
  Monitor,
  Smartphone,
} from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

const STORAGE_KEY = "feedbot-reading-mode-prefs";

type FontFamily = "sans" | "serif" | "mono";
type LineHeight = "compact" | "normal" | "relaxed";
type ContentWidth = "narrow" | "normal" | "wide";
type Theme = "white" | "cream" | "dark" | "oled";

interface ReadingPrefs {
  fontSize: number;
  fontFamily: FontFamily;
  lineHeight: LineHeight;
  contentWidth: ContentWidth;
  theme: Theme;
  autoScrollSpeed: number;
}

const DEFAULT_PREFS: ReadingPrefs = {
  fontSize: 18,
  fontFamily: "sans",
  lineHeight: "normal",
  contentWidth: "normal",
  theme: "white",
  autoScrollSpeed: 1,
};

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  sans: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
};

const LINE_HEIGHT_MAP: Record<LineHeight, number> = {
  compact: 1.4,
  normal: 1.6,
  relaxed: 1.8,
};

const WIDTH_MAP: Record<ContentWidth, number> = {
  narrow: 560,
  normal: 680,
  wide: 800,
};

const THEME_STYLES: Record<Theme, { bg: string; text: string; muted: string; border: string; toolbar: string }> = {
  white: {
    bg: "#ffffff",
    text: "#1a1a1a",
    muted: "#6b7280",
    border: "#e5e7eb",
    toolbar: "#f9fafb",
  },
  cream: {
    bg: "#f5f0e8",
    text: "#3d3529",
    muted: "#7c7164",
    border: "#ddd5c7",
    toolbar: "#ede7db",
  },
  dark: {
    bg: "#1e1e2e",
    text: "#cdd6f4",
    muted: "#7f849c",
    border: "#313244",
    toolbar: "#181825",
  },
  oled: {
    bg: "#000000",
    text: "#e0e0e0",
    muted: "#666666",
    border: "#1a1a1a",
    toolbar: "#0a0a0a",
  },
};

interface ReadingModeProps {
  title: string;
  summary: string;
  source: string;
  url: string;
  content: string;
  onClose: () => void;
}

function loadPrefs(): ReadingPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: ReadingPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function ReadingMode({ title, summary, source, url, content, onClose }: ReadingModeProps) {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_PREFS);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showToolbar, setShowToolbar] = useState(false);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [visible, setVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  // Load prefs on mount
  useEffect(() => {
    setPrefs(loadPrefs());
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Save prefs on change
  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const updatePref = useCallback(<K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  const trapRef = useFocusTrap<HTMLDivElement>(true, { onEscape: handleClose });

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Scroll tracking + time remaining
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? Math.min(100, Math.round((scrollTop / maxScroll) * 100)) : 100;
      setScrollProgress(progress);
      setShowBackToTop(scrollTop > 400);

      // Estimate time remaining based on ~200 words/min, ~5 chars/word
      const totalChars = content.length;
      const charsPerMinute = 200 * 5;
      const fractionRemaining = maxScroll > 0 ? 1 - scrollTop / maxScroll : 0;
      const minutesLeft = Math.ceil((totalChars * fractionRemaining) / charsPerMinute);
      if (minutesLeft <= 0) {
        setTimeRemaining("");
      } else if (minutesLeft === 1) {
        setTimeRemaining("~1 min left");
      } else {
        setTimeRemaining(`~${minutesLeft} min left`);
      }
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [content]);

  // Auto-scroll
  useEffect(() => {
    if (!autoScrolling) {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return;
    }

    const container = contentRef.current;
    if (!container) return;

    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      // Speed: pixels per second (20 to 100 based on 1-5 scale)
      const pxPerSec = 10 + prefs.autoScrollSpeed * 18;
      container.scrollTop += (pxPerSec * dt) / 1000;

      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop >= scrollHeight - clientHeight - 1) {
        setAutoScrolling(false);
        return;
      }
      autoScrollRef.current = requestAnimationFrame(tick);
    };

    autoScrollRef.current = requestAnimationFrame(tick);
    return () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
    };
  }, [autoScrolling, prefs.autoScrollSpeed]);

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const theme = THEME_STYLES[prefs.theme];

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Reading: ${title}`}
      className="fixed inset-0 z-[60] transition-opacity duration-250"
      style={{
        opacity: visible ? 1 : 0,
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      {/* Progress bar */}
      <div
        className="absolute left-0 top-0 z-10 h-[3px] transition-all duration-150"
        style={{
          width: `${scrollProgress}%`,
          backgroundColor: prefs.theme === "white" || prefs.theme === "cream" ? "#6366f1" : "#818cf8",
        }}
      />

      {/* Floating toolbar toggle */}
      <button
        onClick={() => setShowToolbar(!showToolbar)}
        className="absolute right-16 top-4 z-20 rounded-full p-2 transition-colors"
        style={{
          backgroundColor: theme.toolbar,
          color: theme.muted,
          border: `1px solid ${theme.border}`,
        }}
        title="Typography settings"
      >
        <Type className="h-4 w-4" />
      </button>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 z-20 rounded-full p-2 transition-colors"
        style={{
          backgroundColor: theme.toolbar,
          color: theme.muted,
          border: `1px solid ${theme.border}`,
        }}
        title="Exit reading mode (Esc)"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Floating toolbar */}
      {showToolbar && (
        <div
          className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 flex-wrap items-center gap-4 rounded-xl px-5 py-3 shadow-lg"
          style={{
            backgroundColor: theme.toolbar,
            border: `1px solid ${theme.border}`,
          }}
        >
          {/* Font size */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => updatePref("fontSize", Math.max(14, prefs.fontSize - 1))}
              className="rounded p-1 transition-colors hover:opacity-70"
              style={{ color: theme.muted }}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[3ch] text-center text-xs" style={{ color: theme.muted }}>
              {prefs.fontSize}
            </span>
            <button
              onClick={() => updatePref("fontSize", Math.min(24, prefs.fontSize + 1))}
              className="rounded p-1 transition-colors hover:opacity-70"
              style={{ color: theme.muted }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-5 w-px" style={{ backgroundColor: theme.border }} />

          {/* Font family */}
          <div className="flex items-center gap-1">
            {(["sans", "serif", "mono"] as const).map((f) => (
              <button
                key={f}
                onClick={() => updatePref("fontFamily", f)}
                className="rounded-md px-2 py-1 text-xs transition-colors"
                style={{
                  backgroundColor: prefs.fontFamily === f
                    ? (prefs.theme === "white" || prefs.theme === "cream" ? "#6366f1" : "#818cf8")
                    : "transparent",
                  color: prefs.fontFamily === f
                    ? "#ffffff"
                    : theme.muted,
                  fontFamily: FONT_FAMILY_MAP[f],
                }}
              >
                {f === "sans" ? "Sans" : f === "serif" ? "Serif" : "Mono"}
              </button>
            ))}
          </div>

          <div className="h-5 w-px" style={{ backgroundColor: theme.border }} />

          {/* Line height */}
          <div className="flex items-center gap-1">
            {(["compact", "normal", "relaxed"] as const).map((lh) => (
              <button
                key={lh}
                onClick={() => updatePref("lineHeight", lh)}
                className="rounded-md px-2 py-1 text-xs capitalize transition-colors"
                style={{
                  backgroundColor: prefs.lineHeight === lh
                    ? (prefs.theme === "white" || prefs.theme === "cream" ? "#6366f1" : "#818cf8")
                    : "transparent",
                  color: prefs.lineHeight === lh ? "#ffffff" : theme.muted,
                }}
              >
                {lh}
              </button>
            ))}
          </div>

          <div className="h-5 w-px" style={{ backgroundColor: theme.border }} />

          {/* Content width */}
          <div className="flex items-center gap-1">
            {(["narrow", "normal", "wide"] as const).map((w) => {
              const icons = { narrow: Smartphone, normal: Monitor, wide: Monitor };
              const Icon = icons[w];
              return (
                <button
                  key={w}
                  onClick={() => updatePref("contentWidth", w)}
                  className="rounded-md p-1.5 transition-colors"
                  title={`${w.charAt(0).toUpperCase() + w.slice(1)} (${WIDTH_MAP[w]}px)`}
                  style={{
                    backgroundColor: prefs.contentWidth === w
                      ? (prefs.theme === "white" || prefs.theme === "cream" ? "#6366f1" : "#818cf8")
                      : "transparent",
                    color: prefs.contentWidth === w ? "#ffffff" : theme.muted,
                  }}
                >
                  <Icon className={`h-3.5 w-3.5 ${w === "wide" ? "scale-x-125" : ""}`} />
                </button>
              );
            })}
          </div>

          <div className="h-5 w-px" style={{ backgroundColor: theme.border }} />

          {/* Themes */}
          <div className="flex items-center gap-1.5">
            {(["white", "cream", "dark", "oled"] as const).map((t) => (
              <button
                key={t}
                onClick={() => updatePref("theme", t)}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                title={t.charAt(0).toUpperCase() + t.slice(1)}
                style={{
                  backgroundColor: THEME_STYLES[t].bg,
                  borderColor: prefs.theme === t
                    ? (prefs.theme === "white" || prefs.theme === "cream" ? "#6366f1" : "#818cf8")
                    : THEME_STYLES[t].border,
                }}
              />
            ))}
          </div>

          <div className="h-5 w-px" style={{ backgroundColor: theme.border }} />

          {/* Auto-scroll */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScrolling(!autoScrolling)}
              className="rounded-md p-1.5 transition-colors"
              title={autoScrolling ? "Pause auto-scroll" : "Start auto-scroll"}
              style={{
                backgroundColor: autoScrolling
                  ? (prefs.theme === "white" || prefs.theme === "cream" ? "#6366f1" : "#818cf8")
                  : "transparent",
                color: autoScrolling ? "#ffffff" : theme.muted,
              }}
            >
              {autoScrolling ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            {autoScrolling && (
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={prefs.autoScrollSpeed}
                onChange={(e) => updatePref("autoScrollSpeed", Number(e.target.value))}
                className="h-1 w-16 cursor-pointer accent-indigo-500"
              />
            )}
          </div>
        </div>
      )}

      {/* Time remaining */}
      {timeRemaining && (
        <div
          className="absolute left-4 top-4 z-20 rounded-full px-3 py-1.5 text-xs"
          style={{
            backgroundColor: theme.toolbar,
            color: theme.muted,
            border: `1px solid ${theme.border}`,
          }}
        >
          {timeRemaining}
        </div>
      )}

      {/* Scrollable content area */}
      <div
        ref={contentRef}
        className="h-full overflow-y-auto px-6 pb-20 pt-16"
        onClick={(e) => {
          // Close toolbar when clicking content area
          if (showToolbar && !(e.target as HTMLElement).closest("button")) {
            setShowToolbar(false);
          }
        }}
      >
        <article
          className="mx-auto"
          style={{
            maxWidth: `${WIDTH_MAP[prefs.contentWidth]}px`,
            fontFamily: FONT_FAMILY_MAP[prefs.fontFamily],
            fontSize: `${prefs.fontSize}px`,
            lineHeight: LINE_HEIGHT_MAP[prefs.lineHeight],
          }}
        >
          {/* Source */}
          <p
            className="mb-4 text-sm uppercase tracking-wider"
            style={{ color: theme.muted, fontSize: "12px" }}
          >
            {source}
          </p>

          {/* Title */}
          <h1
            className="mb-6 font-bold leading-tight"
            style={{
              fontSize: `${Math.round(prefs.fontSize * 1.8)}px`,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>

          {/* Summary */}
          {summary && (
            <p
              className="mb-8 border-l-2 pl-4 italic"
              style={{
                color: theme.muted,
                borderColor: theme.border,
                fontSize: `${prefs.fontSize + 1}px`,
              }}
            >
              {summary}
            </p>
          )}

          {/* Divider */}
          <div className="mb-8 h-px" style={{ backgroundColor: theme.border }} />

          {/* Article content */}
          <div
            className="reading-mode-content"
            style={{
              color: theme.text,
            }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />

          {/* Footer */}
          <div className="mt-12 mb-8 text-center">
            <div className="mb-4 h-px" style={{ backgroundColor: theme.border }} />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline transition-opacity hover:opacity-70"
              style={{ color: theme.muted }}
            >
              View original article
            </a>
          </div>
        </article>
      </div>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="absolute bottom-6 right-6 z-20 rounded-full p-3 shadow-lg transition-all hover:scale-105"
          style={{
            backgroundColor: theme.toolbar,
            color: theme.muted,
            border: `1px solid ${theme.border}`,
          }}
          title="Back to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      {/* Inline styles for article content typography */}
      <style jsx global>{`
        .reading-mode-content h1 {
          font-size: 1.6em;
          font-weight: 700;
          margin: 1.4em 0 0.6em;
          line-height: 1.2;
        }
        .reading-mode-content h2 {
          font-size: 1.35em;
          font-weight: 700;
          margin: 1.3em 0 0.5em;
          line-height: 1.25;
        }
        .reading-mode-content h3 {
          font-size: 1.15em;
          font-weight: 600;
          margin: 1.2em 0 0.4em;
          line-height: 1.3;
        }
        .reading-mode-content p {
          margin: 0 0 1.2em;
        }
        .reading-mode-content a {
          color: ${prefs.theme === "white" || prefs.theme === "cream" ? "#4f46e5" : "#a5b4fc"};
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .reading-mode-content a:hover {
          opacity: 0.8;
        }
        .reading-mode-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1.5em 0;
        }
        .reading-mode-content blockquote {
          border-left: 3px solid ${theme.border};
          padding-left: 1em;
          margin: 1.2em 0;
          color: ${theme.muted};
          font-style: italic;
        }
        .reading-mode-content ul,
        .reading-mode-content ol {
          padding-left: 1.5em;
          margin: 0 0 1.2em;
        }
        .reading-mode-content li {
          margin: 0.3em 0;
        }
        .reading-mode-content pre {
          background: ${prefs.theme === "white" ? "#f3f4f6" : prefs.theme === "cream" ? "#e8e0d0" : prefs.theme === "dark" ? "#11111b" : "#111111"};
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.2em 0;
          font-size: 0.85em;
          line-height: 1.5;
        }
        .reading-mode-content code {
          background: ${prefs.theme === "white" ? "#f3f4f6" : prefs.theme === "cream" ? "#e8e0d0" : prefs.theme === "dark" ? "#11111b" : "#111111"};
          padding: 0.15em 0.35em;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .reading-mode-content pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }
        .reading-mode-content hr {
          border: none;
          height: 1px;
          background: ${theme.border};
          margin: 2em 0;
        }
        .reading-mode-content figure {
          margin: 1.5em 0;
        }
        .reading-mode-content figcaption {
          text-align: center;
          font-size: 0.85em;
          color: ${theme.muted};
          margin-top: 0.5em;
        }
        .reading-mode-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.2em 0;
        }
        .reading-mode-content th,
        .reading-mode-content td {
          border: 1px solid ${theme.border};
          padding: 0.5em 0.75em;
          text-align: left;
        }
        .reading-mode-content th {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
