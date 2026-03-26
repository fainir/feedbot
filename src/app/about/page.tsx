import type { Metadata } from "next";
import { Rss, ArrowLeft, Heart, Zap, Shield, Globe } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — FeedBot",
  description: "Learn about FeedBot's mission to help people stay informed without the noise. Our story, values, and what drives us.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
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
            Get Started
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        <h1 className="text-3xl font-bold text-text">About FeedBot</h1>
        <p className="mt-4 text-lg leading-relaxed text-text-muted">
          FeedBot was born from a simple frustration: staying informed shouldn&apos;t
          require checking a dozen websites every morning. We built the tool we
          wished existed — an AI-powered feed that understands what you care about
          and delivers it in one place.
        </p>

        <div className="mt-12 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-text">Our Mission</h2>
            <p className="mt-3 text-text-muted">
              We believe everyone deserves access to the information that matters
              to them — without algorithms optimized for engagement, without
              paywalls on curation, and without the noise that comes from
              general-purpose social feeds. FeedBot puts you in control.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-text">Our Values</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Heart, title: "User-First", desc: "Every feature is designed for the reader, not for advertisers. We don't sell your data or show ads." },
                { icon: Zap, title: "Speed", desc: "FeedBot is keyboard-first and fast. We respect your time — every interaction is optimized for speed." },
                { icon: Shield, title: "Privacy", desc: "Your reading habits are yours. We use secure infrastructure and never build advertising profiles." },
                { icon: Globe, title: "Open Web", desc: "We believe in the open internet. FeedBot supports RSS, OPML, and provides full API access to your data." },
              ].map((value) => (
                <div key={value.title} className="rounded-xl border border-border bg-bg-card p-5">
                  <value.icon className="mb-2 h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold text-text">{value.title}</h3>
                  <p className="mt-1 text-xs text-text-muted">{value.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text">The Numbers</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: "75+", label: "Features" },
                { value: "20", label: "API Endpoints" },
                { value: "24", label: "Feed Templates" },
                { value: "500+", label: "Feeds Created" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="mt-1 text-xs text-text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text">Built With</h2>
            <p className="mt-3 text-text-muted">
              FeedBot is built with Next.js, TypeScript, Tailwind CSS, Supabase,
              Brave Search API, and Stripe. Hosted on Vercel. We use modern web
              standards including PWA support for offline access.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h2 className="text-xl font-bold text-text">Try FeedBot today</h2>
          <p className="mt-2 text-sm text-text-muted">
            Free forever. Create your first feed in 30 seconds.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}
