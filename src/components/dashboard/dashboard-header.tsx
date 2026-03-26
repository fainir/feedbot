"use client";

import { Suspense, lazy } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Rss, Crown, Search, Sun, Moon, Settings, Keyboard, LogOut } from "lucide-react";
import { NewItemsBell } from "@/components/feed/new-items-bell";
import { PushNotificationToggle } from "@/components/feed/push-notifications";
import { TeamFeedsBadge } from "@/components/feed/team-feeds";
import { PowerModeToggle } from "@/components/feed/keyboard-power-mode";
import { WeeklyReportButton } from "@/components/feed/weekly-report";
import { AccessibilityToggle } from "@/components/feed/accessibility-panel";
import { MilestonesButton } from "@/components/feed/reading-milestones";
import { NotificationBell } from "@/components/feed/notifications-center";
import { WhatsNew } from "@/components/feed/whats-new";
import type { FeedItem } from "@/lib/feed-types";
import type { User } from "@supabase/supabase-js";

const FeedAnalyticsPanel = lazy(() =>
  import("@/components/feed/feed-analytics").then((m) => ({ default: m.FeedAnalyticsPanel }))
);

interface DashboardHeaderProps {
  user: User | null;
  checkingOut: boolean;
  allItems: FeedItem[];
  notificationsEnabled: boolean;
  onUpgrade: () => void;
  onToggleNotifications: (enabled: boolean) => void;
  onOpenReader: (item: FeedItem) => void;
  onOpenGlobalSearch: () => void;
  onShowShortcuts: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  user,
  checkingOut,
  allItems,
  notificationsEnabled,
  onUpgrade,
  onToggleNotifications,
  onOpenReader,
  onOpenGlobalSearch,
  onShowShortcuts,
  onLogout,
}: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mb-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Rss className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-text">FeedBot</span>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onUpgrade}
          disabled={checkingOut}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-secondary to-orange-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:px-3"
        >
          <Crown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{checkingOut ? "Loading..." : "Upgrade to Pro"}</span>
          <span className="sm:hidden">{checkingOut ? "..." : "Pro"}</span>
        </button>
        {user && (
          <span className="hidden text-sm text-text-muted sm:inline">
            {user.email}
          </span>
        )}
        <NewItemsBell allItems={allItems} onOpenReader={onOpenReader} />
        <button
          onClick={onOpenGlobalSearch}
          className="hidden items-center gap-1 rounded-lg border border-border/50 px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text sm:flex"
          title="Search all feeds (Cmd+Shift+F)"
        >
          <Search className="h-3.5 w-3.5" />
          <kbd className="text-[10px]">⌘⇧F</kbd>
        </button>
        <PushNotificationToggle
          enabled={notificationsEnabled}
          onToggle={onToggleNotifications}
        />
        <Suspense><FeedAnalyticsPanel /></Suspense>
        <TeamFeedsBadge />
        <PowerModeToggle />
        <WeeklyReportButton />
        <AccessibilityToggle />
        <MilestonesButton onClick={() => {}} />
        <NotificationBell unreadCount={0} onClick={() => {}} />
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode (D)`}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <WhatsNew />
        <Link
          href="/dashboard/settings"
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
        <button
          onClick={onShowShortcuts}
          className="hidden rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text sm:flex"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="h-4 w-4" />
        </button>
        <button
          onClick={onLogout}
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
