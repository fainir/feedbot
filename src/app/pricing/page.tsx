import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing - MyFeed",
  description:
    "Simple, transparent pricing. Start free, upgrade when you need more.",
};

const plans = [
  {
    name: "Free",
    price: 0,
    description: "Get started with AI-curated feeds",
    cta: "Get Started",
    ctaHref: "/login?signup=true",
    highlight: false,
    features: [
      { text: "3 custom feeds", included: true },
      { text: "Daily refresh", included: true },
      { text: "100+ public feeds", included: true },
      { text: "Email notifications", included: true },
      { text: "Unlimited feeds", included: false },
      { text: "Hourly refresh", included: false },
      { text: "Email digest", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    name: "Pro",
    price: 9,
    description: "For power users who want it all",
    cta: "Upgrade to Pro",
    ctaHref: "/login?signup=true&plan=pro",
    highlight: true,
    features: [
      { text: "Unlimited custom feeds", included: true },
      { text: "Hourly refresh", included: true },
      { text: "100+ public feeds", included: true },
      { text: "Email + push notifications", included: true },
      { text: "Daily email digest", included: true },
      { text: "API access", included: true },
      { text: "Priority content scanning", included: true },
      { text: "Early access to new features", included: true },
    ],
  },
];

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel your subscription at any time from your account settings. You keep Pro access until the end of your billing period.",
  },
  {
    q: "What counts as a custom feed?",
    a: "Any feed you create with your own prompt. Public feeds in the Explore tab don't count toward your limit.",
  },
  {
    q: "How does the AI pick my content?",
    a: "We scan hundreds of RSS sources and news outlets, then use AI to match articles to your feed's topic. The more specific your prompt, the better the results.",
  },
  {
    q: "Is there a team plan?",
    a: "Not yet, but it's on our roadmap. Reach out at hi@myfeed.space if you're interested.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border h-11 flex items-center px-4">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">
            MF
          </span>
          <span className="text-sm font-semibold">MyFeed</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Start free with 3 custom feeds. Upgrade to Pro when you want
            unlimited feeds, faster refresh, and email digests.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-20">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.highlight
                  ? "border-primary bg-bg-card shadow-lg shadow-primary/10"
                  : "border-border bg-bg-card"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}

              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="text-xs text-text-muted mt-1">{plan.description}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">${plan.price}</span>
                {plan.price > 0 && (
                  <span className="text-text-muted text-sm">/mo</span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f.text}
                    className={`flex items-center gap-2 text-sm ${
                      f.included ? "text-text-muted" : "text-text-muted/40"
                    }`}
                  >
                    {f.included ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <X className="h-4 w-4 shrink-0" />
                    )}
                    {f.text}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`mt-8 block w-full text-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? "bg-primary text-white hover:bg-primary-dark"
                    : "bg-bg-hover text-text hover:bg-border"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-border bg-bg-card p-5"
              >
                <h3 className="text-sm font-semibold mb-1.5">{faq.q}</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-sm text-text-muted mb-4">
            Questions? Reach us at{" "}
            <a
              href="mailto:hi@myfeed.space"
              className="text-primary hover:underline"
            >
              hi@myfeed.space
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
