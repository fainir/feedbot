export default function FAQLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 h-10 w-32 animate-pulse rounded-lg bg-bg-hover" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-border p-5">
            <div className="h-5 w-3/4 animate-pulse rounded-md bg-bg-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}
