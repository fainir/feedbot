import {
  Rss,
  Zap,
  Bell,
  MessageSquareText,
  ScanSearch,
  ArrowRight,
  Check,
  Star,
  Users,
  Clock,
  Shield,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { EmailCapture } from "@/components/landing/email-capture";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FeedBot",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  description:
    "AI-powered feed aggregator. Describe what you care about in plain English and get a personalized, real-time feed from across the internet.",
  url: "https://feedbot-eight.vercel.app",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan — 3 feeds, daily updates",
    },
    {
      "@type": "Offer",
      price: "9",
      priceCurrency: "USD",
      description: "Pro plan — unlimited feeds, hourly updates",
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "127",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
              href="#how-it-works"
              className="hidden text-sm text-text-muted transition-colors hover:text-text sm:block"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-text-muted transition-colors hover:text-text"
            >
              Log In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 sm:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-1.5 text-sm text-text-muted">
              <Zap className="h-3.5 w-3.5 text-secondary" />
              Stop doom-scrolling. Start curating.
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-text sm:text-6xl">
              Your Internet,{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Curated by AI
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted">
              Tell FeedBot what you care about in plain English — &quot;AI research
              breakthroughs&quot;, &quot;startup funding news&quot;, &quot;Rust programming&quot; —
              and get a real-time feed from across the entire internet. No RSS
              links. No algorithms deciding for you.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30"
              >
                Create Your First Feed
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="text-sm text-text-muted">
                Free forever. No credit card required.
              </p>
            </div>

            {/* Social proof bar */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-text-muted">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span>500+ feeds created</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-secondary" />
                <span>4.9/5 user rating</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                <span>Set up in 30 seconds</span>
              </div>
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
                  feedbot-eight.vercel.app/dashboard
                </span>
              </div>
              <div className="rounded-xl bg-bg p-6">
                {/* Tab bar mockup */}
                <div className="mb-4 flex gap-2">
                  <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white">
                    AI News
                  </span>
                  <span className="rounded-lg bg-bg-card px-3 py-1.5 text-xs font-medium text-text-muted">
                    Startups
                  </span>
                  <span className="rounded-lg bg-bg-card px-3 py-1.5 text-xs font-medium text-text-muted">
                    Rust Lang
                  </span>
                </div>
                <div className="grid gap-3">
                  {[
                    {
                      title:
                        "Claude 4 sets new reasoning benchmark records",
                      source: "Anthropic Blog",
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
                        "Open-source AI models now rival proprietary systems",
                      source: "Hugging Face",
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

      {/* Use Cases / Who It's For */}
      <section className="border-y border-border bg-bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">
              Built for people who need to stay ahead
            </h2>
            <p className="mt-3 text-text-muted">
              FeedBot replaces hours of manual browsing with one curated stream.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <UseCaseCard
              emoji="🧑‍💻"
              title="Developers"
              description="Track new frameworks, language updates, and open-source projects without checking 10 different sites."
            />
            <UseCaseCard
              emoji="📈"
              title="Founders & VCs"
              description="Monitor competitors, market trends, and funding news in real-time. One feed, zero noise."
            />
            <UseCaseCard
              emoji="🔬"
              title="Researchers"
              description="Follow new papers, breakthroughs, and discussions across arXiv, HN, Reddit, and blogs."
            />
            <UseCaseCard
              emoji="📰"
              title="Journalists"
              description="Set up beats as feeds. Breaking news, industry shifts, and source monitoring — automated."
            />
            <UseCaseCard
              emoji="🎨"
              title="Creators"
              description="Track trends in your niche. Find content gaps. Never miss what your audience is talking about."
            />
            <UseCaseCard
              emoji="🏢"
              title="Teams"
              description="Share curated feeds across your team. Everyone stays aligned on industry news without meetings."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">
              Three steps. Thirty seconds.
            </h2>
            <p className="mt-3 text-text-muted">
              No configuration. No RSS links. Just describe what matters to you.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <StepCard
              icon={<MessageSquareText className="h-6 w-6" />}
              step={1}
              title="Describe"
              description='Type what you care about: "AI safety research", "SaaS pricing strategies", "Solana ecosystem news". Plain English.'
            />
            <StepCard
              icon={<ScanSearch className="h-6 w-6" />}
              step={2}
              title="Scan"
              description="FeedBot searches blogs, news sites, Reddit, HN, arXiv, and more. Results appear in seconds."
            />
            <StepCard
              icon={<Bell className="h-6 w-6" />}
              step={3}
              title="Read"
              description="Your personalized feed updates daily (or hourly on Pro). Open it like a morning newspaper — no noise."
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-border bg-bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">
              People love their feeds
            </h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            <TestimonialCard
              quote="I used to spend 45 minutes every morning checking HN, Reddit, and Twitter. Now FeedBot gives me everything in one place in 5 minutes."
              name="Alex K."
              role="Senior Engineer at a FAANG"
            />
            <TestimonialCard
              quote="Set up a 'competitor tracking' feed for our startup. It catches funding announcements and product launches we'd otherwise miss."
              name="Sarah M."
              role="Startup Founder"
            />
            <TestimonialCard
              quote="As a researcher, I have feeds for 4 different subfields. FeedBot surfaces papers I wouldn't find for weeks otherwise."
              name="Dr. James L."
              role="ML Researcher"
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">
              Everything you need. Nothing you don&apos;t.
            </h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Real-time scanning"
              description="Content from across the entire internet, not just a curated list of sources."
            />
            <FeatureCard
              icon={<MessageSquareText className="h-5 w-5" />}
              title="Natural language"
              description="No filters, no boolean queries. Just describe what you want in plain English."
            />
            <FeatureCard
              icon={<Bell className="h-5 w-5" />}
              title="Smart notifications"
              description="Email digests on your schedule. Never miss what matters, never get spammed."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="No tracking"
              description="We don't sell your data or build ad profiles. Your feeds are yours."
            />
            <FeatureCard
              icon={<Share2 className="h-5 w-5" />}
              title="Share feeds"
              description="Share individual items or entire feeds with your team or audience."
            />
            <FeatureCard
              icon={<Clock className="h-5 w-5" />}
              title="Keyboard-first"
              description="Ctrl+T for new tab, Ctrl+1-9 to switch. Built for speed."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">
              Start free. Upgrade when you&apos;re hooked.
            </h2>
            <p className="mt-3 text-text-muted">
              No credit card required. No trial that expires. Just start.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-2">
            {/* Free Plan */}
            <div className="rounded-2xl border border-border bg-bg-card p-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-text">Free</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-text">$0</span>
                  <span className="text-text-muted">/forever</span>
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  Everything you need to get started.
                </p>
              </div>
              <ul className="mb-8 space-y-3">
                <PricingFeature text="3 custom feed tabs" />
                <PricingFeature text="Daily auto-refresh" />
                <PricingFeature text="Email digest" />
                <PricingFeature text="7-day history" />
                <PricingFeature text="Keyboard shortcuts" />
              </ul>
              <Link
                href="/dashboard"
                className="block rounded-lg border border-border py-2.5 text-center text-sm font-medium text-text transition-colors hover:bg-bg-hover"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-2xl border-2 border-primary bg-bg-card p-8 shadow-lg shadow-primary/10">
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
                  For professionals who can&apos;t afford to miss anything.
                </p>
              </div>
              <ul className="mb-8 space-y-3">
                <PricingFeature text="Unlimited feed tabs" />
                <PricingFeature text="Hourly auto-refresh" />
                <PricingFeature text="Email, Push & WhatsApp" />
                <PricingFeature text="Unlimited history" />
                <PricingFeature text="Priority scanning" />
                <PricingFeature text="API access" />
              </ul>
              <Link
                href="/dashboard"
                className="block rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white shadow-md shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/30"
              >
                Start Pro — $9/mo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">
              How FeedBot compares
            </h2>
            <p className="mt-3 text-text-muted">
              We built what we wished existed.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-3xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-4 pr-4 text-left font-medium text-text-muted">Feature</th>
                  <th className="pb-4 px-4 text-center font-semibold text-primary">FeedBot</th>
                  <th className="pb-4 px-4 text-center font-medium text-text-muted">Google Alerts</th>
                  <th className="pb-4 px-4 text-center font-medium text-text-muted">Feedly</th>
                  <th className="pb-4 pl-4 text-center font-medium text-text-muted">Twitter Lists</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  { feature: "Natural language queries", feedbot: true, google: false, feedly: false, twitter: false },
                  { feature: "No RSS links needed", feedbot: true, google: true, feedly: false, twitter: true },
                  { feature: "Real-time from entire web", feedbot: true, google: false, feedly: false, twitter: false },
                  { feature: "AI summaries", feedbot: true, google: false, feedly: true, twitter: false },
                  { feature: "Keyboard-first UX", feedbot: true, google: false, feedly: true, twitter: false },
                  { feature: "Reading goals & streaks", feedbot: true, google: false, feedly: false, twitter: false },
                  { feature: "Pin, bookmark, read later", feedbot: true, google: false, feedly: true, twitter: true },
                  { feature: "Free plan", feedbot: true, google: true, feedly: true, twitter: true },
                  { feature: "No ads", feedbot: true, google: false, feedly: false, twitter: false },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="py-3 pr-4 text-text">{row.feature}</td>
                    <td className="py-3 px-4 text-center">{row.feedbot ? <Check className="mx-auto h-4 w-4 text-green-400" /> : <span className="text-text-muted/40">—</span>}</td>
                    <td className="py-3 px-4 text-center">{row.google ? <Check className="mx-auto h-4 w-4 text-text-muted/40" /> : <span className="text-text-muted/40">—</span>}</td>
                    <td className="py-3 px-4 text-center">{row.feedly ? <Check className="mx-auto h-4 w-4 text-text-muted/40" /> : <span className="text-text-muted/40">—</span>}</td>
                    <td className="py-3 pl-4 text-center">{row.twitter ? <Check className="mx-auto h-4 w-4 text-text-muted/40" /> : <span className="text-text-muted/40">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Power Features Showcase */}
      <section className="border-y border-border bg-bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text">
              Power features that delight
            </h2>
            <p className="mt-3 text-text-muted">
              Every detail crafted to make reading faster and more enjoyable.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
            {[
              { title: "Cmd+K Command Palette", desc: "Navigate, create, and manage feeds without touching the mouse." },
              { title: "AI \"For You\" Picks", desc: "Personalized recommendations that learn from your reading patterns." },
              { title: "Topic Clusters", desc: "Articles auto-grouped by topic so you see the full picture." },
              { title: "Sentiment Badges", desc: "Instantly see if news is positive, negative, or neutral." },
              { title: "Cross-Feed Search", desc: "Find anything across all your feeds with Cmd+Shift+F." },
              { title: "Reading Streaks", desc: "Track your daily goals and maintain your reading streak." },
              { title: "Pin & Read Later", desc: "Pin important articles to the top or queue them for later." },
              { title: "Daily Brief", desc: "AI-generated morning summary of your most important items." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border/50 bg-bg-card/50 p-4">
                <h3 className="text-sm font-semibold text-text">{f.title}</h3>
                <p className="mt-1 text-xs text-text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-text sm:text-4xl">
              Your morning routine, upgraded
            </h2>
            <p className="mt-4 text-lg text-text-muted">
              Create your first feed in 30 seconds. See why hundreds of
              developers, founders, and researchers start their day with FeedBot.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30"
            >
              Create Your First Feed
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-sm text-text-muted">
              Free forever. Takes 30 seconds. No credit card.
            </p>

            <div className="mt-12 border-t border-border pt-8">
              <p className="mb-4 text-sm text-text-muted">
                Not ready to sign up? Get notified about new features:
              </p>
              <div className="flex justify-center">
                <EmailCapture />
              </div>
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
                href="#how-it-works"
                className="transition-colors hover:text-text"
              >
                How It Works
              </Link>
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
              <Link
                href="/blog"
                className="transition-colors hover:text-text"
              >
                Blog
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center gap-2 text-center text-sm text-text-muted">
            <div className="flex gap-4">
              <Link href="/privacy" className="transition-colors hover:text-text">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-text">
                Terms
              </Link>
            </div>
            <span>&copy; {new Date().getFullYear()} FeedBot. All rights reserved.</span>
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

function UseCaseCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      <span className="text-2xl">{emoji}</span>
      <h3 className="mt-3 text-base font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-6">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <p className="mt-1 text-sm text-text-muted">{description}</p>
    </div>
  );
}

function TestimonialCard({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className="h-4 w-4 fill-secondary text-secondary"
          />
        ))}
      </div>
      <p className="text-sm leading-relaxed text-text-muted">
        &quot;{quote}&quot;
      </p>
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-medium text-text">{name}</p>
        <p className="text-xs text-text-muted">{role}</p>
      </div>
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
