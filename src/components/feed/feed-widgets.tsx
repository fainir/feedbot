"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Code, Layout, ExternalLink, Copy, Check, Flame, BarChart3, BookOpen, Rss } from "lucide-react";

// --- Types ---

type WidgetType = "reading-stats" | "currently-reading" | "top-sources" | "reading-streak";
type WidgetTheme = "light" | "dark" | "auto";
type WidgetSize = "small" | "medium" | "large";
type WidgetRadius = "none" | "rounded" | "pill";
type CodeTab = "html" | "markdown";

interface WidgetConfig {
  type: WidgetType;
  theme: WidgetTheme;
  size: WidgetSize;
  radius: WidgetRadius;
  showBranding: boolean;
}

interface MockData {
  articlesThisWeek: number;
  weeklyHistory: number[];
  currentArticle: { title: string; source: string } | null;
  topSources: { name: string; count: number }[];
  streak: number;
}

// --- Constants ---

const WIDGET_TYPES: { type: WidgetType; label: string; description: string; icon: React.ReactNode }[] = [
  { type: "reading-stats", label: "Reading Stats Badge", description: "Articles read this week with bar chart", icon: <BarChart3 className="h-4 w-4" /> },
  { type: "currently-reading", label: "Currently Reading", description: "Last article you read", icon: <BookOpen className="h-4 w-4" /> },
  { type: "top-sources", label: "Top Sources", description: "Your top 3 sources with bars", icon: <Rss className="h-4 w-4" /> },
  { type: "reading-streak", label: "Reading Streak", description: "Current streak with flame", icon: <Flame className="h-4 w-4" /> },
];

const SIZE_MAP: Record<WidgetSize, number> = { small: 200, medium: 300, large: 400 };

const RADIUS_MAP: Record<WidgetRadius, string> = { none: "0", rounded: "12px", pill: "9999px" };

// --- Helpers ---

function loadMockData(): MockData {
  let articlesThisWeek = 12;
  let weeklyHistory = [2, 3, 1, 4, 2, 0, 0];
  let currentArticle: MockData["currentArticle"] = { title: "Understanding Transformer Architectures", source: "ArXiv" };
  let topSources: MockData["topSources"] = [
    { name: "TechCrunch", count: 8 },
    { name: "Hacker News", count: 6 },
    { name: "ArXiv", count: 4 },
  ];
  let streak = 5;

  try {
    const goals = localStorage.getItem("feedbot-reading-goals");
    if (goals) {
      const parsed = JSON.parse(goals);
      const history = parsed.history || {};
      const days = Object.keys(history).sort().slice(-7);
      weeklyHistory = days.map((d: string) => history[d] || 0);
      articlesThisWeek = weeklyHistory.reduce((a: number, b: number) => a + b, 0);
    }

    const readItems = localStorage.getItem("feedbot-read-items");
    if (readItems) {
      const parsed = JSON.parse(readItems);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const last = parsed[parsed.length - 1];
        if (last && last.title) {
          currentArticle = { title: last.title, source: last.source || "Unknown" };
        }
      }
    }
  } catch {}

  return { articlesThisWeek, weeklyHistory, currentArticle, topSources, streak };
}

function getThemeStyles(theme: WidgetTheme): { bg: string; text: string; muted: string; accent: string; border: string } {
  if (theme === "dark") {
    return { bg: "#1a1a2e", text: "#e0e0e0", muted: "#8888aa", accent: "#6c63ff", border: "#2a2a4a" };
  }
  // light and auto default to light inline (auto uses prefers-color-scheme in embed)
  return { bg: "#ffffff", text: "#1a1a2e", muted: "#6b7280", accent: "#6c63ff", border: "#e5e7eb" };
}

// --- Embed Code Generators ---

function generateHtmlEmbed(config: WidgetConfig, data: MockData): string {
  const { type, theme, size, radius, showBranding } = config;
  const w = SIZE_MAP[size];
  const r = RADIUS_MAP[radius];
  const s = getThemeStyles(theme);
  const autoMedia = theme === "auto" ? `@media(prefers-color-scheme:dark){.feedbot-widget{background:#1a1a2e!important;color:#e0e0e0!important;border-color:#2a2a4a!important}}` : "";

  let innerHtml = "";

  if (type === "reading-stats") {
    const bars = data.weeklyHistory
      .map((v, i) => {
        const h = Math.max(4, (v / Math.max(...data.weeklyHistory, 1)) * 28);
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:100%;height:${h}px;background:${s.accent};border-radius:3px"></div></div>`;
      })
      .join("");
    innerHtml = `<div style="display:flex;align-items:center;gap:10px"><div style="font-size:24px;font-weight:700;color:${s.accent}">${data.articlesThisWeek}</div><div><div style="font-size:12px;font-weight:600;color:${s.text}">articles read this week</div><div style="font-size:10px;color:${s.muted}">on FeedBot</div></div></div><div style="display:flex;align-items:end;gap:3px;height:32px;margin-top:8px">${bars}</div>`;
  } else if (type === "currently-reading") {
    const article = data.currentArticle;
    innerHtml = `<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${s.muted};margin-bottom:6px">Currently Reading</div><div style="font-size:13px;font-weight:600;color:${s.text};line-height:1.3">${article?.title || "Nothing yet"}</div><div style="font-size:11px;color:${s.muted};margin-top:4px">${article?.source || ""}</div>`;
  } else if (type === "top-sources") {
    const maxCount = Math.max(...data.topSources.map((s) => s.count), 1);
    const sourceBars = data.topSources
      .slice(0, 3)
      .map(
        (src) =>
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div style="width:60px;font-size:11px;color:${s.text};text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${src.name}</div><div style="flex:1;height:12px;background:${s.border};border-radius:6px;overflow:hidden"><div style="height:100%;width:${(src.count / maxCount) * 100}%;background:${s.accent};border-radius:6px"></div></div><div style="font-size:10px;color:${s.muted};width:20px">${src.count}</div></div>`
      )
      .join("");
    innerHtml = `<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${s.muted};margin-bottom:8px">Top Sources</div>${sourceBars}`;
  } else if (type === "reading-streak") {
    innerHtml = `<div style="display:flex;align-items:center;gap:10px"><div style="font-size:28px">🔥</div><div><div style="font-size:22px;font-weight:700;color:${s.accent}">${data.streak} days</div><div style="font-size:11px;color:${s.muted}">reading streak on FeedBot</div></div></div>`;
  }

  const branding = showBranding
    ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid ${s.border};font-size:9px;color:${s.muted};text-align:right">Powered by FeedBot</div>`
    : "";

  return `<!-- FeedBot Widget -->\n<div class="feedbot-widget" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;width:${w}px;padding:16px;background:${s.bg};color:${s.text};border:1px solid ${s.border};border-radius:${r};box-sizing:border-box">${autoMedia ? `<style>${autoMedia}</style>` : ""}${innerHtml}${branding}</div>`;
}

function generateMarkdownBadge(config: WidgetConfig, data: MockData): string {
  const { type } = config;
  if (type === "reading-stats") {
    return `[![FeedBot Reading Stats](https://img.shields.io/badge/FeedBot-${data.articlesThisWeek}%20articles%20this%20week-6c63ff?style=flat-square&logo=bookopen)](https://feedbot.app)`;
  }
  if (type === "currently-reading") {
    const title = (data.currentArticle?.title || "Nothing").replace(/[[\]()]/g, "");
    return `[![Currently Reading](https://img.shields.io/badge/Reading-${encodeURIComponent(title).slice(0, 40)}-6c63ff?style=flat-square)](https://feedbot.app)`;
  }
  if (type === "top-sources") {
    const top = data.topSources[0]?.name || "None";
    return `[![Top Source](https://img.shields.io/badge/Top%20Source-${encodeURIComponent(top)}-6c63ff?style=flat-square)](https://feedbot.app)`;
  }
  // reading-streak
  return `[![Reading Streak](https://img.shields.io/badge/🔥%20Streak-${data.streak}%20days-orange?style=flat-square)](https://feedbot.app)`;
}

// --- Widget Preview Component ---

export function WidgetPreview({ config, data }: { config: WidgetConfig; data: MockData }) {
  const { type, theme, size, radius, showBranding } = config;
  const w = SIZE_MAP[size];
  const r = RADIUS_MAP[radius];
  const isDark = theme === "dark";

  const previewBg = isDark ? "bg-[#1a1a2e]" : "bg-white";
  const previewText = isDark ? "text-gray-200" : "text-gray-900";
  const previewMuted = isDark ? "text-gray-500" : "text-gray-400";
  const previewBorder = isDark ? "border-[#2a2a4a]" : "border-gray-200";
  const accentColor = "bg-primary";

  return (
    <div
      className={`border ${previewBorder} ${previewBg} ${previewText} p-4`}
      style={{ width: w, borderRadius: r, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {type === "reading-stats" && (
        <>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-bold text-primary">{data.articlesThisWeek}</span>
            <div>
              <div className="text-xs font-semibold">articles read this week</div>
              <div className={`text-[10px] ${previewMuted}`}>on FeedBot</div>
            </div>
          </div>
          <div className="mt-2 flex items-end gap-0.5" style={{ height: 32 }}>
            {data.weeklyHistory.map((v, i) => {
              const max = Math.max(...data.weeklyHistory, 1);
              const h = Math.max(4, (v / max) * 28);
              return <div key={i} className={`flex-1 ${accentColor} rounded-sm`} style={{ height: h }} />;
            })}
          </div>
        </>
      )}

      {type === "currently-reading" && (
        <>
          <div className={`text-[10px] uppercase tracking-widest ${previewMuted} mb-1.5`}>Currently Reading</div>
          <div className="text-[13px] font-semibold leading-snug">{data.currentArticle?.title || "Nothing yet"}</div>
          <div className={`mt-1 text-[11px] ${previewMuted}`}>{data.currentArticle?.source || ""}</div>
        </>
      )}

      {type === "top-sources" && (
        <>
          <div className={`text-[10px] uppercase tracking-widest ${previewMuted} mb-2`}>Top Sources</div>
          {data.topSources.slice(0, 3).map((src, i) => {
            const max = Math.max(...data.topSources.map((s) => s.count), 1);
            return (
              <div key={i} className="mb-1.5 flex items-center gap-2">
                <span className="w-[60px] truncate text-right text-[11px]">{src.name}</span>
                <div className={`h-3 flex-1 overflow-hidden rounded-full ${isDark ? "bg-[#2a2a4a]" : "bg-gray-100"}`}>
                  <div className={`h-full ${accentColor} rounded-full`} style={{ width: `${(src.count / max) * 100}%` }} />
                </div>
                <span className={`w-5 text-[10px] ${previewMuted}`}>{src.count}</span>
              </div>
            );
          })}
        </>
      )}

      {type === "reading-streak" && (
        <div className="flex items-center gap-2.5">
          <span className="text-[28px]">🔥</span>
          <div>
            <div className="text-[22px] font-bold text-primary">{data.streak} days</div>
            <div className={`text-[11px] ${previewMuted}`}>reading streak on FeedBot</div>
          </div>
        </div>
      )}

      {showBranding && (
        <div className={`mt-2 border-t ${previewBorder} pt-1.5 text-right text-[9px] ${previewMuted}`}>
          Powered by FeedBot
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export function FeedWidgets() {
  const [config, setConfig] = useState<WidgetConfig>({
    type: "reading-stats",
    theme: "light",
    size: "medium",
    radius: "rounded",
    showBranding: true,
  });
  const [codeTab, setCodeTab] = useState<CodeTab>("html");
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<MockData>({
    articlesThisWeek: 12,
    weeklyHistory: [2, 3, 1, 4, 2, 0, 0],
    currentArticle: { title: "Understanding Transformer Architectures", source: "ArXiv" },
    topSources: [
      { name: "TechCrunch", count: 8 },
      { name: "Hacker News", count: 6 },
      { name: "ArXiv", count: 4 },
    ],
    streak: 5,
  });

  useEffect(() => {
    setData(loadMockData());
  }, []);

  const embedCode = useMemo(() => {
    if (codeTab === "html") return generateHtmlEmbed(config, data);
    return generateMarkdownBadge(config, data);
  }, [config, data, codeTab]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [embedCode]);

  const updateConfig = useCallback(<K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
          <Code className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-text">Embeddable Widgets</h3>
        <ExternalLink className="ml-auto h-3.5 w-3.5 text-text-muted" />
      </div>

      {/* Widget Gallery */}
      <div className="mb-4">
        <p className="mb-2 text-xs text-text-muted">Choose a widget</p>
        <div className="grid grid-cols-2 gap-2">
          {WIDGET_TYPES.map((w) => (
            <button
              key={w.type}
              onClick={() => updateConfig("type", w.type)}
              className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                config.type === w.type
                  ? "border-primary bg-primary/5"
                  : "border-border bg-bg hover:bg-bg-hover/50"
              }`}
            >
              <div className={`mt-0.5 shrink-0 ${config.type === w.type ? "text-primary" : "text-text-muted"}`}>
                {w.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-text">{w.label}</div>
                <div className="text-[10px] text-text-muted">{w.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Customization */}
      <div className="mb-4 space-y-3 rounded-lg border border-border bg-bg p-3">
        <p className="text-xs font-medium text-text">Customize</p>

        {/* Theme */}
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Theme</label>
          <div className="flex gap-1.5">
            {(["light", "dark", "auto"] as WidgetTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => updateConfig("theme", t)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                  config.theme === t
                    ? "bg-primary text-white"
                    : "bg-bg-hover text-text-muted hover:text-text"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Size</label>
          <div className="flex gap-1.5">
            {(["small", "medium", "large"] as WidgetSize[]).map((s) => (
              <button
                key={s}
                onClick={() => updateConfig("size", s)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                  config.size === s
                    ? "bg-primary text-white"
                    : "bg-bg-hover text-text-muted hover:text-text"
                }`}
              >
                {s} ({SIZE_MAP[s]}px)
              </button>
            ))}
          </div>
        </div>

        {/* Border Radius */}
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Border Radius</label>
          <div className="flex gap-1.5">
            {(["none", "rounded", "pill"] as WidgetRadius[]).map((r) => (
              <button
                key={r}
                onClick={() => updateConfig("radius", r)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                  config.radius === r
                    ? "bg-primary text-white"
                    : "bg-bg-hover text-text-muted hover:text-text"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Branding Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-text-muted">FeedBot Branding</label>
          <button
            onClick={() => updateConfig("showBranding", !config.showBranding)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              config.showBranding ? "bg-primary" : "bg-border"
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                config.showBranding ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Layout className="h-3.5 w-3.5 text-text-muted" />
          <p className="text-xs font-medium text-text">Preview</p>
        </div>
        <div className="flex justify-center rounded-lg border border-dashed border-border bg-bg p-4">
          <WidgetPreview config={config} data={data} />
        </div>
      </div>

      {/* Code Generator */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-3.5 w-3.5 text-text-muted" />
            <p className="text-xs font-medium text-text">Embed Code</p>
          </div>
          <div className="flex rounded-md bg-bg-hover p-0.5">
            <button
              onClick={() => setCodeTab("html")}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                codeTab === "html" ? "bg-bg-card text-text shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              HTML Embed
            </button>
            <button
              onClick={() => setCodeTab("markdown")}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                codeTab === "markdown" ? "bg-bg-card text-text shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              Markdown Badge
            </button>
          </div>
        </div>

        <div className="relative">
          <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-bg p-3 text-[11px] leading-relaxed text-text-muted">
            <code>{embedCode}</code>
          </pre>
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-bg-card px-2 py-1 text-[10px] font-medium text-text-muted shadow-sm transition-colors hover:text-text"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
