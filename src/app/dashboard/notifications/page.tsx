"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Bell, Mail, Smartphone, Clock, Save, Check } from "lucide-react";
import Link from "next/link";

interface NotificationPrefs {
  emailDigest: boolean;
  emailFrequency: "daily" | "weekly" | "never";
  pushEnabled: boolean;
  pushNewItems: boolean;
  pushKeywordAlerts: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailDigest: true,
  emailFrequency: "daily",
  pushEnabled: false,
  pushNewItems: true,
  pushKeywordAlerts: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  quietHoursEnabled: false,
};

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("myfeed-notification-prefs");
      if (saved) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const save = useCallback(() => {
    localStorage.setItem("myfeed-notification-prefs", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [prefs]);

  const update = <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Notifications</h1>
            <p className="text-sm text-text-muted">Choose how you want to be notified</p>
          </div>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      {/* Email Notifications */}
      <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text">Email Digest</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text">Enable email digest</p>
              <p className="text-xs text-text-muted">Receive a summary of your feeds via email</p>
            </div>
            <button
              onClick={() => update("emailDigest", !prefs.emailDigest)}
              className={`relative h-6 w-11 rounded-full transition-colors ${prefs.emailDigest ? "bg-primary" : "bg-border"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs.emailDigest ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </label>

          {prefs.emailDigest && (
            <div>
              <p className="mb-2 text-xs text-text-muted">Frequency</p>
              <div className="flex gap-2">
                {(["daily", "weekly"] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => update("emailFrequency", freq)}
                    className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                      prefs.emailFrequency === freq
                        ? "bg-primary text-white"
                        : "border border-border text-text-muted hover:bg-bg-hover"
                    }`}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Push Notifications */}
      <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text">Push Notifications</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text">Enable push notifications</p>
              <p className="text-xs text-text-muted">Get browser notifications for important updates</p>
            </div>
            <button
              onClick={() => update("pushEnabled", !prefs.pushEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${prefs.pushEnabled ? "bg-primary" : "bg-border"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs.pushEnabled ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </label>

          {prefs.pushEnabled && (
            <>
              <label className="flex items-center justify-between">
                <p className="text-sm text-text">New items in feeds</p>
                <button
                  onClick={() => update("pushNewItems", !prefs.pushNewItems)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${prefs.pushNewItems ? "bg-primary" : "bg-border"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs.pushNewItems ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between">
                <p className="text-sm text-text">Keyword alert matches</p>
                <button
                  onClick={() => update("pushKeywordAlerts", !prefs.pushKeywordAlerts)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${prefs.pushKeywordAlerts ? "bg-primary" : "bg-border"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs.pushKeywordAlerts ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text">Quiet Hours</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text">Enable quiet hours</p>
              <p className="text-xs text-text-muted">Pause all notifications during set hours</p>
            </div>
            <button
              onClick={() => update("quietHoursEnabled", !prefs.quietHoursEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${prefs.quietHoursEnabled ? "bg-primary" : "bg-border"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs.quietHoursEnabled ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </label>

          {prefs.quietHoursEnabled && (
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs text-text-muted">From</label>
                <input
                  type="time"
                  value={prefs.quietHoursStart}
                  onChange={(e) => update("quietHoursStart", e.target.value)}
                  className="mt-1 block rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
              <span className="mt-5 text-text-muted">to</span>
              <div>
                <label className="text-xs text-text-muted">Until</label>
                <input
                  type="time"
                  value={prefs.quietHoursEnd}
                  onChange={(e) => update("quietHoursEnd", e.target.value)}
                  className="mt-1 block rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
