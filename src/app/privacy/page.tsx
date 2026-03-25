import type { Metadata } from "next";
import { Rss, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — FeedBot",
  description: "FeedBot privacy policy. How we handle your data.",
};

export default function PrivacyPage() {
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

        <h1 className="mb-8 text-3xl font-bold text-text">Privacy Policy</h1>

        <div className="space-y-6 text-sm leading-relaxed text-text-muted">
          <p>Last updated: March 25, 2026</p>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">What We Collect</h2>
            <p>
              When you create an account, we collect your email address and password (hashed).
              When you use FeedBot, we store your feed configurations (topics you follow) and
              feed items we generate for you.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">How We Use Your Data</h2>
            <p>
              Your data is used solely to provide the FeedBot service — generating and delivering
              personalized feeds based on your topics. We do not sell your data to third parties.
              We do not build advertising profiles. We do not share your reading habits.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Supabase</strong> — authentication and database hosting</li>
              <li><strong>Stripe</strong> — payment processing (we never see your card details)</li>
              <li><strong>Vercel</strong> — hosting and analytics (anonymous page views only)</li>
              <li><strong>Brave Search API</strong> — web search for feed generation</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Data Retention</h2>
            <p>
              Free accounts retain 7 days of feed history. Pro accounts have unlimited history.
              If you delete your account, all your data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Cookies</h2>
            <p>
              We use essential cookies for authentication only. No tracking cookies. No
              third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text">Your Rights</h2>
            <p>
              You can export or delete your data at any time from your dashboard settings.
              For any privacy-related questions, contact us at privacy@feedbot.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
