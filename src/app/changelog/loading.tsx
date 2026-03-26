export default function ChangelogLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 h-10 w-56 animate-pulse rounded-lg bg-bg-hover" />
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border p-6">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-6 w-16 animate-pulse rounded-full bg-bg-hover" />
              <div className="h-4 w-24 animate-pulse rounded-md bg-bg-hover" />
            </div>
            <div className="mb-4 h-6 w-2/3 animate-pulse rounded-md bg-bg-hover" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-4 w-full animate-pulse rounded-md bg-bg-hover" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
