"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, ChevronDown, ChevronRight, RefreshCw, Clock, Target, Sparkles } from "lucide-react";
import type { MarketingTask, Pillar, PILLAR_META as PillarMetaType, TaskStatus } from "@/lib/marketing-plan";

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  scheduled: "Scheduled",
  doing: "Doing",
  done: "Done",
  blocked: "Blocked",
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-bg-hover text-text-muted border-border",
  scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  doing: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  done: "bg-green-500/10 text-green-500 border-green-500/20",
  blocked: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STATUS_ORDER: TaskStatus[] = ["todo", "scheduled", "doing", "done", "blocked"];

type Metrics = {
  users: { total: number; last24h: number; last7d: number };
  feeds: { total: number; last7d: number };
  email_optins: number;
  articles: { total_7d: number; last24h: number };
  recent_feeds: { id: string; name: string; query_text: string | null; user_id: string }[];
  as_of: string;
};

export function MarketingDashboard({
  tasks,
  pillars,
}: {
  tasks: MarketingTask[];
  pillars: typeof PillarMetaType;
}) {
  const [activePillar, setActivePillar] = useState<Pillar>("launch");
  const [statusMap, setStatusMap] = useState<Record<string, TaskStatus>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Load statuses from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("myfeed-marketing-status");
      if (raw) setStatusMap(JSON.parse(raw));
    } catch {}
  }, []);

  // Load metrics
  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch("/api/marketing/metrics");
      if (res.ok) setMetrics(await res.json());
    } finally {
      setMetricsLoading(false);
    }
  };
  useEffect(() => { loadMetrics(); }, []);

  const setStatus = (id: string, status: TaskStatus) => {
    const next = { ...statusMap, [id]: status };
    setStatusMap(next);
    localStorage.setItem("myfeed-marketing-status", JSON.stringify(next));
  };

  const pillarOrder: Pillar[] = ["launch", "social", "content", "communities", "onboarding", "metrics"];
  const pillarTasks = useMemo(() => tasks.filter((t) => t.pillar === activePillar), [tasks, activePillar]);

  // Counts per pillar
  const counts = useMemo(() => {
    const c: Record<Pillar, { total: number; done: number }> = {
      launch: { total: 0, done: 0 },
      social: { total: 0, done: 0 },
      content: { total: 0, done: 0 },
      communities: { total: 0, done: 0 },
      onboarding: { total: 0, done: 0 },
      metrics: { total: 0, done: 0 },
    };
    tasks.forEach((t) => {
      c[t.pillar].total++;
      if ((statusMap[t.id] ?? t.status ?? "todo") === "done") c[t.pillar].done++;
    });
    return c;
  }, [tasks, statusMap]);

  const totalDone = Object.values(counts).reduce((s, c) => s + c.done, 0);
  const totalTasks = tasks.length;

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center justify-center w-8 h-8 bg-text text-bg rounded-lg text-xs font-extrabold tracking-tighter">MF</Link>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Marketing
              </h1>
              <p className="text-xs text-text-muted">{totalDone}/{totalTasks} tasks complete · owner-only</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadMetrics} className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-hover transition-colors" aria-label="Refresh metrics">
              <RefreshCw className={`h-4 w-4 ${metricsLoading ? "animate-spin" : ""}`} />
            </button>
            <Link href="/" className="text-xs text-text-muted hover:text-text">← Back to site</Link>
          </div>
        </div>
      </header>

      {/* Overview metrics strip */}
      <section className="mx-auto max-w-6xl px-4 pt-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <Metric label="Total signups" value={metrics ? metrics.users.total : "—"} sub={metrics ? `+${metrics.users.last7d} this week` : ""} />
          <Metric label="Custom feeds" value={metrics ? metrics.feeds.total : "—"} sub={metrics ? `+${metrics.feeds.last7d} this week` : ""} />
          <Metric label="Email opt-ins" value={metrics ? metrics.email_optins : "—"} />
          <Metric label="Articles today" value={metrics ? metrics.articles.last24h : "—"} />
          <Metric label="Articles 7d" value={metrics ? metrics.articles.total_7d : "—"} />
        </div>
      </section>

      {/* Pillar tabs */}
      <nav className="mx-auto max-w-6xl px-4 pt-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide border-b border-border">
          {pillarOrder.map((p) => {
            const meta = pillars[p];
            const c = counts[p];
            const active = p === activePillar;
            return (
              <button
                key={p}
                onClick={() => setActivePillar(p)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active ? "border-text text-text font-semibold" : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <span className="text-base">{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="text-[10px] text-text-muted tabular-nums">{c.done}/{c.total}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Pillar tagline */}
      <section className="mx-auto max-w-6xl px-4 pt-4">
        <p className="text-sm text-text-muted">{pillars[activePillar].tagline}</p>
      </section>

      {/* Tasks */}
      <section className="mx-auto max-w-6xl px-4 py-6 space-y-3">
        {pillarTasks
          .sort((a, b) => {
            const sa = statusMap[a.id] ?? a.status ?? "todo";
            const sb = statusMap[b.id] ?? b.status ?? "todo";
            return STATUS_ORDER.indexOf(sa) - STATUS_ORDER.indexOf(sb);
          })
          .map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              status={statusMap[t.id] ?? t.status ?? "todo"}
              onStatus={(s) => setStatus(t.id, s)}
            />
          ))}

        {activePillar === "metrics" && metrics && (
          <div className="rounded-2xl border border-border bg-bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Recent custom feeds ({metrics.recent_feeds.length})</h3>
            <ul className="space-y-1.5 text-sm">
              {metrics.recent_feeds.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-text-muted truncate max-w-[50%]">{f.query_text || ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-3 sm:p-4">
      <p className="text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="text-xl sm:text-2xl font-bold tabular-nums mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function TaskCard({
  task,
  status,
  onStatus,
}: {
  task: MarketingTask;
  status: TaskStatus;
  onStatus: (s: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!task.copy) return;
    await navigator.clipboard.writeText(task.copy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <header className="flex items-start gap-3 p-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-0.5 p-0.5 rounded hover:bg-bg-hover text-text-muted"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{task.title}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
            {task.channel && <span className="text-[11px] text-text-muted">· {task.channel}</span>}
            {task.effort && <span className="text-[10px] text-text-muted font-mono">· {task.effort}</span>}
          </div>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{task.why}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted flex-wrap">
            {task.scheduled && (
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {task.scheduled}</span>
            )}
            {task.metric && (
              <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> {task.metric}</span>
            )}
          </div>
        </div>
        <select
          value={status}
          onChange={(e) => onStatus(e.target.value as TaskStatus)}
          className="text-xs rounded-lg border border-border bg-bg px-2 py-1 text-text focus:outline-none focus:ring-1 focus:ring-text/30"
          aria-label="Task status"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </header>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-3 bg-bg/40">
          {task.copy && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] uppercase tracking-wider text-text-muted">Copy to paste</h4>
                <button onClick={copy} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-bg-hover transition-colors">
                  {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words text-xs bg-bg border border-border rounded-xl p-3 leading-relaxed font-sans">{task.copy}</pre>
            </div>
          )}

          {task.assets && task.assets.length > 0 && (
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-text-muted mb-2">Assets needed</h4>
              <ul className="space-y-1">
                {task.assets.map((a) => (
                  <li key={a.label} className="text-xs">
                    <span className="font-medium">{a.label}</span>
                    {a.note && <span className="text-text-muted"> — {a.note}</span>}
                    {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="ml-2 text-blue-500 hover:underline inline-flex items-center gap-1">link <ExternalLink className="h-3 w-3" /></a>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.links && task.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-bg-hover transition-colors">
                  {l.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
