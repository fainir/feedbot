import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — MyFeed",
  description: "How MyFeed collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border h-11 flex items-center px-4">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
          <span className="text-sm font-semibold">MyFeed</span>
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: April 4, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="text-base font-semibold text-text mb-2">What we collect</h2>
            <p>When you create an account, we collect your email address and, if you use Google sign-in, your name and profile photo. When you create custom feeds, we store your prompt text to generate personalized content.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">How we use your data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Deliver personalized feed content based on your prompts</li>
              <li>Send email digests if you opt in</li>
              <li>Improve content relevance through your reactions (thumbs up/down)</li>
              <li>Analytics to understand how the product is used (Google Analytics, Mixpanel)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Data storage</h2>
            <p>Your data is stored on Supabase (PostgreSQL) hosted in the United States. Our application is hosted on Railway. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Cookies</h2>
            <p>We use essential cookies for authentication and preferences (theme). Analytics cookies from Google Analytics and Mixpanel help us understand usage patterns. You can disable analytics cookies in your browser settings.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Third-party services</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> &mdash; authentication and database</li>
              <li><strong>Anthropic (Claude)</strong> &mdash; AI content scoring</li>
              <li><strong>Resend</strong> &mdash; email delivery</li>
              <li><strong>Google Analytics / Mixpanel</strong> &mdash; usage analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Your rights</h2>
            <p>You can request deletion of your account and all associated data at any time by contacting us. You can export your feeds via the dashboard.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Contact</h2>
            <p>Questions about this policy? Email us at <a href="mailto:hi@myfeed.space" className="text-text underline">hi@myfeed.space</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
