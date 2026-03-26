"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Search, Rss, Check, Sparkles } from "lucide-react";
import Link from "next/link";

interface FeedTemplate {
  emoji: string;
  name: string;
  prompt: string;
  category: string;
  popular?: boolean;
}

const TEMPLATES: FeedTemplate[] = [
  // Tech
  { emoji: "🤖", name: "AI & ML News", prompt: "Latest AI and machine learning breakthroughs, new models, and research papers", category: "Tech", popular: true },
  { emoji: "💻", name: "Dev Tools", prompt: "New developer tools, frameworks, programming languages, and open source projects", category: "Tech", popular: true },
  { emoji: "🔒", name: "Cybersecurity", prompt: "Security vulnerabilities, data breaches, cybersecurity best practices and tools", category: "Tech" },
  { emoji: "☁️", name: "Cloud & DevOps", prompt: "Cloud computing, Kubernetes, Docker, CI/CD, and infrastructure news", category: "Tech" },
  { emoji: "📱", name: "Mobile Dev", prompt: "iOS and Android development, React Native, Flutter, mobile UI/UX trends", category: "Tech" },
  { emoji: "🌐", name: "Web3 & Crypto", prompt: "Cryptocurrency, DeFi, blockchain technology, NFTs and Web3 development", category: "Tech" },
  { emoji: "🦀", name: "Rust Lang", prompt: "Rust programming language updates, crates, tutorials, and community news", category: "Tech" },
  { emoji: "🐍", name: "Python Ecosystem", prompt: "Python libraries, frameworks, tutorials, and community updates", category: "Tech" },

  // Business
  { emoji: "🚀", name: "Startups & Funding", prompt: "Startup funding news, product launches, and founder stories", category: "Business", popular: true },
  { emoji: "📈", name: "Stock Markets", prompt: "Stock market analysis, economic news, and investment trends", category: "Business" },
  { emoji: "💰", name: "VC & Private Equity", prompt: "Venture capital deals, fund raises, LP insights, and PE activity", category: "Business" },
  { emoji: "🏢", name: "SaaS Industry", prompt: "SaaS product launches, pricing strategies, metrics, and growth tactics", category: "Business" },
  { emoji: "📊", name: "Product Management", prompt: "Product management frameworks, case studies, OKRs, and roadmap strategies", category: "Business" },

  // Science
  { emoji: "🔬", name: "Research Papers", prompt: "New scientific research papers, breakthroughs, and peer-reviewed studies", category: "Science" },
  { emoji: "🧬", name: "Biotech & Health", prompt: "Biotechnology, drug development, clinical trials, and health tech innovation", category: "Science" },
  { emoji: "🌍", name: "Climate & Energy", prompt: "Climate change research, renewable energy, sustainability, and green tech", category: "Science" },
  { emoji: "🚀", name: "Space & Astronomy", prompt: "Space exploration, NASA missions, satellite launches, and astronomy discoveries", category: "Science" },

  // Creative
  { emoji: "🎨", name: "Design Trends", prompt: "UI/UX design trends, tools, and inspiration from Dribbble, Behance, and design blogs", category: "Creative" },
  { emoji: "✍️", name: "Content Marketing", prompt: "Content marketing strategies, SEO tips, copywriting techniques, and audience growth", category: "Creative" },
  { emoji: "🎬", name: "Creator Economy", prompt: "YouTube, TikTok, podcast, and newsletter creator news, monetization, and tools", category: "Creative" },

  // Industry
  { emoji: "🏥", name: "Healthcare", prompt: "Healthcare industry news, digital health, telemedicine, and medical devices", category: "Industry" },
  { emoji: "🏦", name: "Fintech", prompt: "Fintech startups, digital banking, payments, and financial technology innovation", category: "Industry" },
  { emoji: "🎓", name: "EdTech", prompt: "Education technology, online learning platforms, and e-learning trends", category: "Industry" },
  { emoji: "🏠", name: "PropTech", prompt: "Real estate technology, property markets, construction tech, and smart buildings", category: "Industry" },
];

const CATEGORIES = [...new Set(TEMPLATES.map((t) => t.category))];

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addedTemplates, setAddedTemplates] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<string | null>(null);

  const filtered = TEMPLATES.filter((t) => {
    if (activeCategory && t.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    }
    return true;
  });

  const addTemplate = async (template: FeedTemplate) => {
    setCreating(template.name);
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: template.name, query_text: template.prompt, description: template.prompt }),
      });
      if (res.ok) {
        setAddedTemplates((prev) => new Set([...prev, template.name]));
      }
    } catch {}
    setCreating(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Rss className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Feed Templates</h1>
            <p className="text-sm text-text-muted">Pre-built feeds for every interest. One click to add.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            !activeCategory ? "bg-primary text-white" : "text-text-muted hover:bg-bg-hover hover:text-text"
          }`}
        >
          All ({TEMPLATES.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat ? "bg-primary text-white" : "text-text-muted hover:bg-bg-hover hover:text-text"
            }`}
          >
            {cat} ({TEMPLATES.filter((t) => t.category === cat).length})
          </button>
        ))}
      </div>

      {/* Popular */}
      {!search && !activeCategory && (
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
            <Sparkles className="h-4 w-4 text-primary" />
            Most Popular
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {TEMPLATES.filter((t) => t.popular).map((template) => (
              <button
                key={template.name}
                onClick={() => !addedTemplates.has(template.name) && addTemplate(template)}
                disabled={creating === template.name || addedTemplates.has(template.name)}
                className="flex flex-col items-start rounded-xl border border-primary/20 bg-primary/5 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/10 disabled:opacity-60"
              >
                <span className="text-xl">{template.emoji}</span>
                <span className="mt-1 text-sm font-semibold text-text">{template.name}</span>
                <span className="mt-0.5 text-xs text-text-muted line-clamp-2">{template.prompt}</span>
                <div className="mt-2">
                  {addedTemplates.has(template.name) ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Check className="h-3.5 w-3.5" /> Added
                    </span>
                  ) : creating === template.name ? (
                    <span className="text-xs text-primary">Creating...</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Plus className="h-3.5 w-3.5" /> Add feed
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All Templates Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => (
          <div
            key={template.name}
            className="flex items-start gap-3 rounded-xl border border-border bg-bg-card p-4"
          >
            <span className="mt-0.5 text-lg">{template.emoji}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-text">{template.name}</h3>
              <p className="mt-0.5 text-xs text-text-muted line-clamp-2">{template.prompt}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-bg-hover px-1.5 py-0.5 text-[10px] text-text-muted">{template.category}</span>
                {addedTemplates.has(template.name) ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-400">
                    <Check className="h-3 w-3" /> Added
                  </span>
                ) : (
                  <button
                    onClick={() => addTemplate(template)}
                    disabled={creating === template.name}
                    className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    {creating === template.name ? "Adding..." : "Add feed"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <Rss className="mx-auto mb-3 h-8 w-8 text-text-muted/30" />
          <p className="text-sm text-text-muted">No templates match your search</p>
        </div>
      )}
    </div>
  );
}
