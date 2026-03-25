import {
  Rss,
  Zap,
  Bell,
  MessageSquareText,
  ScanSearch,
  ArrowRight,
  Check,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 z-40 w-full border-b border-border/50 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Rss className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-text">FeedBot</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="#pricing"
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              Log In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-1.5 text-sm text-text-muted">
              <Zap className="h-3.5 w-3.5 text-secondary" />
              AI-powered feed curation
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-text sm:text-6xl">
              Your Internet,{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Curated
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted">
              Describe what you want to follow in plain English. FeedBot scans
              the internet, finds what matters, and delivers a personalized feed
              straight to you.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium text-text transition-colors hover:bg-bg-hover"
              >
                See Pricing
              </Link>
            </div>
          </div>

          {/* Preview mockup */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="rounded-2xl border border-border bg-bg-card p-1 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-4 text-xs text-text-muted">
                  feedbot.app/dashboard
                </span>
              </div>
              <div className="rounded-xl bg-bg p-6">
                <div className="grid gap-3">
                  {[
                    {
                      title: "GPT-5 achieves new SOTA on reasoning benchmarks",
                      source: "OpenAI Blog",
                      time: "2h ago",
                    },
                    {
                      title:
                        "Transformer alternatives: State space models explained",
                      source: "arXiv",
                      time: "4h ago",
                    },
                    {
                      title:
                        "How Anthropic trains Claude to be honest and helpful",
                      source: "Anthropic Research",
                      time: "6h ago",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-bg-card p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-text">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {item.source}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-text-muted">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-border bg-bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">How It Works</h2>
            <p className="mt-3 text-text-muted">
              Three simple steps to your perfect feed.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <StepCard
              icon={<MessageSquareText className="h-6 w-6" />}
              step={1}
              title="Describe"
              description="Tell FeedBot what you care about in plain English. No need to find RSS links or configure filters."
            />
            <StepCard
              icon={<ScanSearch className="h-6 w-6" />}
              step={2}
              title="Scan"
              description="FeedBot continuously scans blogs, news sites, forums, and social media to find matching content."
            />
            <StepCard
              icon={<Bell className="h-6 w-6" />}
              step={3}
              title="Notify"
              description="Get notified via email, push notifications, or WhatsApp. On your schedule — daily or hourly."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-3 text-text-muted">
              Start free. Upgrade when you need more.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-2">
            {/* Free Plan */}
            <div className="rounded-2xl border border-border bg-bg-card p-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-text">Free</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text">$0</span>
                  <span className="text-text-muted">/month</span>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  Perfect for getting started.
                </p>
              </div>
              <ul className="mb-8 space-y-3">
                <PricingFeature text="3 feeds" />
                <PricingFeature text="Daily updates" />
                <PricingFeature text="Email notifications" />
                <PricingFeature text="7-day history" />
              </ul>
              <Link
                href="/dashboard"
                className="block rounded-lg border border-border py-2.5 text-center text-sm font-medium text-text transition-colors hover:bg-bg-hover"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-2xl border-2 border-primary bg-bg-card p-8">
              <div className="absolute -top-3.5 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-text">Pro</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text">$9</span>
                  <span className="text-text-muted">/month</span>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  For power users who need it all.
                </p>
              </div>
              <ul className="mb-8 space-y-3">
                <PricingFeature text="Unlimited feeds" />
                <PricingFeature text="Hourly updates" />
                <PricingFeature text="Email, Push & WhatsApp" />
                <PricingFeature text="Unlimited history" />
                <PricingFeature text="Priority scanning" />
                <PricingFeature text="API access" />
              </ul>
              <Link
                href="/dashboard"
                className="block rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Start Pro Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-card/30 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Rss className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-text">FeedBot</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-text-muted">
              <Link
                href="#pricing"
                className="transition-colors hover:text-text"
              >
                Pricing
              </Link>
              <Link
                href="/dashboard"
                className="transition-colors hover:text-text"
              >
                Dashboard
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-text-muted">
            &copy; {new Date().getFullYear()} FeedBot. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  icon,
  step,
  title,
  description,
}: {
  icon: React.ReactNode;
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-bg-card p-8">
      <div className="absolute -top-3 right-6 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        {step}
      </div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text">{title}</h3>
      <p className="text-sm leading-relaxed text-text-muted">{description}</p>
    </div>
  );
}

function PricingFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-text-muted">
      <Check className="h-4 w-4 shrink-0 text-primary" />
      {text}
    </li>
  );
}
