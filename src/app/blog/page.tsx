import type { Metadata } from "next";
import { Rss, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — FeedBot | AI-Powered Feed Curation",
  description:
    "Tips, guides, and insights on AI-powered content curation. Learn how to build the perfect personalized feed and stay ahead of information overload.",
  openGraph: {
    title: "FeedBot Blog — AI-Powered Feed Curation",
    description:
      "Tips, guides, and insights on AI-powered content curation.",
  },
};

const posts = [
  {
    slug: "why-rss-is-dead",
    title: "Why RSS Is Dead (And What Replaced It)",
    excerpt:
      "RSS was revolutionary. But in 2026, nobody wants to manually find and paste feed URLs. Here's how AI-powered curation is the natural evolution — and why FeedBot exists.",
    date: "2026-03-20",
    readTime: "4 min read",
    category: "Product",
  },
  {
    slug: "information-overload",
    title: "The Information Overload Problem (And How to Solve It)",
    excerpt:
      "The average knowledge worker checks 7+ news sources daily. Most of that time is wasted on irrelevant content. There's a better way: describe what matters, let AI do the rest.",
    date: "2026-03-18",
    readTime: "5 min read",
    category: "Productivity",
  },
  {
    slug: "build-perfect-feed",
    title: "How to Build the Perfect Personalized News Feed in 30 Seconds",
    excerpt:
      "Step-by-step guide to creating a curated feed that surfaces exactly what you need. With examples for developers, founders, researchers, and creators.",
    date: "2026-03-15",
    readTime: "3 min read",
    category: "Guide",
  },
  {
    slug: "ai-vs-algorithms",
    title: "AI Curation vs. Algorithmic Feeds: What's the Difference?",
    excerpt:
      "Twitter, TikTok, and YouTube use algorithms optimized for engagement. FeedBot uses AI optimized for relevance. Here's why that distinction matters for your productivity.",
    date: "2026-03-12",
    readTime: "6 min read",
    category: "Deep Dive",
  },
  {
    slug: "developer-feeds",
    title: "5 Feed Setups Every Developer Should Have",
    excerpt:
      "From tracking new frameworks to monitoring security advisories — here are the 5 feeds that keep top engineers informed without the noise.",
    date: "2026-03-10",
    readTime: "4 min read",
    category: "Guide",
  },
  {
    slug: "keyboard-first-reading",
    title: "Keyboard-First Reading: How Power Users Consume 3x More Content",
    excerpt:
      "J/K navigation, Cmd+K command palette, and global search with Cmd+Shift+F. Here's how FeedBot's keyboard shortcuts turn casual readers into power users.",
    date: "2026-03-25",
    readTime: "3 min read",
    category: "Productivity",
  },
  {
    slug: "sentiment-analysis-news",
    title: "Reading the News by Mood: How Sentiment Analysis Changes Your Feed",
    excerpt:
      "FeedBot now tags every article as positive, negative, or neutral. Learn how to use sentiment badges to prioritize what you read and manage information anxiety.",
    date: "2026-03-24",
    readTime: "4 min read",
    category: "Feature",
  },
  {
    slug: "reading-goals-streaks",
    title: "Build a Reading Habit with Goals and Streaks",
    excerpt:
      "Set daily reading targets, track your progress with visual rings, and maintain streaks. The science behind gamification and how it helps you stay informed.",
    date: "2026-03-23",
    readTime: "5 min read",
    category: "Productivity",
  },
  {
    slug: "feedbot-vs-feedly-2026",
    title: "FeedBot vs Feedly in 2026: A Comprehensive Comparison",
    excerpt:
      "Feedly requires RSS links. FeedBot just asks what you care about. We compare features, pricing, and user experience across both platforms.",
    date: "2026-03-22",
    readTime: "6 min read",
    category: "Comparison",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
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
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to FeedBot
          </Link>
        </div>

        <h1 className="mb-4 text-4xl font-bold text-text">Blog</h1>
        <p className="mb-12 text-lg text-text-muted">
          Insights on AI curation, productivity, and staying informed without
          the noise.
        </p>

        <div className="space-y-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="group rounded-2xl border border-border bg-bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {post.category}
                </span>
                <span className="text-xs text-text-muted">{post.date}</span>
                <span className="text-xs text-text-muted">
                  {post.readTime}
                </span>
              </div>
              <h2 className="mb-2 text-xl font-bold text-text group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-text-muted">
                {post.excerpt}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Read more
                <ArrowRight className="h-3 w-3" />
              </span>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-text">
            Ready to curate your internet?
          </h2>
          <p className="mb-6 text-text-muted">
            Create your first personalized feed in 30 seconds. Free forever.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Create Your First Feed
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
