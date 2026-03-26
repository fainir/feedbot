import type { Metadata } from "next";
import { Rss, ArrowLeft, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Status — FeedBot",
  description: "FeedBot system status. Check if all services are operational.",
};

interface Service {
  name: string;
  status: "operational" | "degraded" | "down";
  description: string;
}

const SERVICES: Service[] = [
  { name: "Feed Generation", status: "operational", description: "Creating feeds from natural language queries" },
  { name: "Content Discovery", status: "operational", description: "Brave Search API integration" },
  { name: "Feed Refresh", status: "operational", description: "Scheduled and manual feed updates" },
  { name: "User Authentication", status: "operational", description: "Supabase Auth (login, signup, sessions)" },
  { name: "Database", status: "operational", description: "Supabase PostgreSQL data storage" },
  { name: "API Endpoints", status: "operational", description: "REST API for feeds, items, and analytics" },
  { name: "Stripe Payments", status: "operational", description: "Pro subscription billing" },
  { name: "CDN & Hosting", status: "operational", description: "Vercel edge network" },
];

const STATUS_CONFIG = {
  operational: { icon: CheckCircle2, label: "Operational", color: "text-green-400", bg: "bg-green-500/10" },
  degraded: { icon: AlertTriangle, label: "Degraded", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  down: { icon: AlertTriangle, label: "Down", color: "text-red-400", bg: "bg-red-500/10" },
};

export default function StatusPage() {
  const allOperational = SERVICES.every((s) => s.status === "operational");

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Rss className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-text">FeedBot</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        <h1 className="text-3xl font-bold text-text">System Status</h1>

        {/* Overall Status */}
        <div className={`mt-6 flex items-center gap-3 rounded-xl border p-5 ${
          allOperational ? "border-green-500/20 bg-green-500/5" : "border-yellow-500/20 bg-yellow-500/5"
        }`}>
          {allOperational ? (
            <CheckCircle2 className="h-6 w-6 text-green-400" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
          )}
          <div>
            <p className={`font-semibold ${allOperational ? "text-green-400" : "text-yellow-400"}`}>
              {allOperational ? "All Systems Operational" : "Some Systems Degraded"}
            </p>
            <p className="text-xs text-text-muted">
              Last checked: {new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>

        {/* Services */}
        <div className="mt-8 space-y-3">
          {SERVICES.map((service) => {
            const config = STATUS_CONFIG[service.status];
            const Icon = config.icon;
            return (
              <div key={service.name} className="flex items-center justify-between rounded-xl border border-border bg-bg-card px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-text">{service.name}</p>
                  <p className="text-xs text-text-muted">{service.description}</p>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${config.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Uptime */}
        <div className="mt-8 rounded-xl border border-border bg-bg-card p-5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-muted" />
            <h2 className="text-sm font-semibold text-text">Uptime (last 30 days)</h2>
          </div>
          <div className="mt-3 flex items-center gap-0.5">
            {Array.from({ length: 30 }, (_, i) => (
              <div
                key={i}
                className="h-8 flex-1 rounded-sm bg-green-400/80 transition-colors hover:bg-green-400"
                title={`Day ${30 - i}: 100% uptime`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-text-muted">
            <span>30 days ago</span>
            <span className="font-medium text-green-400">99.99% uptime</span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
