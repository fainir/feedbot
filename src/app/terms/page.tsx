import type { Metadata } from "next";
import { Rss, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — FeedBot",
  description: "FeedBot terms of service.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Rss className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-text">FeedBot</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-text">Terms of Service</h1>

        <div className="space-y-6 text-sm leading-relaxed text-text-muted">
          <p>Last updated: March 25, 2026</p>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Service</h2>
            <p>
              FeedBot is an AI-powered feed curation service. We provide personalized content
              feeds based on topics you describe. Content is sourced from publicly available
              web pages and does not imply endorsement.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Accounts</h2>
            <p>
              You must provide a valid email address to create an account. You are responsible
              for maintaining the security of your account. One person per account.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Free & Pro Plans</h2>
            <p>
              The Free plan includes up to 3 feeds with daily updates. The Pro plan ($9/month)
              includes unlimited feeds with hourly updates. Pro subscriptions are billed monthly
              through Stripe and can be canceled at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Acceptable Use</h2>
            <p>
              You may not use FeedBot to aggregate content for the purpose of republishing it
              as your own, to scrape or harvest data at scale, or for any unlawful purpose.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Availability</h2>
            <p>
              We aim for high availability but do not guarantee 100% uptime. Feed content
              depends on third-party sources and search APIs which may occasionally be
              unavailable.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Changes</h2>
            <p>
              We may update these terms from time to time. Continued use of FeedBot after
              changes constitutes acceptance. Material changes will be communicated via email.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Contact</h2>
            <p>Questions? Email us at support@feedbot.app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
