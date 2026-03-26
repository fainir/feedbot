"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Users, Rss, FileText, TrendingUp, Crown, Clock } from "lucide-react";
import Link from "next/link";

interface AdminStats {
  totals: { users: number; feeds: number; articles: number };
  plans: Record<string, number>;
  schedules: Record<string, number>;
  dailySignups: Record<string, number>;
  dailyFeeds: Record<string, number>;
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-text">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="mt-1 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm text-text">{label}</span>
      <div className="flex-1">
        <div className="h-6 rounded-full bg-border">
          <div
            className={`flex h-6 items-center rounded-full pl-2 text-xs font-medium transition-all ${color}`}
            style={{ width: `${Math.max(pct, 10)}%` }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function SparkChart({ data, label }: { data: Record<string, number>; label: string }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-text">{label}</h3>
        <p className="py-4 text-center text-sm text-text-muted">No data yet</p>
      </div>
    );
  }

  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const barWidth = Math.max(Math.floor(100 / entries.length) - 1, 2);

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-text">{label}</h3>
      <div className="flex items-end gap-1" style={{ height: 100 }}>
        {entries.map(([day, count]) => {
          const h = Math.max((count / maxVal) * 80, 4);
          return (
            <div
              key={day}
              title={`${day}: ${count}`}
              className="rounded-t bg-primary/60 transition-all hover:bg-primary"
              style={{ width: `${barWidth}%`, height: h }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-text-muted">
        <span>{entries[0]?.[0]?.slice(5)}</span>
        <span>{entries[entries.length - 1]?.[0]?.slice(5)}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) {
          setError(res.status === 401 ? "Not authenticated" : "Failed to load");
          return;
        }
        setStats(await res.json());
      } catch {
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Analytics</h1>
          <p className="text-sm text-text-muted">Platform metrics and growth</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-hover" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center text-sm text-red-400">
          {error}
        </div>
      ) : stats ? (
        <>
          {/* Totals */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Users}
              label="Total Users"
              value={stats.totals.users}
              sub={`${stats.plans.pro || 0} Pro subscribers`}
            />
            <StatCard
              icon={Rss}
              label="Total Feeds"
              value={stats.totals.feeds}
              sub={`${stats.totals.users > 0 ? (stats.totals.feeds / stats.totals.users).toFixed(1) : 0} per user`}
            />
            <StatCard
              icon={FileText}
              label="Total Articles"
              value={stats.totals.articles}
              sub={`${stats.totals.feeds > 0 ? Math.round(stats.totals.articles / stats.totals.feeds) : 0} per feed`}
            />
          </div>

          {/* Charts */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <SparkChart data={stats.dailySignups} label="Daily Signups (last 30)" />
            <SparkChart data={stats.dailyFeeds} label="Daily Feed Creation (last 30)" />
          </div>

          {/* Distributions */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Plan Distribution */}
            <div className="rounded-xl border border-border bg-bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Crown className="h-4 w-4 text-secondary" />
                <h3 className="text-sm font-semibold text-text">Plan Distribution</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(stats.plans).map(([plan, count]) => (
                  <MiniBar
                    key={plan}
                    label={plan.charAt(0).toUpperCase() + plan.slice(1)}
                    value={count}
                    max={stats.totals.users}
                    color={plan === "pro" ? "bg-secondary/30 text-secondary" : "bg-primary/20 text-primary"}
                  />
                ))}
              </div>
              {stats.totals.users > 0 && (
                <p className="mt-3 text-xs text-text-muted">
                  Conversion rate: {((stats.plans.pro || 0) / stats.totals.users * 100).toFixed(1)}%
                </p>
              )}
            </div>

            {/* Schedule Distribution */}
            <div className="rounded-xl border border-border bg-bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-text">Refresh Schedules</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(stats.schedules).map(([schedule, count]) => (
                  <MiniBar
                    key={schedule}
                    label={schedule.charAt(0).toUpperCase() + schedule.slice(1)}
                    value={count}
                    max={stats.totals.feeds}
                    color="bg-primary/20 text-primary"
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
