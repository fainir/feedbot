"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Rss,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MOCK_FEEDS = [
  { id: "1", name: "AI Research", color: "#6366f1" },
  { id: "2", name: "Startup News", color: "#f59e0b" },
  { id: "3", name: "Web Dev", color: "#22c55e" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeFeed, setActiveFeed] = useState<string | null>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-bg-card transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Rss className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-text">FeedBot</span>
          )}
        </div>

        {/* Feed list */}
        <nav className="flex-1 overflow-y-auto p-3">
          {!collapsed && (
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Feeds
            </p>
          )}
          <div className="space-y-1">
            <button
              onClick={() => setActiveFeed(null)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                activeFeed === null
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-bg-hover hover:text-text"
              )}
            >
              <Rss className="h-4 w-4 shrink-0" />
              {!collapsed && <span>All Feeds</span>}
            </button>

            {MOCK_FEEDS.map((feed) => (
              <button
                key={feed.id}
                onClick={() => setActiveFeed(feed.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  activeFeed === feed.id
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-bg-hover hover:text-text"
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: feed.color }}
                />
                {!collapsed && (
                  <span className="truncate">{feed.name}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-border p-3 space-y-1">
          {collapsed ? (
            <Button variant="ghost" size="icon" className="w-full">
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              New Feed
            </Button>
          )}
          <Link
            href="#"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text",
              collapsed && "justify-center"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </Link>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-10 items-center justify-center border-t border-border text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-bg">{children}</main>
    </div>
  );
}
