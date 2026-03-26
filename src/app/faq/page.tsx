import type { Metadata } from "next";
import { Rss, ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — FeedBot",
  description: "Frequently asked questions about FeedBot. Learn how AI-powered feed curation works, pricing, privacy, and more.",
};

interface FAQ {
  question: string;
  answer: string;
}

const FAQS: FAQ[] = [
  {
    question: "What is FeedBot?",
    answer: "FeedBot is an AI-powered feed aggregator. You describe what you care about in plain English — like \"AI research breakthroughs\" or \"startup funding news\" — and FeedBot searches the entire internet to build you a personalized, real-time feed. No RSS links needed.",
  },
  {
    question: "How is this different from Google Alerts?",
    answer: "Google Alerts sends you email notifications for keyword matches. FeedBot gives you a full dashboard experience with multiple feeds, reading history, bookmarks, AI summaries, sentiment analysis, and a keyboard-first interface. It's like having a personal news assistant.",
  },
  {
    question: "How is this different from Feedly?",
    answer: "Feedly requires you to find and add RSS feed URLs manually. FeedBot just asks what you care about and builds the feed for you using AI. We also include features like reading goals, sentiment badges, similar article discovery, and a command palette.",
  },
  {
    question: "Is FeedBot free?",
    answer: "Yes! The free plan includes 3 custom feed tabs, daily auto-refresh, email digest, and 7-day history. That's enough for most casual users. Pro ($9/mo) adds unlimited feeds, hourly updates, push notifications, API access, and priority scanning.",
  },
  {
    question: "Where does FeedBot get its content?",
    answer: "FeedBot uses the Brave Search API to find relevant, recent content from across the entire internet — blogs, news sites, forums, research papers, and more. We don't limit you to a predefined list of sources.",
  },
  {
    question: "Can I import my existing RSS feeds?",
    answer: "Yes! FeedBot supports OPML import, which is the standard format used by RSS readers like Feedly, Inoreader, and NewsBlur. Click the Import button on your dashboard to upload your OPML file.",
  },
  {
    question: "Is my data private?",
    answer: "Absolutely. We don't sell your data or build ad profiles. Your feeds, bookmarks, and reading history are yours. We use Supabase for secure data storage with row-level security policies. See our Privacy Policy for details.",
  },
  {
    question: "Can I share my feeds with others?",
    answer: "Yes! You can share individual feed tabs via URL, embed feeds on your website using our embed widget, and export feeds as RSS or JSON for use in other tools.",
  },
  {
    question: "Does FeedBot work offline?",
    answer: "FeedBot is a Progressive Web App (PWA) with service worker support. Previously loaded feeds and pages are cached for offline access. You can install it as an app on your phone or desktop.",
  },
  {
    question: "What keyboard shortcuts are available?",
    answer: "FeedBot is built for keyboard power users. Use J/K to navigate, O to open, R for the reader, Cmd+K for the command palette, Cmd+Shift+F for global search, and ? for the full shortcuts reference. Visit /dashboard/shortcuts for the complete list.",
  },
  {
    question: "Is there an API?",
    answer: "Yes! Pro users get full API access for creating, reading, refreshing, and exporting feeds programmatically. Visit /dashboard/api-docs for the complete API documentation with curl examples.",
  },
  {
    question: "Can I cancel my Pro subscription anytime?",
    answer: "Yes. You can cancel anytime from your account settings. Your Pro features will remain active until the end of your billing period, then you'll automatically revert to the free plan.",
  },
];

// FAQ Schema for SEO
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

function FAQItem({ question, answer }: FAQ) {
  return (
    <details className="group rounded-xl border border-border bg-bg-card">
      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-text">
        {question}
        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-5 py-4">
        <p className="text-sm leading-relaxed text-text-muted">{answer}</p>
      </div>
    </details>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
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
            Get Started Free
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
        <h1 className="text-3xl font-bold text-text">Frequently Asked Questions</h1>
        <p className="mt-2 text-text-muted">
          Everything you need to know about FeedBot.
        </p>

        <div className="mt-10 space-y-3">
          {FAQS.map((faq) => (
            <FAQItem key={faq.question} {...faq} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h2 className="text-xl font-bold text-text">Still have questions?</h2>
          <p className="mt-2 text-sm text-text-muted">
            Try FeedBot for free — no credit card required. Or reach out on Twitter.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Create Your First Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
