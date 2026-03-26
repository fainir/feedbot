import type { Metadata } from "next";
import { Rss, ArrowLeft, ArrowRight, Code, LineChart, Microscope, Newspaper, Palette, Users } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Use Cases — FeedBot | AI Feed Curation for Every Role",
  description: "Discover how developers, founders, researchers, journalists, designers, and teams use FeedBot to stay ahead. Real examples and feed setups.",
};

interface UseCase {
  icon: typeof Code;
  title: string;
  role: string;
  problem: string;
  solution: string;
  feedExamples: string[];
  quote: string;
  quoteName: string;
}

const USE_CASES: UseCase[] = [
  {
    icon: Code,
    title: "For Developers",
    role: "Software Engineers & DevOps",
    problem: "Checking HN, Reddit, dev.to, GitHub trending, and Twitter daily wastes 30+ minutes. Most content is noise.",
    solution: "Create feeds for your exact stack and interests. FeedBot searches everywhere and delivers only what's relevant.",
    feedExamples: ["New Rust crates and tutorials", "Kubernetes and cloud-native updates", "Security advisories for Node.js", "Open source projects with 100+ stars this week"],
    quote: "I replaced my morning ritual of checking 6 different sites. Now I get everything in one place in 5 minutes.",
    quoteName: "Senior Engineer, FAANG",
  },
  {
    icon: LineChart,
    title: "For Founders & VCs",
    role: "Startup Founders & Investors",
    problem: "Missing competitor moves, funding rounds, or market shifts can cost you. Manual monitoring doesn't scale.",
    solution: "Set up feeds for competitors, markets, and technologies. Get real-time alerts when things change.",
    feedExamples: ["Series A funding rounds in fintech", "Competitor product launches and updates", "SaaS pricing strategy changes", "AI startup acquisitions and exits"],
    quote: "Set up a competitor tracking feed. It caught a funding announcement 3 hours before anyone on our team saw it.",
    quoteName: "Startup Founder",
  },
  {
    icon: Microscope,
    title: "For Researchers",
    role: "Academics & Research Scientists",
    problem: "New papers drop daily on arXiv, PubMed, and conference sites. Staying current across multiple subfields is exhausting.",
    solution: "Create feeds for each research area. FeedBot surfaces papers, blog posts, and discussions you'd otherwise miss.",
    feedExamples: ["Transformer architecture alternatives", "CRISPR gene editing applications", "Climate modeling improvements", "Quantum computing error correction"],
    quote: "I have feeds for 4 different subfields. FeedBot surfaces papers I wouldn't find for weeks otherwise.",
    quoteName: "ML Researcher, University Lab",
  },
  {
    icon: Newspaper,
    title: "For Journalists",
    role: "Reporters & Editors",
    problem: "Beats require constant monitoring of sources, agencies, and social signals. Breaking news waits for no one.",
    solution: "Turn your beats into feeds. Set keyword alerts for breaking stories. Never miss what matters to your audience.",
    feedExamples: ["City council decisions and policy changes", "Tech company layoffs and hiring", "Environmental regulation updates", "Celebrity and entertainment news"],
    quote: "I turned my three beats into FeedBot feeds. My coverage speed improved dramatically.",
    quoteName: "Tech Reporter",
  },
  {
    icon: Palette,
    title: "For Designers",
    role: "UI/UX & Product Designers",
    problem: "Design trends move fast. Inspiration is scattered across Dribbble, Behance, Twitter, and dozens of blogs.",
    solution: "Aggregate design inspiration and industry news into focused feeds. Spot trends before they go mainstream.",
    feedExamples: ["UI/UX design trends 2026", "New Figma plugins and features", "Design system case studies", "Accessibility best practices"],
    quote: "FeedBot is my design trend radar. I spotted the glassmorphism revival weeks before it hit Dribbble's front page.",
    quoteName: "Product Designer",
  },
  {
    icon: Users,
    title: "For Teams",
    role: "Engineering & Product Teams",
    problem: "Keeping an entire team aligned on industry news means meetings, Slack floods, or everyone doing their own research.",
    solution: "Share curated feeds across your team. Everyone reads from the same source of truth.",
    feedExamples: ["Industry news relevant to our product", "Competitor feature launches", "Framework updates for our stack", "Customer pain points and feedback trends"],
    quote: "We replaced our 'interesting links' Slack channel with shared FeedBot feeds. Signal-to-noise ratio went from 10% to 90%.",
    quoteName: "VP of Engineering",
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
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

      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <h1 className="text-3xl font-bold text-text sm:text-4xl">Use Cases</h1>
        <p className="mt-3 max-w-2xl text-lg text-text-muted">
          See how professionals across industries use FeedBot to stay ahead.
        </p>

        <div className="mt-12 space-y-16">
          {USE_CASES.map((uc) => {
            const Icon = uc.icon;
            return (
              <div key={uc.title} className="grid gap-8 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text">{uc.title}</h2>
                      <p className="text-xs text-text-muted">{uc.role}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="mb-1 text-sm font-semibold text-red-400">The Problem</h3>
                    <p className="text-sm text-text-muted">{uc.problem}</p>
                  </div>
                  <div className="mb-4">
                    <h3 className="mb-1 text-sm font-semibold text-green-400">The Solution</h3>
                    <p className="text-sm text-text-muted">{uc.solution}</p>
                  </div>

                  <blockquote className="rounded-lg border-l-2 border-primary bg-primary/5 px-4 py-3">
                    <p className="text-sm italic text-text-muted">&ldquo;{uc.quote}&rdquo;</p>
                    <p className="mt-1 text-xs text-primary">— {uc.quoteName}</p>
                  </blockquote>
                </div>

                <div className="rounded-xl border border-border bg-bg-card p-5">
                  <h3 className="mb-3 text-sm font-semibold text-text">Example Feed Setups</h3>
                  <div className="space-y-2">
                    {uc.feedExamples.map((example) => (
                      <div key={example} className="flex items-center gap-3 rounded-lg bg-bg-hover/50 px-3 py-2">
                        <Rss className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-sm text-text-muted">{example}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/dashboard"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    Try these feeds
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 p-10 text-center">
          <h2 className="text-2xl font-bold text-text">Ready to try it?</h2>
          <p className="mt-2 text-text-muted">
            Create your first feed in 30 seconds. Free forever, no credit card.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
