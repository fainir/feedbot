"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Plus, X, Sparkles, ArrowRight } from "lucide-react";

interface Tab {
  id: string;
  name: string;
  prompt: string;
}

interface FeedSuggestionsProps {
  existingFeeds: Tab[];
  onCreateFeed: (name: string, prompt: string) => void;
}

interface Suggestion {
  emoji: string;
  name: string;
  prompt: string;
  reason: string;
  category: string;
}

// Comprehensive suggestion database organized by affinity
const SUGGESTION_MAP: Record<string, Suggestion[]> = {
  ai: [
    { emoji: "🧪", name: "AI Research Papers", prompt: "Latest AI research papers from arxiv, Google DeepMind, OpenAI, and Anthropic", reason: "Deep dive into the research behind AI news", category: "research" },
    { emoji: "🤖", name: "AI Tools & Products", prompt: "New AI tools, SaaS products, and developer APIs powered by artificial intelligence", reason: "Discover tools you can use today", category: "tools" },
    { emoji: "⚖️", name: "AI Ethics & Policy", prompt: "AI regulation, ethics debates, safety research, and governance news", reason: "Understand the policy side of AI", category: "policy" },
    { emoji: "🎨", name: "AI Art & Creative", prompt: "AI-generated art, music, video tools and creative AI applications", reason: "Explore AI creativity", category: "creative" },
  ],
  startup: [
    { emoji: "💰", name: "VC & Funding", prompt: "Venture capital news, funding rounds, investor insights and dealflow", reason: "Track where the money is flowing", category: "finance" },
    { emoji: "📊", name: "SaaS Metrics", prompt: "SaaS business metrics, growth strategies, churn analysis, and pricing models", reason: "Learn from SaaS operators", category: "business" },
    { emoji: "🚀", name: "Product Hunt Daily", prompt: "Trending products and launches from Product Hunt and Hacker News Show HN", reason: "Spot emerging products early", category: "products" },
    { emoji: "👔", name: "Founder Stories", prompt: "Startup founder interviews, lessons learned, post-mortems, and success stories", reason: "Learn from founders who've been there", category: "stories" },
  ],
  dev: [
    { emoji: "🦀", name: "Rust & Systems", prompt: "Rust programming language news, systems programming, and low-level development", reason: "Follow the systems programming wave", category: "languages" },
    { emoji: "☁️", name: "Cloud & DevOps", prompt: "Cloud infrastructure news, Kubernetes, Docker, CI/CD, and platform engineering", reason: "Stay current on infrastructure", category: "infra" },
    { emoji: "🔒", name: "Security & Hacking", prompt: "Cybersecurity news, CVEs, bug bounties, and security research", reason: "Security matters for all devs", category: "security" },
    { emoji: "📱", name: "Mobile Dev", prompt: "iOS and Android development news, React Native, Flutter, and mobile UX", reason: "Mobile-first world needs mobile-first devs", category: "mobile" },
  ],
  crypto: [
    { emoji: "🏦", name: "DeFi & Protocols", prompt: "DeFi protocol news, yield farming, liquidity mining, and smart contract development", reason: "Deep dive into decentralized finance", category: "defi" },
    { emoji: "🎮", name: "Web3 & Gaming", prompt: "Web3 gaming, NFT games, blockchain game development, and metaverse news", reason: "Gaming is crypto's consumer play", category: "gaming" },
    { emoji: "📜", name: "Crypto Regulation", prompt: "Cryptocurrency regulation news, SEC actions, global crypto policy and compliance", reason: "Regulation shapes markets", category: "regulation" },
  ],
  design: [
    { emoji: "🖼️", name: "Design Systems", prompt: "Design system updates, component libraries, Figma plugins, and design tokens", reason: "Level up your design infrastructure", category: "systems" },
    { emoji: "🧠", name: "UX Research", prompt: "UX research methods, user testing insights, usability studies, and behavioral design", reason: "Design backed by data", category: "research" },
    { emoji: "✨", name: "Motion & Animation", prompt: "Motion design, CSS animations, Framer Motion, Lottie, and interaction design", reason: "Delight users with motion", category: "motion" },
  ],
  markets: [
    { emoji: "🏠", name: "Real Estate", prompt: "Real estate market trends, housing prices, commercial property, and REIT analysis", reason: "Diversify beyond stocks", category: "realestate" },
    { emoji: "🌍", name: "Global Macro", prompt: "Macroeconomic trends, central bank policy, inflation data, and global trade", reason: "Understand the big picture", category: "macro" },
    { emoji: "💎", name: "Alternative Investments", prompt: "Alternative investments, commodities, precious metals, and private equity", reason: "Beyond traditional assets", category: "alternative" },
  ],
  general: [
    { emoji: "🌐", name: "Tech Industry", prompt: "Big tech company news, FAANG updates, tech industry trends and analysis", reason: "Stay on top of the industry", category: "tech" },
    { emoji: "🔬", name: "Science & Space", prompt: "Scientific discoveries, space exploration, NASA updates, and breakthrough research", reason: "The frontier of knowledge", category: "science" },
    { emoji: "💪", name: "Health & Fitness", prompt: "Health research, nutrition science, fitness trends, and wellness technology", reason: "Optimize your wellbeing", category: "health" },
    { emoji: "📚", name: "Book Summaries", prompt: "New book releases, book summaries, author interviews, and reading recommendations", reason: "Read more, read smarter", category: "books" },
    { emoji: "🎙️", name: "Podcast Picks", prompt: "Top podcast episodes, new podcast launches, and audio content recommendations", reason: "Great content for commutes", category: "podcasts" },
  ],
};

function matchCategory(feedName: string): string {
  const name = feedName.toLowerCase();
  if (name.includes("ai") || name.includes("machine") || name.includes("ml") || name.includes("gpt")) return "ai";
  if (name.includes("startup") || name.includes("founder") || name.includes("vc")) return "startup";
  if (name.includes("dev") || name.includes("code") || name.includes("programming") || name.includes("tool")) return "dev";
  if (name.includes("crypto") || name.includes("bitcoin") || name.includes("blockchain") || name.includes("defi")) return "crypto";
  if (name.includes("design") || name.includes("ux") || name.includes("ui")) return "design";
  if (name.includes("market") || name.includes("stock") || name.includes("invest") || name.includes("finance")) return "markets";
  return "general";
}

export function FeedSuggestions({ existingFeeds, onCreateFeed }: FeedSuggestionsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const suggestions = useMemo(() => {
    // Determine which categories user is interested in
    const categories = new Set<string>();
    for (const feed of existingFeeds) {
      categories.add(matchCategory(feed.name));
    }
    // Always include general
    categories.add("general");

    // Collect relevant suggestions
    const all: Suggestion[] = [];
    for (const cat of categories) {
      const catSuggestions = SUGGESTION_MAP[cat] || [];
      all.push(...catSuggestions);
    }

    // Filter out existing feeds (fuzzy match) and dismissed
    const existingNames = new Set(existingFeeds.map((f) => f.name.toLowerCase()));
    return all.filter((s) => {
      if (dismissed.has(s.name)) return false;
      if (existingNames.has(s.name.toLowerCase())) return false;
      // Check for similar existing feeds
      for (const name of existingNames) {
        const overlap = s.name.toLowerCase().split(" ").filter((w) => name.includes(w)).length;
        if (overlap >= 2) return false;
      }
      return true;
    });
  }, [existingFeeds, dismissed]);

  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, 3);

  if (suggestions.length === 0 || existingFeeds.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold text-text">Suggested for You</h3>
        </div>
        {suggestions.length > 3 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {showAll ? "Show less" : `${suggestions.length - 3} more`}
            <ArrowRight className={`h-3 w-3 transition-transform ${showAll ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {visibleSuggestions.map((suggestion) => (
          <div
            key={suggestion.name}
            className="group relative flex flex-col rounded-lg border border-border bg-bg p-3 transition-all hover:border-primary/40"
          >
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, suggestion.name]))}
              className="absolute right-2 top-2 rounded-full p-0.5 text-text-muted opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-base">{suggestion.emoji}</span>
              <span className="text-xs font-semibold text-text">{suggestion.name}</span>
            </div>
            <p className="mb-2 flex-1 text-[10px] leading-relaxed text-text-muted">{suggestion.reason}</p>
            <button
              onClick={() => onCreateFeed(suggestion.name, suggestion.prompt)}
              className="flex items-center gap-1 self-start rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Plus className="h-3 w-3" />
              Add Feed
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
