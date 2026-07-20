"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, User, Mail, Calendar, Crown, Shield, Trash2, Key, ExternalLink, BarChart3, Bell } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function AccountPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedCount, setFeedCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          const res = await fetch("/api/feeds");
          if (res.ok) {
            const { feeds } = await res.json();
            setFeedCount(feeds?.length || 0);
          }
        } catch {}
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleDeleteAccount = async () => {
    // In production, this would call a server endpoint to delete user data
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-bg-hover" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Account</h1>
          <p className="text-sm text-text-muted">Manage your account settings</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
        <h2 className="mb-4 text-base font-semibold text-text">Profile</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">Email</p>
              <p className="text-sm font-medium text-text">{user?.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">Joined</p>
              <p className="text-sm font-medium text-text">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Key className="h-4 w-4 text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">User ID</p>
              <p className="text-sm font-mono text-text-muted">{user?.id?.slice(0, 12)}...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
        <h2 className="mb-4 text-base font-semibold text-text">Plan</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-text-muted" />
            <div>
              <p className="text-sm font-medium text-text">Free Plan</p>
              <p className="text-xs text-text-muted">
                {feedCount}/3 feeds used · Daily refresh
              </p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Crown className="h-3.5 w-3.5" />
            Upgrade to Pro
          </Link>
        </div>
        <div className="mt-3 rounded-lg bg-primary/5 p-3">
          <p className="text-xs text-text-muted">
            Pro includes unlimited feeds, hourly updates, push & email notifications, API access, and priority scanning.
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
        <h2 className="mb-4 text-base font-semibold text-text">Quick Links</h2>
        <div className="space-y-2">
          {[
            { label: "Dashboard Settings", href: "/dashboard/settings", icon: Shield },
            { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
            { label: "Email Digest", href: "/dashboard/digest", icon: Mail },
            { label: "Discover Feeds", href: "/dashboard/discover", icon: BarChart3 },
            { label: "Import / Export", href: "/dashboard/import-export", icon: Key },
            { label: "Getting Started Guide", href: "/dashboard/getting-started", icon: ExternalLink },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <h2 className="mb-4 text-base font-semibold text-red-400">Danger Zone</h2>
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-border px-4 py-2 text-left text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
          >
            Sign out
          </button>
          {showDeleteConfirm ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="mb-2 text-xs text-red-400">
                This will permanently delete your account, feeds, and all data. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                >
                  Yes, delete my account
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
