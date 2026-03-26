export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-bg-hover" />
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border p-6">
            <div className="mb-3 h-6 w-3/4 animate-pulse rounded-md bg-bg-hover" />
            <div className="mb-2 h-4 w-full animate-pulse rounded-md bg-bg-hover" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-bg-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}
