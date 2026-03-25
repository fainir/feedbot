import { Rss } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-primary/10">
        <Rss className="h-8 w-8 text-primary" />
      </div>
      <p className="text-sm text-text-muted">Loading your feeds...</p>
    </div>
  );
}
