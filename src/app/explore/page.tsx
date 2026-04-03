"use client";

import { useState, useEffect } from "react";
import { Plus, Sparkles, X, MoreVertical, Sun, Moon, LogIn } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

const FEEDS = [
  { id: "ai", name: "AI & ML", icon: "🤖", description: "AI breakthroughs, LLM models, AI startups, machine learning research" },
  { id: "tech", name: "Tech", icon: "💻", description: "Tech industry news, product launches, gadgets, big tech companies" },
  { id: "startups", name: "Startups", icon: "🚀", description: "Startup funding rounds, venture capital, Y Combinator, founder stories" },
  { id: "dev", name: "Dev", icon: "⚡", description: "Software engineering, programming tutorials, developer tools, open source" },
  { id: "science", name: "Science", icon: "🔬", description: "Scientific discoveries, space exploration, physics, biology research" },
  { id: "crypto", name: "Crypto", icon: "₿", description: "Bitcoin, Ethereum, blockchain, DeFi, Web3, crypto market analysis" },
  { id: "design", name: "Design", icon: "🎨", description: "UI/UX design, product design, Figma, design systems, visual trends" },
  { id: "security", name: "Security", icon: "🔒", description: "Cybersecurity, data breaches, zero-day exploits, infosec tools" },
  { id: "gaming", name: "Gaming", icon: "🎮", description: "Video games, game releases, esports, game development, indie games" },
  { id: "business", name: "Business", icon: "📈", description: "Business strategy, leadership, market trends, entrepreneurship" },
  { id: "space", name: "Space", icon: "🪐", description: "SpaceX launches, NASA missions, Mars exploration, satellites" },
  { id: "health", name: "Health", icon: "🏥", description: "Health research, medical breakthroughs, mental health, biotech" },
  { id: "climate", name: "Climate", icon: "🌍", description: "Climate change, renewable energy, sustainability, green tech" },
  { id: "fintech", name: "Fintech", icon: "💳", description: "Digital banking, payment tech, neobanks, financial APIs" },
  { id: "devops", name: "DevOps", icon: "🔧", description: "Cloud infrastructure, Kubernetes, CI/CD, AWS, Azure, GCP" },
  { id: "data", name: "Data", icon: "📊", description: "Data science, analytics, big data, data engineering, visualization" },
  { id: "mobile", name: "Mobile", icon: "📱", description: "iOS, Android, React Native, Flutter, mobile UX, app trends" },
  { id: "marketing", name: "Marketing", icon: "📣", description: "SEO, content marketing, growth hacking, social media, email" },
];

const TABS = FEEDS; // reuse for nav

export default function ExplorePage() {
  const [showNewFeed, setShowNewFeed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => { createClient().auth.getUser().then(({ data: { user } }) => setUser(user)); }, []);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Single top bar */}
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border flex items-center h-11">
        <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
          <span className="flex items-center justify-center w-6 h-6 bg-text text-bg rounded-md text-[10px] font-extrabold tracking-tighter">MF</span>
        </Link>
        <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-0 min-w-0">
          <Link href="/" className="px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-text-muted hover:text-text hover:bg-bg-hover transition-colors flex items-center gap-1">
            <span className="text-sm">✨</span><span className="hidden sm:inline">For You</span>
          </Link>
          {TABS.map((tab) => (
            <Link key={tab.id} href={`/${tab.id}`} className="px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-text-muted hover:text-text hover:bg-bg-hover transition-colors flex items-center gap-1">
              <span className="text-sm">{tab.icon}</span><span className="hidden sm:inline">{tab.name}</span>
            </Link>
          ))}
          <Link href="/explore" className="px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-text text-text flex items-center gap-1">
            <span className="text-sm">🔍</span><span className="hidden sm:inline">Explore</span>
          </Link>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 border-l border-border">
          <button onClick={() => setShowNewFeed(true)} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap">
            <Plus className="h-3 w-3" /><span className="hidden sm:inline">Create feed</span><span className="sm:hidden">New</span>
          </button>
          {user ? (
            <Link href="/dashboard" className="text-[11px] font-semibold bg-text text-bg px-3 py-1 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap">Dashboard</Link>
          ) : (
            <Link href="/login?signup=true" className="text-[11px] font-semibold bg-text text-bg px-3 py-1 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap">Sign in</Link>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-bg-hover transition-colors" aria-label="More options"><MoreVertical className="h-4 w-4 text-text-muted" /></button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-lg py-1 z-50" onMouseLeave={() => setShowMenu(false)}>
                {mounted && <button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{theme === "dark" ? "Light mode" : "Dark mode"}</button>}
                {!user && <Link href="/login" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}><LogIn className="h-4 w-4" />Sign in</Link>}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Explore content */}
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Explore Feeds</h1>
          <p className="text-text-muted text-sm sm:text-base">Browse curated feeds or create your own with AI</p>
        </div>

        {/* Feed grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEEDS.map((feed) => (
            <Link key={feed.id} href={`/${feed.id}`} className="group p-4 rounded-xl border border-border bg-bg-card hover:border-text/20 hover:bg-bg-hover/50 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{feed.icon}</span>
                <h3 className="font-semibold text-text group-hover:text-text/80 transition-colors">{feed.name}</h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{feed.description}</p>
            </Link>
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
      </main>

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
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowNewFeed(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                {user ? (
                  <button onClick={async () => { if (!newPrompt.trim()) return; try { const res = await fetch("/api/feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPrompt.slice(0, 40), query_text: newPrompt }) }); const data = await res.json(); const id = data.feed?.id; if (id) { fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {}); window.location.href = `/my/${id}`; return; } } catch {} window.location.href = "/dashboard"; }} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Create feed</button>
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
