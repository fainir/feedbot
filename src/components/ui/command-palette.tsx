"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Rss, Settings, BarChart3, Mail, Bookmark, Sun, Moon, Eye, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  feeds: { id: string; name: string }[];
  onSwitchTab: (id: string) => void;
  onNewTab: () => void;
  onFocusMode: () => void;
  onImport: () => void;
  onDiscover: () => void;
}

export function CommandPalette({
  feeds,
  onSwitchTab,
  onNewTab,
  onFocusMode,
  onImport,
  onDiscover,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const trapRef = useFocusTrap<HTMLDivElement>(open, { onEscape: () => setOpen(false) });

  // Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setSelectedIndex(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commands: CommandItem[] = [
    // Navigation
    { id: "nav-all", label: "Go to All feeds", icon: <Rss className="h-4 w-4" />, action: () => onSwitchTab("all"), category: "Navigation" },
    { id: "nav-saved", label: "Go to Saved items", icon: <Bookmark className="h-4 w-4" />, action: () => onSwitchTab("saved"), category: "Navigation" },
    { id: "nav-settings", label: "Open Settings", icon: <Settings className="h-4 w-4" />, action: () => router.push("/dashboard/settings"), category: "Navigation" },
    { id: "nav-digest", label: "Weekly Digest Preview", icon: <Mail className="h-4 w-4" />, action: () => router.push("/dashboard/digest"), category: "Navigation" },
    // Actions
    { id: "act-new", label: "Create new feed", icon: <Rss className="h-4 w-4" />, action: onNewTab, category: "Actions" },
    { id: "act-discover", label: "Discover feeds from URL", icon: <Search className="h-4 w-4" />, action: onDiscover, category: "Actions" },
    { id: "act-import", label: "Import OPML file", icon: <Upload className="h-4 w-4" />, action: onImport, category: "Actions" },
    { id: "act-focus", label: "Toggle focus mode", icon: <Eye className="h-4 w-4" />, action: onFocusMode, category: "Actions" },
    { id: "act-theme", label: `Switch to ${theme === "dark" ? "light" : "dark"} mode`, icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, action: () => setTheme(theme === "dark" ? "light" : "dark"), category: "Actions" },
    // Feeds
    ...feeds.map((feed) => ({
      id: `feed-${feed.id}`,
      label: `Switch to ${feed.name}`,
      icon: <Rss className="h-4 w-4" />,
      action: () => onSwitchTab(feed.id),
      category: "Feeds",
    })),
  ];

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const handleSelect = useCallback((item: CommandItem) => {
    item.action();
    setOpen(false);
    setQuery("");
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 pt-[20vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        ref={trapRef}
        className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && filtered[selectedIndex]) {
                handleSelect(filtered[selectedIndex]);
              }
            }}
            placeholder="Search commands, feeds..."
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted">Esc</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">No results</p>
          ) : (
            (() => {
              let lastCategory = "";
              return filtered.map((item, i) => {
                const showCategory = item.category !== lastCategory;
                lastCategory = item.category;
                return (
                  <div key={item.id}>
                    {showCategory && (
                      <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted/60">
                        {item.category}
                      </p>
                    )}
                    <button
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        i === selectedIndex ? "bg-primary/10 text-primary" : "text-text hover:bg-bg-hover"
                      }`}
                    >
                      <span className="shrink-0 text-text-muted">{item.icon}</span>
                      {item.label}
                    </button>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>
    </div>
  );
}
