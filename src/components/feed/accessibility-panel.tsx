"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Accessibility, Eye, Type, Contrast, ScanLine, X, RotateCcw, Volume2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccessibilitySettings {
  fontSize: number;
  fontFamily: "default" | "dyslexia" | "serif" | "mono";
  lineSpacing: number;
  letterSpacing: number;
  wordSpacing: number;
  highContrast: boolean;
  invertedColors: boolean;
  customTextColor: string;
  customBgColor: string;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  readingRuler: boolean;
  focusHighlight: boolean;
  bionicReading: boolean;
  preset: "custom" | "dyslexia" | "lowVision" | "focus" | "default";
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 16,
  fontFamily: "default",
  lineSpacing: 1.5,
  letterSpacing: 0,
  wordSpacing: 0,
  highContrast: false,
  invertedColors: false,
  customTextColor: "",
  customBgColor: "",
  reduceMotion: false,
  reduceTransparency: false,
  readingRuler: false,
  focusHighlight: false,
  bionicReading: false,
  preset: "default",
};

const PRESETS: Record<string, Partial<AccessibilitySettings>> = {
  dyslexia: {
    fontSize: 20,
    fontFamily: "dyslexia",
    lineSpacing: 2.0,
    letterSpacing: 2,
    wordSpacing: 5,
    readingRuler: true,
    preset: "dyslexia",
  },
  lowVision: {
    fontSize: 28,
    highContrast: true,
    lineSpacing: 2.0,
    letterSpacing: 1,
    wordSpacing: 3,
    preset: "lowVision",
  },
  focus: {
    focusHighlight: true,
    reduceMotion: true,
    reduceTransparency: true,
    preset: "focus",
  },
  default: { ...DEFAULT_SETTINGS },
};

const FONT_LABELS: Record<string, string> = {
  default: "Default",
  dyslexia: "Dyslexia-Friendly",
  serif: "Serif",
  mono: "Monospace",
};

const STORAGE_KEY = "feedbot-accessibility";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadSettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: AccessibilitySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function fontFamilyValue(family: string): string {
  switch (family) {
    case "dyslexia":
      return '"OpenDyslexic", "Comic Sans MS", "Trebuchet MS", sans-serif';
    case "serif":
      return "Georgia, \"Times New Roman\", serif";
    case "mono":
      return '"Fira Code", "SF Mono", "Consolas", monospace';
    default:
      return "";
  }
}

/** Apply settings as CSS custom properties on :root */
function applyToDOM(s: AccessibilitySettings) {
  const root = document.documentElement;

  // Font
  root.style.setProperty("--a11y-font-size", `${s.fontSize}px`);
  const ff = fontFamilyValue(s.fontFamily);
  if (ff) {
    root.style.setProperty("--a11y-font-family", ff);
  } else {
    root.style.removeProperty("--a11y-font-family");
  }

  // Spacing
  root.style.setProperty("--a11y-line-height", `${s.lineSpacing}`);
  root.style.setProperty("--a11y-letter-spacing", `${s.letterSpacing}px`);
  root.style.setProperty("--a11y-word-spacing", `${s.wordSpacing}px`);

  // Color / contrast
  root.classList.toggle("a11y-high-contrast", s.highContrast);
  root.classList.toggle("a11y-inverted", s.invertedColors);
  root.classList.toggle("a11y-reduce-motion", s.reduceMotion);
  root.classList.toggle("a11y-reduce-transparency", s.reduceTransparency);
  root.classList.toggle("a11y-reading-ruler", s.readingRuler);
  root.classList.toggle("a11y-focus-highlight", s.focusHighlight);
  root.classList.toggle("a11y-bionic", s.bionicReading);

  if (s.customTextColor) {
    root.style.setProperty("--a11y-text-color", s.customTextColor);
  } else {
    root.style.removeProperty("--a11y-text-color");
  }
  if (s.customBgColor) {
    root.style.setProperty("--a11y-bg-color", s.customBgColor);
  } else {
    root.style.removeProperty("--a11y-bg-color");
  }
}

/** Make bionic-reading HTML: bold the first half of each word */
function bionicHTML(text: string): string {
  return text
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      const mid = Math.ceil(token.length / 2);
      return `<b>${token.slice(0, mid)}</b>${token.slice(mid)}`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Reading Ruler (portal-level effect)
// ---------------------------------------------------------------------------

function useReadingRuler(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const ruler = document.createElement("div");
    ruler.id = "a11y-reading-ruler";
    Object.assign(ruler.style, {
      position: "fixed",
      left: "0",
      width: "100vw",
      height: "3px",
      background: "rgba(59,130,246,0.5)",
      pointerEvents: "none",
      zIndex: "99999",
      transition: "top 0.05s linear",
      top: "-10px",
    });
    document.body.appendChild(ruler);

    const onMove = (e: MouseEvent) => {
      ruler.style.top = `${e.clientY}px`;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      ruler.remove();
    };
  }, [enabled]);
}

// ---------------------------------------------------------------------------
// Slider sub-component
// ---------------------------------------------------------------------------

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-[11px] text-text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}
          {unit || ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Toggle sub-component
// ---------------------------------------------------------------------------

function Toggle({
  label,
  checked,
  onChange,
  ariaLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5">
      <span className="text-xs text-text">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </label>
  );
}

// ---------------------------------------------------------------------------
// AccessibilityPanel
// ---------------------------------------------------------------------------

export function AccessibilityPanel({ onClose }: { onClose?: () => void }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const initialized = useRef(false);

  // Load persisted settings once
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    applyToDOM(s);
    initialized.current = true;
  }, []);

  // Apply whenever settings change (skip first render)
  useEffect(() => {
    if (!initialized.current) return;
    applyToDOM(settings);
    saveSettings(settings);
  }, [settings]);

  useReadingRuler(settings.readingRuler);

  const update = useCallback(
    <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value, preset: "custom" as const }));
    },
    [],
  );

  const applyPreset = useCallback((name: keyof typeof PRESETS) => {
    setSettings((prev) => ({ ...prev, ...DEFAULT_SETTINGS, ...PRESETS[name] }));
  }, []);

  const speakPreview = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      "The quick brown fox jumps over the lazy dog. This is a reading accessibility preview.",
    );
    window.speechSynthesis.speak(u);
  }, []);

  // Preview text (bionic or plain)
  const previewText =
    "The quick brown fox jumps over the lazy dog. Reading comfortably is essential for everyone.";

  return (
    <div
      className="mb-4 rounded-xl border border-border bg-bg-card"
      role="region"
      aria-label="Accessibility settings"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
            <Accessibility className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Reading Accessibility</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:text-text"
            aria-label="Close accessibility panel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Presets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(["default", "dyslexia", "lowVision", "focus"] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                settings.preset === p
                  ? "bg-primary text-white"
                  : "bg-bg-hover text-text-muted hover:text-text"
              }`}
              aria-label={`Apply ${p} preset`}
              aria-pressed={settings.preset === p}
            >
              {p === "lowVision" ? "Low Vision" : p === "dyslexia" ? "Dyslexia Friendly" : p === "focus" ? "Focus Mode" : "Default"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {/* Visual Settings */}
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-text-muted" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Visual Settings
            </p>
          </div>
          <div className="space-y-3">
            <Slider
              label="Font Size"
              value={settings.fontSize}
              min={12}
              max={28}
              step={1}
              unit="px"
              onChange={(v) => update("fontSize", v)}
              ariaLabel="Font size"
            />

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-text-muted">Font Family</span>
              <select
                value={settings.fontFamily}
                onChange={(e) =>
                  update("fontFamily", e.target.value as AccessibilitySettings["fontFamily"])
                }
                aria-label="Font family"
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
              >
                {Object.entries(FONT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <Slider
              label="Line Spacing"
              value={settings.lineSpacing}
              min={1.2}
              max={2.5}
              step={0.1}
              onChange={(v) => update("lineSpacing", v)}
              ariaLabel="Line spacing"
            />
            <Slider
              label="Letter Spacing"
              value={settings.letterSpacing}
              min={0}
              max={5}
              step={0.5}
              unit="px"
              onChange={(v) => update("letterSpacing", v)}
              ariaLabel="Letter spacing"
            />
            <Slider
              label="Word Spacing"
              value={settings.wordSpacing}
              min={0}
              max={10}
              step={0.5}
              unit="px"
              onChange={(v) => update("wordSpacing", v)}
              ariaLabel="Word spacing"
            />
          </div>
        </div>

        {/* Color / Contrast */}
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Contrast className="h-3.5 w-3.5 text-text-muted" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Color &amp; Contrast
            </p>
          </div>
          <div className="space-y-2">
            <Toggle
              label="High Contrast"
              checked={settings.highContrast}
              onChange={(v) => update("highContrast", v)}
              ariaLabel="Toggle high contrast mode"
            />
            <Toggle
              label="Inverted Colors"
              checked={settings.invertedColors}
              onChange={(v) => update("invertedColors", v)}
              ariaLabel="Toggle inverted colors"
            />
            <Toggle
              label="Reduce Motion"
              checked={settings.reduceMotion}
              onChange={(v) => update("reduceMotion", v)}
              ariaLabel="Toggle reduce motion"
            />
            <Toggle
              label="Reduce Transparency"
              checked={settings.reduceTransparency}
              onChange={(v) => update("reduceTransparency", v)}
              ariaLabel="Toggle reduce transparency"
            />

            {/* Custom color pickers */}
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-muted">Text</span>
                <input
                  type="color"
                  value={settings.customTextColor || "#ffffff"}
                  onChange={(e) => update("customTextColor", e.target.value)}
                  aria-label="Custom text color"
                  className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent"
                />
                {settings.customTextColor && (
                  <button
                    onClick={() => update("customTextColor", "")}
                    className="text-[10px] text-text-muted hover:text-text"
                    aria-label="Reset text color"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-muted">Background</span>
                <input
                  type="color"
                  value={settings.customBgColor || "#000000"}
                  onChange={(e) => update("customBgColor", e.target.value)}
                  aria-label="Custom background color"
                  className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent"
                />
                {settings.customBgColor && (
                  <button
                    onClick={() => update("customBgColor", "")}
                    className="text-[10px] text-text-muted hover:text-text"
                    aria-label="Reset background color"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Reading Aids */}
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <ScanLine className="h-3.5 w-3.5 text-text-muted" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Reading Aids
            </p>
          </div>
          <div className="space-y-2">
            <Toggle
              label="Reading Ruler"
              checked={settings.readingRuler}
              onChange={(v) => update("readingRuler", v)}
              ariaLabel="Toggle reading ruler"
            />
            <Toggle
              label="Focus Highlight"
              checked={settings.focusHighlight}
              onChange={(v) => update("focusHighlight", v)}
              ariaLabel="Toggle focus highlight"
            />
            <Toggle
              label="Bionic Reading"
              checked={settings.bionicReading}
              onChange={(v) => update("bionicReading", v)}
              ariaLabel="Toggle bionic reading mode"
            />
            <button
              onClick={speakPreview}
              className="mt-1 flex items-center gap-1.5 rounded-lg bg-bg-hover px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text"
              aria-label="Read preview text aloud"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Text-to-Speech
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-text-muted" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Live Preview
            </p>
          </div>
          <div
            className="rounded-lg border border-border bg-bg p-3"
            style={{
              fontSize: `${settings.fontSize}px`,
              fontFamily: fontFamilyValue(settings.fontFamily) || undefined,
              lineHeight: settings.lineSpacing,
              letterSpacing: `${settings.letterSpacing}px`,
              wordSpacing: `${settings.wordSpacing}px`,
              color: settings.customTextColor || undefined,
              backgroundColor: settings.customBgColor || undefined,
              filter: settings.invertedColors ? "invert(1)" : undefined,
            }}
            aria-live="polite"
            aria-label="Live preview of accessibility settings"
          >
            {settings.bionicReading ? (
              <p
                className="text-text"
                dangerouslySetInnerHTML={{ __html: bionicHTML(previewText) }}
              />
            ) : (
              <p className="text-text">{previewText}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AccessibilityToggle — toolbar button
// ---------------------------------------------------------------------------

export function AccessibilityToggle() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        title="Accessibility settings"
        aria-label="Toggle accessibility settings panel"
        aria-expanded={open}
      >
        <Accessibility className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Accessibility</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80">
          <AccessibilityPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
