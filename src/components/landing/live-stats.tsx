"use client";

import { useState, useEffect } from "react";
import { Users, Rss, FileText } from "lucide-react";

interface Stats {
  users: number;
  feeds: number;
  articles: number;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats || (stats.users === 0 && stats.feeds === 0)) return null;

  return (
    <div className="border-y border-border bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 py-8">
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-8 px-6 sm:gap-16">
        <StatItem icon={<Users className="h-5 w-5 text-primary" />} value={stats.users} label="Users" />
        <div className="h-8 w-px bg-border" />
        <StatItem icon={<Rss className="h-5 w-5 text-primary" />} value={stats.feeds} label="Feeds created" />
        <div className="h-8 w-px bg-border" />
        <StatItem icon={<FileText className="h-5 w-5 text-primary" />} value={stats.articles} label="Articles curated" />
      </div>
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xl font-bold text-text">{value.toLocaleString()}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}
