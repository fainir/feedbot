"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Mail, Smartphone, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

interface FeedSettings {
  id: string;
  name: string;
  schedule: string;
  notify_email: boolean;
  notify_push: boolean;
  notify_whatsapp: boolean;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [feeds, setFeeds] = useState<FeedSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    fetch("/api/feeds")
      .then((r) => r.json())
      .then(({ feeds }) => {
        if (feeds) {
          setFeeds(
            feeds.map((f: Record<string, unknown>) => ({
              id: f.id as string,
              name: f.name as string,
              schedule: (f.schedule as string) || "daily",
              notify_email: (f.notify_email as boolean) || false,
              notify_push: (f.notify_push as boolean) || false,
              notify_whatsapp: (f.notify_whatsapp as boolean) || false,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateFeed = async (id: string, updates: Partial<FeedSettings>) => {
    setSaving(id);
    setFeeds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );

    try {
      const res = await fetch(`/api/feeds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      toast("Settings saved", "success");
    } catch {
      toast("Failed to save settings", "error");
    }
    setSaving(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text">Settings</h1>
          <p className="text-sm text-text-muted">
            Manage notification preferences for your feeds
          </p>
        </div>
      </div>

      {/* Account */}
      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-text">Account</h2>
        <div className="text-sm text-text-muted">
          {user?.email || "Loading..."}
        </div>
      </Card>

      {/* Feed Notification Settings */}
      <h2 className="mb-3 text-sm font-semibold text-text">
        Feed Preferences
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-border bg-bg-card"
            />
          ))}
        </div>
      ) : feeds.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-text-muted">
            No feeds yet. Create one from the{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              dashboard
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {feeds.map((feed) => (
            <Card key={feed.id}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">{feed.name}</h3>
                {saving === feed.id && (
                  <span className="text-xs text-text-muted">Saving...</span>
                )}
              </div>

              {/* Schedule */}
              <div className="mb-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <Clock className="h-3.5 w-3.5" />
                  Refresh Schedule
                </label>
                <div className="flex gap-2">
                  {["daily", "hourly", "realtime"].map((schedule) => (
                    <button
                      key={schedule}
                      onClick={() => updateFeed(feed.id, { schedule })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        feed.schedule === schedule
                          ? "bg-primary text-white"
                          : "border border-border text-text-muted hover:bg-bg-hover hover:text-text"
                      }`}
                    >
                      {schedule.charAt(0).toUpperCase() + schedule.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <Bell className="h-3.5 w-3.5" />
                  Notifications
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      updateFeed(feed.id, { notify_email: !feed.notify_email })
                    }
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      feed.notify_email
                        ? "bg-primary text-white"
                        : "border border-border text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </button>
                  <button
                    onClick={() =>
                      updateFeed(feed.id, { notify_push: !feed.notify_push })
                    }
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      feed.notify_push
                        ? "bg-primary text-white"
                        : "border border-border text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Push
                  </button>
                  <button
                    onClick={() =>
                      updateFeed(feed.id, {
                        notify_whatsapp: !feed.notify_whatsapp,
                      })
                    }
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      feed.notify_whatsapp
                        ? "bg-primary text-white"
                        : "border border-border text-text-muted hover:bg-bg-hover hover:text-text"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    WhatsApp
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
