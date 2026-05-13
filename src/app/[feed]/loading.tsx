import { SkeletonFeed } from "@/components/feed/skeleton-card";

// Route-level loading state. Next renders this while server data is in flight
// (RSC streaming + the client useEffect fetch on /[feed]). Without it the user
// sees a blank dark page on slow networks, which reads as "broken" — we'd
// rather show real estate that telegraphs "content arriving."
export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="h-11" /> {/* header spacer, matches fixed header height */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-4 pb-12">
        <SkeletonFeed count={6} />
      </div>
    </div>
  );
}
