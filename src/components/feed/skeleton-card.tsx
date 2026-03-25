export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-bg-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-5 w-3/4 rounded-md bg-bg-hover" />
          <div className="mt-2 space-y-2">
            <div className="h-4 w-full rounded-md bg-bg-hover" />
            <div className="h-4 w-5/6 rounded-md bg-bg-hover" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-4 w-4 rounded-sm bg-bg-hover" />
        <div className="h-3 w-24 rounded-md bg-bg-hover" />
        <div className="h-3 w-1 rounded bg-bg-hover" />
        <div className="h-3 w-16 rounded-md bg-bg-hover" />
      </div>
    </div>
  );
}

export function SkeletonFeed({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
