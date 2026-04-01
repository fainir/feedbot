import { Rss, ExternalLink, Globe, Clock } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "FeedBot Embed",
  robots: { index: false, follow: false },
};

// This is a placeholder for embeddable feed widget
// In production, this would fetch feed data server-side
export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rss className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-text">FeedBot</span>
          </div>
          <Link
            href={`/dashboard`}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
            target="_blank"
          >
            Open in FeedBot
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Feed items will be loaded client-side or via API */}
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <p className="text-center text-sm text-text-muted">
              Feed embed for ID: {id}
            </p>
            <p className="mt-2 text-center text-xs text-text-muted">
              Embed this feed on your website with:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-md bg-bg p-2 text-[10px] text-text-muted">
              {`<iframe src="${process.env.NEXT_PUBLIC_APP_URL || "https://feedbot-eight.vercel.app"}/embed/${id}" width="100%" height="500" frameborder="0"></iframe>`}
            </pre>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-[10px] text-text-muted hover:text-primary"
            target="_blank"
          >
            Powered by FeedBot — AI-curated feeds
          </Link>
        </div>
      </div>
    </div>
  );
}
