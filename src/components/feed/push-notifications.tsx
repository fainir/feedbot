"use client";

import { useState, useCallback, useEffect } from "react";
import { Bell, BellOff, BellRing, X, Check } from "lucide-react";

interface PushNotificationsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function PushNotificationToggle({ enabled, onToggle }: PushNotificationsProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      onToggle(true);
      // Show a test notification
      new Notification("FeedBot Notifications Enabled", {
        body: "You'll get notified about keyword alerts and important updates.",
        icon: "/icon-192.png",
      });
    }
  }, [onToggle]);

  const handleToggle = useCallback(() => {
    if (enabled) {
      onToggle(false);
    } else if (permission === "granted") {
      onToggle(true);
    } else if (permission === "default") {
      setShowBanner(true);
    }
  }, [enabled, permission, onToggle]);

  return (
    <>
      <button
        onClick={handleToggle}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          enabled
            ? "bg-primary/10 text-primary"
            : "text-text-muted hover:bg-bg-hover hover:text-text"
        }`}
        title={enabled ? "Disable notifications" : "Enable notifications"}
      >
        {enabled ? (
          <BellRing className="h-3.5 w-3.5" />
        ) : permission === "denied" ? (
          <BellOff className="h-3.5 w-3.5" />
        ) : (
          <Bell className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">
          {enabled ? "Alerts On" : permission === "denied" ? "Blocked" : "Alerts"}
        </span>
      </button>

      {/* Permission request banner */}
      {showBanner && permission === "default" && (
        <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-2xl border border-border bg-bg-card p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <BellRing className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text">Enable Notifications?</h3>
              <p className="mt-0.5 text-xs text-text-muted">
                Get notified when your keyword alerts match new articles, or when important stories break in your feeds.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    requestPermission();
                    setShowBanner(false);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  <Check className="h-3 w-3" />
                  Enable
                </button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="shrink-0 rounded-lg p-1 text-text-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {permission === "denied" && showBanner && (
        <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-2xl border border-red-500/30 bg-bg-card p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <BellOff className="h-5 w-5 shrink-0 text-red-400" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text">Notifications Blocked</h3>
              <p className="mt-0.5 text-xs text-text-muted">
                You&apos;ve blocked notifications. To enable them, click the lock icon in your browser&apos;s address bar and allow notifications for this site.
              </p>
            </div>
            <button onClick={() => setShowBanner(false)} className="shrink-0 rounded-lg p-1 text-text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Send a browser notification for keyword alert matches */
export function sendKeywordNotification(title: string, keyword: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  new Notification(`FeedBot Alert: "${keyword}"`, {
    body: title,
    icon: "/icon-192.png",
    tag: `keyword-${keyword}-${Date.now()}`,
  });
}
