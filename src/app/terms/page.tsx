import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — MyFeed",
  description: "Terms and conditions for using MyFeed.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border h-11 flex items-center px-4">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
          <span className="text-sm font-semibold">MyFeed</span>
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: April 4, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="text-base font-semibold text-text mb-2">Acceptance</h2>
            <p>By using MyFeed (myfeed.space), you agree to these terms. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">The service</h2>
            <p>MyFeed is an AI-powered content aggregator. We scan publicly available RSS feeds and web sources, score articles using AI, and present them in curated feeds. We do not host or own the content &mdash; all articles link to their original sources.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Accounts</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide a valid email address to create an account</li>
              <li>You are responsible for keeping your credentials secure</li>
              <li>You may not use the service for spam, scraping, or abuse</li>
              <li>We may suspend accounts that violate these terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Content</h2>
            <p>Articles displayed on MyFeed are sourced from third-party publishers via their public RSS feeds. MyFeed does not claim ownership of this content. If you are a publisher and want your content removed, contact us.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Availability</h2>
            <p>We aim to keep MyFeed available 24/7 but do not guarantee uptime. The service is provided &ldquo;as is&rdquo; without warranties of any kind. We may modify or discontinue features at any time.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Limitation of liability</h2>
            <p>MyFeed is not liable for any damages arising from your use of the service, including but not limited to inaccurate content, service interruptions, or data loss.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Changes</h2>
            <p>We may update these terms at any time. Continued use of the service constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text mb-2">Contact</h2>
            <p>Questions? Email <a href="mailto:hello@myfeed.space" className="text-text underline">hello@myfeed.space</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
