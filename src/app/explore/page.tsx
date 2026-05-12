"use client";

import { useState, useEffect } from "react";
import { Plus, Sparkles, X, MoreVertical, Sun, Moon, LogIn, Rss } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

// All feeds shown on Explore — 100+ topics
const FEEDS = [
  // Tech & Engineering
  { id: "ai", name: "AI & ML", icon: "🤖", description: "AI breakthroughs, LLM models, AI startups, machine learning research" },
  { id: "tech", name: "Tech", icon: "💻", description: "Tech industry news, product launches, gadgets, big tech companies" },
  { id: "dev", name: "Dev", icon: "⚡", description: "Software engineering, programming tutorials, developer tools, open source" },
  { id: "devops", name: "DevOps", icon: "🔧", description: "Cloud infrastructure, Kubernetes, CI/CD, AWS, Azure, GCP" },
  { id: "data", name: "Data", icon: "📊", description: "Data science, analytics, big data, data engineering, visualization" },
  { id: "mobile", name: "Mobile", icon: "📱", description: "iOS, Android, React Native, Flutter, mobile UX, app trends" },
  { id: "security", name: "Security", icon: "🔒", description: "Cybersecurity, data breaches, zero-day exploits, infosec tools" },
  { id: "open-source", name: "Open Source", icon: "🐙", description: "GitHub trending, FOSS, Linux, open source alternatives" },
  { id: "robotics", name: "Robotics", icon: "🦾", description: "Humanoid robots, industrial automation, drones, embodied AI" },
  { id: "web3", name: "Web3", icon: "🌐", description: "Decentralized apps, smart contracts, DAOs, blockchain development" },
  { id: "ar-vr", name: "AR / VR", icon: "🥽", description: "Augmented reality, virtual reality, Apple Vision Pro, Meta Quest" },
  { id: "quantum", name: "Quantum Computing", icon: "⚛️", description: "Quantum processors, qubits, quantum algorithms, IBM Google" },
  { id: "databases", name: "Databases", icon: "🗄️", description: "PostgreSQL, MongoDB, Redis, database design, query optimization" },
  { id: "frontend", name: "Frontend", icon: "🖥️", description: "React, Next.js, Vue, Svelte, CSS, web performance, browsers" },
  { id: "backend", name: "Backend", icon: "⚙️", description: "Node.js, Python, Go, Rust, APIs, microservices, system design" },
  { id: "ai-tools", name: "AI Tools", icon: "🛠️", description: "ChatGPT, Claude, Copilot, Cursor, AI coding assistants" },
  { id: "llm-research", name: "LLM Research", icon: "📝", description: "Language model papers, benchmarks, fine-tuning, RLHF, reasoning" },
  { id: "computer-vision", name: "Computer Vision", icon: "👁️", description: "Image recognition, object detection, diffusion models, video AI" },
  // Business & Finance
  { id: "startups", name: "Startups", icon: "🚀", description: "Startup funding, venture capital, Y Combinator, founder stories" },
  { id: "business", name: "Business", icon: "📈", description: "Business strategy, leadership, market trends, entrepreneurship" },
  { id: "crypto", name: "Crypto", icon: "₿", description: "Bitcoin, Ethereum, blockchain, DeFi, crypto market analysis" },
  { id: "fintech", name: "Fintech", icon: "💳", description: "Digital banking, payment tech, neobanks, financial APIs" },
  { id: "marketing", name: "Marketing", icon: "📣", description: "SEO, content marketing, growth hacking, social media" },
  { id: "saas", name: "SaaS", icon: "☁️", description: "SaaS business, MRR, churn, pricing, B2B software" },
  { id: "ecommerce", name: "E-commerce", icon: "🛒", description: "Online retail, Shopify, Amazon, dropshipping, DTC brands" },
  { id: "venture-capital", name: "Venture Capital", icon: "💰", description: "VC deals, funding rounds, term sheets, LP trends" },
  { id: "personal-finance", name: "Personal Finance", icon: "💵", description: "Investing, budgeting, retirement, index funds, wealth building" },
  { id: "real-estate", name: "Real Estate", icon: "🏠", description: "Property markets, REITs, PropTech, housing trends, mortgages" },
  { id: "indie-hackers", name: "Indie Hackers", icon: "🧑‍💻", description: "Solo founders, bootstrapping, side projects, revenue milestones" },
  { id: "remote-work", name: "Remote Work", icon: "🏡", description: "Distributed teams, async tools, digital nomad, hybrid work" },
  // Science & Nature
  { id: "science", name: "Science", icon: "🔬", description: "Scientific discoveries, physics breakthroughs, biology research" },
  { id: "space", name: "Space", icon: "🪐", description: "SpaceX, NASA missions, Mars, James Webb telescope, rockets" },
  { id: "health", name: "Health", icon: "🏥", description: "Medical breakthroughs, mental health, nutrition, fitness" },
  { id: "climate", name: "Climate", icon: "🌍", description: "Climate change, renewable energy, sustainability, green tech" },
  { id: "energy", name: "Energy", icon: "⚡", description: "Solar, battery storage, nuclear fusion, clean energy" },
  { id: "biotech", name: "Biotech", icon: "🧬", description: "Gene therapy, CRISPR, drug discovery, synthetic biology" },
  { id: "ev", name: "EVs", icon: "🚗", description: "Electric vehicles, Tesla, charging, autonomous driving" },
  { id: "neuroscience", name: "Neuroscience", icon: "🧠", description: "Brain research, cognitive science, neural interfaces, consciousness" },
  { id: "physics", name: "Physics", icon: "🔭", description: "Particle physics, cosmology, dark matter, quantum mechanics" },
  { id: "math", name: "Mathematics", icon: "🔢", description: "Math research, proofs, statistics, cryptography, topology" },
  { id: "psychology", name: "Psychology", icon: "🧘", description: "Behavioral science, cognitive biases, therapy research, habits" },
  { id: "astronomy", name: "Astronomy", icon: "🌌", description: "Telescopes, exoplanets, galaxies, black holes, cosmic events" },
  { id: "oceanography", name: "Oceans", icon: "🌊", description: "Ocean science, marine biology, deep sea exploration, coral reefs" },
  { id: "geology", name: "Earth Science", icon: "🌋", description: "Geology, earthquakes, volcanoes, minerals, plate tectonics" },
  // Creative & Culture
  { id: "design", name: "Design", icon: "🎨", description: "UI/UX design, product design, Figma, design systems" },
  { id: "gaming", name: "Gaming", icon: "🎮", description: "Video games, releases, esports, game development, indie" },
  { id: "music", name: "Music", icon: "🎵", description: "Music production, new releases, music tech, streaming" },
  { id: "film", name: "Film & TV", icon: "🎬", description: "Movies, TV shows, streaming platforms, filmmaking" },
  { id: "photography", name: "Photography", icon: "📷", description: "Photography tips, gear, editing, street and landscape" },
  { id: "writing", name: "Writing", icon: "✍️", description: "Creative writing, copywriting, blogging, storytelling" },
  { id: "podcasting", name: "Podcasting", icon: "🎙️", description: "Podcast production, hosting, growth, monetization" },
  { id: "animation", name: "Animation", icon: "🎞️", description: "Motion graphics, 3D animation, Blender, visual effects" },
  { id: "typography", name: "Typography", icon: "🔤", description: "Font design, type systems, lettering, web fonts" },
  // Lifestyle & Wellbeing
  { id: "productivity", name: "Productivity", icon: "⏱️", description: "Tools, time management, workflows, note-taking, GTD" },
  { id: "fitness", name: "Fitness", icon: "💪", description: "Workouts, strength training, running, sports science" },
  { id: "nutrition", name: "Nutrition", icon: "🥗", description: "Diet science, supplements, meal planning, gut health" },
  { id: "mental-health", name: "Mental Health", icon: "🧘", description: "Anxiety, depression, therapy, mindfulness, self-care" },
  { id: "cooking", name: "Cooking", icon: "👨‍🍳", description: "Recipes, cooking techniques, food science, kitchen gear" },
  { id: "travel", name: "Travel", icon: "✈️", description: "Travel destinations, budget travel, digital nomad spots" },
  { id: "parenting", name: "Parenting", icon: "👶", description: "Child development, parenting tips, education, family tech" },
  { id: "pets", name: "Pets", icon: "🐕", description: "Dog and cat care, pet health, training, animal behavior" },
  { id: "gardening", name: "Gardening", icon: "🌱", description: "Home gardening, indoor plants, permaculture, urban farming" },
  { id: "diy", name: "DIY & Maker", icon: "🔨", description: "3D printing, woodworking, electronics, Raspberry Pi, Arduino" },
  // World & Politics
  { id: "world-news", name: "World News", icon: "🗞️", description: "Global events, geopolitics, international relations" },
  { id: "us-politics", name: "US Politics", icon: "🇺🇸", description: "US elections, policy, Congress, White House, Supreme Court" },
  { id: "europe", name: "Europe", icon: "🇪🇺", description: "EU politics, European tech, Brexit aftermath, regulations" },
  { id: "china-tech", name: "China Tech", icon: "🇨🇳", description: "Chinese tech companies, regulations, AI race, manufacturing" },
  { id: "india-tech", name: "India Tech", icon: "🇮🇳", description: "Indian startups, UPI, IT industry, Bangalore tech scene" },
  { id: "middle-east", name: "Middle East", icon: "🌍", description: "Middle East tech, NEOM, Saudi Vision 2030, UAE innovation" },
  { id: "africa-tech", name: "Africa Tech", icon: "🌍", description: "African startups, mobile money, tech hubs, leapfrog innovation" },
  { id: "economics", name: "Economics", icon: "📉", description: "Macroeconomics, inflation, central banks, trade, GDP" },
  // Education & Career
  { id: "education", name: "Education", icon: "🎓", description: "EdTech, online learning, universities, teaching methods" },
  { id: "career", name: "Career", icon: "💼", description: "Job market, interviewing, salary negotiation, career growth" },
  { id: "freelancing", name: "Freelancing", icon: "🧑‍💼", description: "Freelance tips, client management, pricing, platforms" },
  { id: "leadership", name: "Leadership", icon: "👑", description: "Management, team building, executive coaching, decision-making" },
  // Niche Tech
  { id: "rust", name: "Rust", icon: "🦀", description: "Rust programming language, systems programming, WebAssembly" },
  { id: "python", name: "Python", icon: "🐍", description: "Python libraries, Django, FastAPI, data science, scripting" },
  { id: "golang", name: "Go", icon: "🐹", description: "Go programming, concurrency, microservices, CLI tools" },
  { id: "typescript", name: "TypeScript", icon: "🔷", description: "TypeScript patterns, type systems, frameworks, tooling" },
  { id: "linux", name: "Linux", icon: "🐧", description: "Linux distros, kernel development, system administration" },
  { id: "networking", name: "Networking", icon: "📡", description: "Computer networks, DNS, CDN, TCP/IP, WiFi, 5G" },
  { id: "privacy", name: "Privacy", icon: "🔐", description: "Digital privacy, encryption, VPNs, surveillance, GDPR" },
  { id: "no-code", name: "No-Code", icon: "🧩", description: "No-code tools, Bubble, Webflow, Zapier, automation" },
  { id: "3d-printing", name: "3D Printing", icon: "🖨️", description: "3D printers, materials, CAD, manufacturing, prototyping" },
  { id: "iot", name: "IoT", icon: "📟", description: "Internet of Things, smart home, sensors, edge computing" },
  // Sports & Entertainment
  { id: "sports", name: "Sports", icon: "⚽", description: "Football, basketball, tennis, Olympics, sports analytics" },
  { id: "esports", name: "Esports", icon: "🏆", description: "Competitive gaming, tournaments, teams, streaming" },
  { id: "anime", name: "Anime", icon: "🎌", description: "Anime releases, manga, Japanese culture, studios" },
  { id: "books", name: "Books", icon: "📚", description: "Book reviews, reading lists, authors, publishing industry" },
  { id: "comics", name: "Comics", icon: "💬", description: "Marvel, DC, manga, indie comics, graphic novels" },
  // Environment & Sustainability
  { id: "sustainability", name: "Sustainability", icon: "♻️", description: "Circular economy, zero waste, sustainable fashion, ESG" },
  { id: "agriculture", name: "Agriculture", icon: "🌾", description: "AgTech, vertical farming, precision agriculture, food systems" },
  { id: "wildlife", name: "Wildlife", icon: "🦁", description: "Animal conservation, endangered species, biodiversity" },
  // Emerging
  { id: "longevity", name: "Longevity", icon: "⏳", description: "Anti-aging research, senolytics, healthspan, biohacking" },
  { id: "psychedelics", name: "Psychedelics", icon: "🍄", description: "Psychedelic therapy, psilocybin research, mental health" },
  { id: "creator-economy", name: "Creator Economy", icon: "🎥", description: "YouTube, TikTok, Patreon, sponsorships, audience building" },
  { id: "legal-tech", name: "Legal Tech", icon: "⚖️", description: "AI in law, contract automation, legal AI, compliance" },
  { id: "edtech", name: "EdTech", icon: "📖", description: "Learning platforms, AI tutors, classroom tech, MOOCs" },
  { id: "food-tech", name: "Food Tech", icon: "🍔", description: "Lab-grown meat, food delivery tech, restaurant automation" },
  { id: "fashion-tech", name: "Fashion Tech", icon: "👗", description: "Wearables, smart fabrics, AI in fashion, virtual try-on" },
  { id: "proptech", name: "PropTech", icon: "🏗️", description: "Real estate tech, smart buildings, construction automation" },
  { id: "govtech", name: "GovTech", icon: "🏛️", description: "Government technology, civic tech, digital ID, e-governance" },
  { id: "insurtech", name: "InsurTech", icon: "🛡️", description: "Insurance technology, parametric insurance, claims AI" },
];

// Default 15 tabs for navigation
const NAV_TAB_IDS = new Set(["ai","tech","startups","dev","science","crypto","design","security","gaming","business","space","health","open-source","robotics","energy"]);
const TABS = FEEDS.filter(f => NAV_TAB_IDS.has(f.id));

interface CommunityFeed {
  id: string;
  name: string;
  slug: string;
  description: string;
  query_text: string;
  creator: string;
  isSystem: boolean;
  followers: number;
  createdAt: string;
}

export default function ExplorePage() {
  const [showNewFeed, setShowNewFeed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [makePublic, setMakePublic] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [communityFeeds, setCommunityFeeds] = useState<CommunityFeed[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"default" | "popular" | "newest">("default");

  useEffect(() => setMounted(true), []);
  useEffect(() => { createClient().auth.getUser().then(({ data: { user } }) => setUser(user)); }, []);
  useEffect(() => {
    fetch("/api/public/community?sort=followers")
      .then((r) => r.json())
      .then((d) => setCommunityFeeds((d.feeds || []).filter((f: CommunityFeed) => !f.isSystem)))
      .catch(() => {})
      .finally(() => setLoadingCommunity(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Single top bar — fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg-card border-b border-border flex items-center h-11">
        <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
          <span className="flex items-center justify-center w-7 h-7 bg-text text-bg rounded-md text-[12px] font-black leading-none" style={{ letterSpacing: "-0.02em" }}>MF</span>
        </Link>
        <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-0 min-w-0">
          <Link href="/" className="px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-text-muted hover:text-text hover:bg-bg-hover transition-colors flex items-center gap-1">
            <Rss className="h-3 w-3" /><span className="hidden sm:inline">My Feed</span>
          </Link>
          {TABS.map((tab) => (
            <Link key={tab.id} href={`/${tab.id}`} className="px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-text-muted hover:text-text hover:bg-bg-hover transition-colors flex items-center gap-1">
              <span className="text-sm">{tab.icon}</span><span className="hidden sm:inline">{tab.name}</span>
            </Link>
          ))}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 ml-0.5 border-l border-border/50">
          <button onClick={() => setShowNewFeed(true)} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap">
            <Sparkles className="h-3 w-3" /><span className="hidden sm:inline">Create feed</span><span className="sm:hidden">New</span>
          </button>
          {!user && (
            <Link href="/login?signup=true" className="text-[11px] font-semibold bg-text text-bg px-3 py-1 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap">Sign in</Link>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="relative inline-flex items-center justify-center p-1.5 rounded-full before:absolute before:content-[''] before:-inset-2.5 sm:before:hidden hover:bg-bg-hover transition-colors" aria-label="More options"><MoreVertical className="h-4 w-4 text-text-muted" /></button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-lg py-1 z-50" onMouseLeave={() => setShowMenu(false)}>
                {mounted && <button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{theme === "dark" ? "Light mode" : "Dark mode"}</button>}
                {!user && <Link href="/login" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}><LogIn className="h-4 w-4" />Sign in</Link>}
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="h-11" />

      {/* Explore content */}
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Public Feeds</h1>
          <p className="text-text-muted text-sm">Browse and follow feeds from the community.</p>
        </div>
        <input type="text" placeholder="Search feeds..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-bg-hover border border-border rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-text/50" aria-label="Search feeds" />
        <div className="flex items-center gap-2 mb-4">
          {(["default", "popular", "newest"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={`text-xs px-3 py-1 rounded-full ${sort === s ? "bg-text text-bg" : "border border-border text-text-muted hover:text-text"}`}>
              {s === "default" ? "All" : s === "popular" ? "Most popular" : "Newest"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* System feeds */}
          {FEEDS.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase())).map((feed) => (
            <Link key={feed.id} href={`/${feed.id}`} className="group p-4 rounded-xl border border-border bg-bg-card hover:border-text/20 hover:bg-bg-hover/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{feed.icon}</span>
                <h3 className="font-semibold text-text group-hover:text-text/80 transition-colors">{feed.name}</h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{feed.description}</p>
              <p className="text-[10px] text-text-muted mt-2">Curated · Updated continuously</p>
            </Link>
          ))}

          {/* Community public feeds */}
          {communityFeeds
            .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => {
              if (sort === "popular") return b.followers - a.followers;
              if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              return 0;
            })
            .map((feed) => (
            <div key={feed.id} className="group p-4 rounded-xl border border-border bg-bg-card hover:border-text/20 hover:bg-bg-hover/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative">
              <Link href={`/${feed.slug || feed.id}`} className="block">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📡</span>
                  <h3 className="font-semibold text-text group-hover:text-text/80 transition-colors truncate">{feed.name}</h3>
                </div>
                <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mb-1">{feed.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  <span>by {feed.creator}</span>
                  <span>{feed.followers} followers</span>
                </div>
              </Link>
              {user && (
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await fetch(`/api/feeds/${feed.id}/follow`, { method: "POST" });
                      setCommunityFeeds((prev) => prev.map((f) => f.id === feed.id ? { ...f, followers: f.followers + 1 } : f));
                    } catch {}
                  }}
                  className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-text-muted hover:text-text hover:border-text/30 transition-colors"
                >
                  + Follow
                </button>
              )}
            </div>
          ))}

          {/* Create custom feed card */}
          <button onClick={() => setShowNewFeed(true)} className="group p-4 rounded-xl border border-dashed border-text/20 hover:border-text/40 bg-bg-card/50 hover:bg-bg-hover/30 transition-all text-left">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl flex items-center justify-center w-8 h-8 rounded-lg bg-text/5"><Sparkles className="h-5 w-5 text-text-muted group-hover:text-text transition-colors" /></span>
              <h3 className="font-semibold text-text-muted group-hover:text-text transition-colors">Create Custom Feed</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">Describe any topic in plain English. AI will curate content from across the internet.</p>
          </button>
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-border bg-gradient-to-br from-indigo-500/10 via-bg-card to-purple-500/10 p-6 sm:p-8 text-center">
          <h2 className="text-lg font-bold mb-2">Share your feeds with the world</h2>
          <p className="text-sm text-text-muted mb-4 max-w-md mx-auto">Create a feed, make it public, and anyone can discover and follow it.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {user ? (
              <button onClick={() => setShowNewFeed(true)} className="inline-flex items-center gap-1.5 bg-text text-bg px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"><Sparkles className="h-4 w-4" />Create a public feed</button>
            ) : (
              <Link href="/login?signup=true" className="inline-flex items-center gap-1.5 bg-text text-bg px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"><Sparkles className="h-4 w-4" />Create your free account</Link>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 mt-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-text-muted">
          <span>MyFeed &copy; {new Date().getFullYear()}</span>
          <Link href="/privacy" className="hover:text-text transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-text transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-text transition-colors">Contact</Link>
        </div>
      </footer>

      {/* New Feed Modal */}
      {showNewFeed && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewFeed(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-text/5 flex items-center justify-center"><Sparkles className="h-4 w-4 text-text" /></div><h2 className="font-bold text-lg">Create a Feed</h2></div>
                <button onClick={() => setShowNewFeed(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4 ml-10">Describe what you want to follow. AI will find the best content.</p>
              <textarea autoFocus placeholder="e.g. Latest React and Next.js tutorials, new CSS features" className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 transition-all placeholder:text-text-muted/50" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input type="checkbox" checked={makePublic} onChange={(e) => setMakePublic(e.target.checked)} className="rounded border-border" />
                <span className="text-xs text-text-muted">Make this feed public - others can discover and follow it</span>
              </label>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowNewFeed(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                {user ? (
                  <button onClick={async () => { if (!newPrompt.trim()) return; try { const res = await fetch("/api/feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPrompt.slice(0, 40), query_text: newPrompt, is_public: makePublic }) }); const data = await res.json(); const id = data.feed?.id; if (id) { fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {}); window.location.href = `/my/${id}`; return; } } catch {} window.location.href = "/dashboard"; }} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Create feed</button>
                ) : (
                  <Link href={`/login?signup=true${newPrompt ? `&prompt=${encodeURIComponent(newPrompt)}` : ""}`} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Sign up to create</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
