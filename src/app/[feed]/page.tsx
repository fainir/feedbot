"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, Sun, Moon, Sparkles, ThumbsUp, ThumbsDown, X, Bookmark, BookmarkCheck, Share2, Zap, Globe, TrendingUp, MoreVertical, LogIn, RefreshCw, Search, Mail, SlidersHorizontal, Rss } from "lucide-react";
import { usePullToRefresh, PullToRefreshIndicator } from "@/components/pull-to-refresh";
import { useTheme } from "next-themes";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { trackEvent } from "@/components/analytics";
import { useToast } from "@/components/ui/toast";
import { cleanSummary, cleanTitle, cleanSourceDisplay, getSourceInfo, getSourceFavicon, timeAgo } from "@/lib/source-info";
import type { User } from "@supabase/supabase-js";

interface FeedItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url?: string;
  publishedAt: string;
}

// All system feeds -any of these can be loaded by slug
const ALL_SYSTEM_FEEDS = [
  { id: "ai", name: "AI & ML", icon: "🤖", query: "artificial intelligence breakthroughs, LLM models, AI startups, machine learning research, GPT Claude Gemini, AI tools and products" },
  { id: "tech", name: "Tech", icon: "💻", query: "tech industry news, product launches, big tech companies, gadgets, consumer technology, tech business" },
  { id: "startups", name: "Startups", icon: "🚀", query: "startup funding rounds, venture capital deals, Y Combinator, new startup launches, founder stories, seed series A B funding" },
  { id: "dev", name: "Dev", icon: "⚡", query: "software engineering, programming tutorials, developer tools, open source projects, React Next.js Python Rust, coding best practices" },
  { id: "science", name: "Science", icon: "🔬", query: "scientific discoveries, space exploration, physics breakthroughs, biology research, climate science, nature published papers" },
  { id: "crypto", name: "Crypto", icon: "₿", query: "cryptocurrency bitcoin ethereum blockchain DeFi web3 NFT crypto market analysis trading" },
  { id: "design", name: "Design", icon: "🎨", query: "UI UX design, product design, Figma, design systems, typography, visual design trends" },
  { id: "security", name: "Security", icon: "🔒", query: "cybersecurity, data breaches, zero-day exploits, infosec tools, penetration testing, security research" },
  { id: "gaming", name: "Gaming", icon: "🎮", query: "video games, game releases, gaming industry news, esports, game development, indie games" },
  { id: "business", name: "Business", icon: "📈", query: "business strategy, leadership, management, entrepreneurship, market trends, corporate news" },
  { id: "space", name: "Space", icon: "🪐", query: "SpaceX launches, NASA missions, Mars exploration, James Webb telescope, space industry, rocket launches, satellites" },
  { id: "health", name: "Health", icon: "🏥", query: "health research, medical breakthroughs, mental health, nutrition science, fitness studies, biotech news" },
  { id: "open-source", name: "Open Source", icon: "🐙", query: "open source projects, GitHub trending, open source contributions, FOSS, Linux, open source alternatives, community-driven software" },
  { id: "robotics", name: "Robotics", icon: "🦾", query: "robotics, humanoid robots, Boston Dynamics, industrial automation, robot learning, embodied AI, drones" },
  { id: "energy", name: "Energy", icon: "⚡", query: "energy technology, solar power, battery storage, nuclear fusion, grid modernization, energy transition, clean energy" },
  { id: "climate", name: "Climate", icon: "🌍", query: "climate change, renewable energy, solar wind power, sustainability, carbon emissions, green technology, electric vehicles" },
  { id: "fintech", name: "Fintech", icon: "💳", query: "fintech news, digital banking, payment technology, neobanks, financial APIs, open banking, insurtech" },
  { id: "devops", name: "DevOps", icon: "🔧", query: "DevOps, cloud infrastructure, Kubernetes Docker, CI CD pipelines, AWS Azure GCP, platform engineering, SRE" },
  { id: "data", name: "Data", icon: "📊", query: "data science, analytics, big data, data engineering, SQL databases, data visualization, business intelligence" },
  { id: "mobile", name: "Mobile", icon: "📱", query: "mobile app development, iOS Android, React Native Flutter, mobile UX, app store trends, Swift Kotlin" },
  { id: "marketing", name: "Marketing", icon: "📣", query: "digital marketing, SEO, content marketing, growth hacking, social media marketing, email marketing, conversion optimization" },
  { id: "productivity", name: "Productivity", icon: "⏱️", query: "productivity tools, time management, note-taking apps, workflow automation, personal knowledge management, second brain" },
  { id: "biotech", name: "Biotech", icon: "🧬", query: "biotechnology, gene therapy, CRISPR, drug discovery, synthetic biology, longevity research, bioinformatics" },
  { id: "ev", name: "EVs", icon: "🚗", query: "electric vehicles, Tesla, EV charging, autonomous driving, battery technology, EV startups, self-driving cars" },
  { id: "remote-work", name: "Remote Work", icon: "🏠", query: "remote work, distributed teams, async communication, digital nomad, work from home tools, hybrid work, remote collaboration" },
  // Tech & Engineering (additional)
  { id: "web3", name: "Web3", icon: "🌐", query: "decentralized applications, smart contracts, DAOs, blockchain development, Solidity, dApps, web3 infrastructure" },
  { id: "ar-vr", name: "AR / VR", icon: "🥽", query: "augmented reality, virtual reality, Apple Vision Pro, Meta Quest, spatial computing, mixed reality, XR development" },
  { id: "quantum", name: "Quantum Computing", icon: "⚛️", query: "quantum computing, quantum processors, qubits, quantum algorithms, IBM quantum, Google Sycamore, quantum error correction" },
  { id: "databases", name: "Databases", icon: "🗄️", query: "PostgreSQL, MongoDB, Redis, database design, query optimization, SQL, NoSQL, database scaling, Supabase" },
  { id: "frontend", name: "Frontend", icon: "🖥️", query: "React, Next.js, Vue, Svelte, CSS, web performance, browser APIs, frontend frameworks, Tailwind, web components" },
  { id: "backend", name: "Backend", icon: "⚙️", query: "Node.js backend, Python Django FastAPI, Go microservices, Rust servers, API design, system design, gRPC REST" },
  { id: "ai-tools", name: "AI Tools", icon: "🛠️", query: "ChatGPT, Claude AI, GitHub Copilot, Cursor IDE, AI coding assistants, AI productivity tools, AI image generators" },
  { id: "llm-research", name: "LLM Research", icon: "📝", query: "large language model research, LLM benchmarks, fine-tuning, RLHF, reasoning models, transformer architecture, AI alignment" },
  { id: "computer-vision", name: "Computer Vision", icon: "👁️", query: "image recognition, object detection, diffusion models, video AI, YOLO, image segmentation, visual foundation models" },
  // Business & Finance (additional)
  { id: "saas", name: "SaaS", icon: "☁️", query: "SaaS business, monthly recurring revenue MRR, churn rate, SaaS pricing, B2B software, SaaS metrics, PLG product-led growth" },
  { id: "ecommerce", name: "E-commerce", icon: "🛒", query: "online retail, Shopify, Amazon marketplace, dropshipping, direct-to-consumer brands, e-commerce platforms, online store" },
  { id: "venture-capital", name: "Venture Capital", icon: "💰", query: "venture capital deals, funding rounds, term sheets, LP trends, VC portfolio, seed funding, Series A B C" },
  { id: "personal-finance", name: "Personal Finance", icon: "💵", query: "personal investing, budgeting, retirement planning, index funds, wealth building, FIRE movement, stock market" },
  { id: "real-estate", name: "Real Estate", icon: "🏠", query: "real estate market, REITs, PropTech, housing trends, mortgage rates, commercial real estate, property investment" },
  { id: "indie-hackers", name: "Indie Hackers", icon: "🧑‍💻", query: "indie hacker, solo founder, bootstrapping startups, side project revenue, building in public, micro SaaS, solopreneur" },
  // Science & Nature (additional)
  { id: "neuroscience", name: "Neuroscience", icon: "🧠", query: "brain research, cognitive science, neural interfaces, Neuralink, consciousness studies, brain-computer interface, neurobiology" },
  { id: "physics", name: "Physics", icon: "🔭", query: "particle physics, cosmology, dark matter, quantum mechanics, theoretical physics, CERN, gravitational waves" },
  { id: "math", name: "Mathematics", icon: "🔢", query: "mathematics research, mathematical proofs, statistics, cryptography, topology, number theory, applied mathematics" },
  { id: "psychology", name: "Psychology", icon: "🧘", query: "behavioral psychology, cognitive biases, therapy research, habit formation, positive psychology, behavioral economics" },
  { id: "astronomy", name: "Astronomy", icon: "🌌", query: "telescopes, exoplanets, galaxies, black holes, cosmic events, astrophysics, space telescopes, stellar observations" },
  { id: "oceanography", name: "Oceans", icon: "🌊", query: "ocean science, marine biology, deep sea exploration, coral reefs, ocean conservation, underwater research, oceanography" },
  { id: "geology", name: "Earth Science", icon: "🌋", query: "geology, earthquakes, volcanoes, minerals, plate tectonics, earth science, seismology, geophysics, fossil discovery" },
  // Creative & Culture (additional)
  { id: "music", name: "Music", icon: "🎵", query: "music production, new album releases, music technology, audio engineering, streaming platforms, music industry news" },
  { id: "film", name: "Film & TV", icon: "🎬", query: "movies, TV shows, streaming platforms, filmmaking, box office, Netflix Disney Plus, film reviews, cinematography" },
  { id: "photography", name: "Photography", icon: "📷", query: "photography tips, camera gear reviews, photo editing, street photography, landscape photography, portrait techniques" },
  { id: "writing", name: "Writing", icon: "✍️", query: "creative writing, copywriting, blogging tips, storytelling techniques, publishing, writing craft, content writing" },
  { id: "podcasting", name: "Podcasting", icon: "🎙️", query: "podcast production, podcast hosting platforms, podcast growth, monetization, audio recording, podcast equipment" },
  { id: "animation", name: "Animation", icon: "🎞️", query: "motion graphics, 3D animation, Blender, visual effects VFX, character animation, After Effects, animation studios" },
  { id: "typography", name: "Typography", icon: "🔤", query: "font design, type systems, lettering, web fonts, typeface releases, variable fonts, typography trends, type foundries" },
  // Lifestyle & Wellbeing (additional)
  { id: "fitness", name: "Fitness", icon: "💪", query: "workout routines, strength training, running, sports science, gym equipment, exercise science, CrossFit, marathon training" },
  { id: "nutrition", name: "Nutrition", icon: "🥗", query: "diet science, nutritional supplements, meal planning, gut health, intermittent fasting, nutrition research, superfoods" },
  { id: "mental-health", name: "Mental Health", icon: "🧘", query: "anxiety management, depression treatment, therapy approaches, mindfulness meditation, self-care, mental wellness" },
  { id: "cooking", name: "Cooking", icon: "👨‍🍳", query: "recipes, cooking techniques, food science, kitchen gadgets, baking, meal prep, culinary trends, chef tips" },
  { id: "travel", name: "Travel", icon: "✈️", query: "travel destinations, budget travel tips, digital nomad locations, travel hacking, flight deals, travel photography" },
  { id: "parenting", name: "Parenting", icon: "👶", query: "child development, parenting tips, education methods, family technology, new parent advice, children health" },
  { id: "pets", name: "Pets", icon: "🐕", query: "dog care, cat care, pet health, animal training, pet nutrition, veterinary science, animal behavior, pet tech" },
  { id: "gardening", name: "Gardening", icon: "🌱", query: "home gardening, indoor plants, permaculture, urban farming, vegetable garden, houseplants, garden design, composting" },
  { id: "diy", name: "DIY & Maker", icon: "🔨", query: "3D printing projects, woodworking, electronics DIY, Raspberry Pi, Arduino, maker movement, home improvement" },
  // World & Politics
  { id: "world-news", name: "World News", icon: "🗞️", query: "global events, geopolitics, international relations, world affairs, diplomacy, United Nations, global conflicts" },
  { id: "us-politics", name: "US Politics", icon: "🇺🇸", query: "US elections, policy analysis, Congress legislation, White House, Supreme Court, American politics, political campaigns" },
  { id: "europe", name: "Europe", icon: "🇪🇺", query: "European Union politics, European tech industry, EU regulations, European economy, Brexit, European startups" },
  { id: "china-tech", name: "China Tech", icon: "🇨🇳", query: "Chinese tech companies, China AI development, Huawei Alibaba Tencent, China regulations, Chinese manufacturing" },
  { id: "india-tech", name: "India Tech", icon: "🇮🇳", query: "Indian startups, UPI digital payments, India IT industry, Bangalore tech scene, Indian unicorns, India tech policy" },
  { id: "middle-east", name: "Middle East", icon: "🌍", query: "Middle East technology, NEOM project, Saudi Vision 2030, UAE innovation, Gulf tech startups, Dubai tech" },
  { id: "africa-tech", name: "Africa Tech", icon: "🌍", query: "African startups, mobile money M-Pesa, Africa tech hubs, fintech Africa, Nigerian tech, Kenyan innovation" },
  { id: "economics", name: "Economics", icon: "📉", query: "macroeconomics, inflation rates, central bank policy, international trade, GDP growth, Federal Reserve, economic analysis" },
  // Education & Career
  { id: "education", name: "Education", icon: "🎓", query: "education technology, online learning platforms, university research, teaching methods, higher education, student success" },
  { id: "career", name: "Career", icon: "💼", query: "job market trends, interviewing tips, salary negotiation, career growth, tech hiring, resume building, job search" },
  { id: "freelancing", name: "Freelancing", icon: "🧑‍💼", query: "freelance tips, client management, freelance pricing, Upwork Fiverr, freelance business, contract work, gig economy" },
  { id: "leadership", name: "Leadership", icon: "👑", query: "management skills, team building, executive coaching, decision-making frameworks, organizational leadership, CEO insights" },
  // Niche Tech (additional)
  { id: "rust", name: "Rust", icon: "🦀", query: "Rust programming language, systems programming, WebAssembly, Rust crates, memory safety, Tokio async, Rust embedded" },
  { id: "python", name: "Python", icon: "🐍", query: "Python programming, Django, FastAPI, data science Python, Python libraries, scripting, Python packaging, Pandas NumPy" },
  { id: "golang", name: "Go", icon: "🐹", query: "Go programming language, Go concurrency, Go microservices, CLI tools Go, Kubernetes Go, goroutines, Go modules" },
  { id: "typescript", name: "TypeScript", icon: "🔷", query: "TypeScript patterns, type systems, TypeScript frameworks, Zod, TypeScript tooling, type-safe APIs, TypeScript 5" },
  { id: "linux", name: "Linux", icon: "🐧", query: "Linux distributions, kernel development, system administration, Linux desktop, Ubuntu Fedora Arch, Linux server, shell scripting" },
  { id: "networking", name: "Networking", icon: "📡", query: "computer networking, DNS, CDN, TCP IP, WiFi technology, 5G networks, network security, BGP routing" },
  { id: "privacy", name: "Privacy", icon: "🔐", query: "digital privacy, encryption, VPN services, surveillance, GDPR compliance, data protection, privacy tools, Tor" },
  { id: "no-code", name: "No-Code", icon: "🧩", query: "no-code tools, Bubble, Webflow, Zapier automation, low-code platforms, visual programming, citizen developer" },
  { id: "3d-printing", name: "3D Printing", icon: "🖨️", query: "3D printers, 3D printing materials, CAD design, additive manufacturing, prototyping, Bambu Lab, resin printing" },
  { id: "iot", name: "IoT", icon: "📟", query: "Internet of Things, smart home devices, IoT sensors, edge computing, Home Assistant, connected devices, industrial IoT" },
  // Sports & Entertainment
  { id: "sports", name: "Sports", icon: "⚽", query: "football soccer, basketball NBA, tennis, Olympics, sports analytics, Premier League, NFL, sports technology" },
  { id: "esports", name: "Esports", icon: "🏆", query: "competitive gaming, esports tournaments, League of Legends, Valorant, esports teams, Twitch streaming, gaming competitions" },
  { id: "anime", name: "Anime", icon: "🎌", query: "anime releases, manga news, Japanese animation studios, anime reviews, Crunchyroll, anime culture, light novels" },
  { id: "books", name: "Books", icon: "📚", query: "book reviews, reading recommendations, new book releases, authors interviews, publishing industry, literary fiction, nonfiction" },
  { id: "comics", name: "Comics", icon: "💬", query: "Marvel comics, DC comics, manga series, indie comics, graphic novels, comic book adaptations, webcomics" },
  // Environment & Sustainability
  { id: "sustainability", name: "Sustainability", icon: "♻️", query: "circular economy, zero waste, sustainable fashion, ESG investing, sustainable business, carbon footprint, green living" },
  { id: "agriculture", name: "Agriculture", icon: "🌾", query: "agricultural technology AgTech, vertical farming, precision agriculture, food systems, crop science, farm automation" },
  { id: "wildlife", name: "Wildlife", icon: "🦁", query: "animal conservation, endangered species, biodiversity, wildlife photography, national parks, species discovery, ecology" },
  // Emerging
  { id: "longevity", name: "Longevity", icon: "⏳", query: "anti-aging research, senolytics, healthspan extension, biohacking, longevity science, aging biology, life extension" },
  { id: "psychedelics", name: "Psychedelics", icon: "🍄", query: "psychedelic therapy, psilocybin research, MDMA therapy, ketamine treatment, psychedelic science, mental health psychedelics" },
  { id: "creator-economy", name: "Creator Economy", icon: "🎥", query: "YouTube creators, TikTok trends, Patreon, creator monetization, audience building, influencer marketing, content creation" },
  { id: "legal-tech", name: "Legal Tech", icon: "⚖️", query: "AI in law, contract automation, legal AI tools, compliance technology, legal tech startups, e-discovery, LegalTech" },
  { id: "edtech", name: "EdTech", icon: "📖", query: "learning platforms, AI tutors, classroom technology, MOOCs, online education, Coursera Udemy, educational AI" },
  { id: "food-tech", name: "Food Tech", icon: "🍔", query: "lab-grown meat, food delivery technology, restaurant automation, alternative protein, food science, cultured meat" },
  { id: "fashion-tech", name: "Fashion Tech", icon: "👗", query: "wearable technology, smart fabrics, AI in fashion, virtual try-on, fashion e-commerce, sustainable fashion tech" },
  { id: "proptech", name: "PropTech", icon: "🏗️", query: "real estate technology PropTech, smart buildings, construction automation, building information modeling, property management tech" },
  { id: "govtech", name: "GovTech", icon: "🏛️", query: "government technology, civic tech, digital identity, e-governance, public sector innovation, smart cities, digital services" },
  { id: "insurtech", name: "InsurTech", icon: "🛡️", query: "insurance technology, parametric insurance, claims AI, digital insurance, InsurTech startups, underwriting automation" },
];

// Default 15 tabs shown in tab bar
const DEFAULT_TAB_IDS = new Set(["ai","tech","startups","dev","science","design","security","gaming","business","space","health","open-source","robotics","energy"]);
const TABS = ALL_SYSTEM_FEEDS.filter(f => DEFAULT_TAB_IDS.has(f.id));

const PROMPT_EXAMPLES = [
  "Latest React and Next.js tutorials, new CSS features",
  "AI startup funding, new AI product launches",
  "Indie game development, pixel art, game jams",
  "Climate change research, renewable energy news",
];

function useScrollFade() {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 2);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);
  return { ref, atStart, atEnd };
}

export default function FeedPage() {
  const params = useParams();
  const feedSlug = (params.feed as string) || "tech";
  const activeTab = ALL_SYSTEM_FEEDS.find((t) => t.id === feedSlug);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [newArticlesAvailable, setNewArticlesAvailable] = useState(0);
  const [communityFeed, setCommunityFeed] = useState<{ id: string; name: string; description: string; creator: string; followers: number } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [userFeeds, setUserFeeds] = useState<{ id: string; slug: string; name: string; icon: string }[]>([]);
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(new Set());
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [dontShowRemoveAgain, setDontShowRemoveAgain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showNewFeed, setShowNewFeed] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");
  const [showMenu, setShowMenu] = useState(false);
  const desktopTabs = useScrollFade();
  const mobileTabs = useScrollFade();
  const [hideTopRow, setHideTopRow] = useState(false);
  const lastScrollY = useRef(0);
  const [newPrompt, setNewPrompt] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, "like" | "dislike">>({});
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  // Collapse top bar on scroll down (mobile only — CSS gates on sm:)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if (y < 48) setHideTopRow(false);
      else if (delta > 6) setHideTopRow(true);
      else if (delta < -6) setHideTopRow(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll active tab into view on mount
  useEffect(() => {
    if (!tabBarRef.current) return;
    const activeEl = tabBarRef.current.querySelector("[data-active='true']") as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
    }
  }, [feedSlug]);

  // Check auth state + load user feeds
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Load user's custom feeds as tabs
        fetch("/api/feeds").then((r) => r.json()).then((d) => {
          const feeds = (d.feeds || []).map((f: { id: string; slug?: string; name: string }) => ({
            id: `my/${f.id}`,
            slug: f.slug || f.id,
            name: f.name.length > 20 ? f.name.slice(0, 18) + "..." : f.name,
            icon: "📡",
          }));
          setUserFeeds(feeds);
        }).catch(() => {});
      }
    });
    // Load tab preferences from storage
    try {
      const saved = sessionStorage.getItem("mf_tab_order");
      if (saved) setTabOrder(JSON.parse(saved));
      const hidden = sessionStorage.getItem("mf_hidden_tabs");
      if (hidden) setHiddenTabs(new Set(JSON.parse(hidden)));
      const dontShow = localStorage.getItem("mf_dont_show_remove");
      if (dontShow === "1") setDontShowRemoveAgain(true);
    } catch {}
  }, []);

  const handleReaction = useCallback(async (feedItemId: string, reaction: "like" | "dislike") => {
    trackEvent("article_reaction", { reaction, feed: feedSlug });
    if (!user) { toast("Sign up to save your preferences", "info"); return; }
    const prev = userReactions[feedItemId];
    // Optimistic update
    setUserReactions((r) => {
      const next = { ...r };
      if (next[feedItemId] === reaction) delete next[feedItemId];
      else next[feedItemId] = reaction;
      return next;
    });
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feed_item_id: feedItemId, reaction }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setUserReactions((r) => {
        const next = { ...r };
        if (prev) next[feedItemId] = prev;
        else delete next[feedItemId];
        return next;
      });
    }
  }, [user, userReactions]);

  const handleBookmark = useCallback(async (feedItemId: string) => {
    if (!user) { toast("Sign up to save your finds", "info"); return; }
    const wasBookmarked = userBookmarks.has(feedItemId);
    // Optimistic update
    setUserBookmarks((s) => {
      const next = new Set(s);
      if (next.has(feedItemId)) next.delete(feedItemId);
      else next.add(feedItemId);
      return next;
    });
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feed_item_id: feedItemId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setUserBookmarks((s) => {
        const next = new Set(s);
        if (wasBookmarked) next.add(feedItemId);
        else next.delete(feedItemId);
        return next;
      });
    }
  }, [user, userBookmarks]);

  const handleShare = useCallback(async (item: FeedItem) => {
    trackEvent("share_article", { source: item.source, feed: feedSlug });
    const shareData = { title: item.title, url: item.url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(item.url);
    }
  }, [feedSlug]);

  const fetchFeed = useCallback((query: string, cursor?: string) => {
    const url = `/api/public/feeds?q=${encodeURIComponent(query)}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    return fetch(url).then((r) => r.json());
  }, []);

  const fetchBySlug = useCallback((slug: string, cursor?: string) => {
    const url = `/api/public/feed-by-slug?slug=${encodeURIComponent(slug)}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    return fetch(url).then((r) => r.json());
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setNewArticlesAvailable(0);
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    const fetcher = activeTab ? fetchFeed(activeTab.query) : fetchBySlug(feedSlug);
    fetcher
      .then((d) => { setItems(d.items || []); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .catch(() => setItems([]))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [activeTab, feedSlug, fetchFeed, fetchBySlug]);

  // Pull-to-refresh — silent variant: don't clear list or flash skeletons,
  // just swap items in once the new fetch lands. Keeps the gesture smooth.
  const pullRefresh = useCallback(async () => {
    setNewArticlesAvailable(0);
    try {
      const fetcher = activeTab ? fetchFeed(activeTab.query) : fetchBySlug(feedSlug);
      const d = await fetcher;
      setItems(d.items || []);
      setHasMore(d.hasMore || false);
      setNextCursor(d.nextCursor || null);
    } catch { /* keep current items if fetch fails */ }
  }, [activeTab, feedSlug, fetchFeed, fetchBySlug]);
  const { pullPx, refreshing: pulling } = usePullToRefresh(pullRefresh);

  useEffect(() => {
    setCommunityFeed(null);
    setNotFound(false);

    // Check cache first — instant tab switching for visited feeds
    const cacheKey = `mf_cache_${feedSlug}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { items: cachedItems, hasMore: cachedMore, cursor, ts } = JSON.parse(cached);
        // Use cache if < 2 min old
        if (Date.now() - ts < 120_000) {
          setItems(cachedItems);
          setHasMore(cachedMore);
          setNextCursor(cursor);
          setLoading(false);
          return;
        }
      }
    } catch {}

    setLoading(true);
    setItems([]);
    setNextCursor(null);

    if (activeTab) {
      fetchFeed(activeTab.query)
        .then((d) => {
          setItems(d.items || []); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null);
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ items: d.items || [], hasMore: d.hasMore || false, cursor: d.nextCursor || null, ts: Date.now() })); } catch {}
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else {
      fetch(`/api/public/feed-by-slug?slug=${encodeURIComponent(feedSlug)}&limit=50`)
        .then((r) => {
          if (!r.ok) { setNotFound(true); setLoading(false); return; }
          return r.json();
        })
        .then((d) => {
          if (!d || !d.items) { setNotFound(true); return; }
          setItems(d.items);
          setHasMore(d.hasMore || false);
          setNextCursor(d.nextCursor || null);
          if (d.feed) {
            setCommunityFeed(d.feed);
            fetch(`/api/feeds/${d.feed.id}/view`, { method: "POST" }).catch(() => {});
          }
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ items: d.items, hasMore: d.hasMore || false, cursor: d.nextCursor || null, ts: Date.now() })); } catch {}
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    }
  }, [feedSlug, activeTab, fetchFeed, fetchBySlug]);

  // Poll for new articles every 2 minutes
  useEffect(() => {
    if (!activeTab || items.length === 0) return;
    const interval = setInterval(() => {
      const q = activeTab.query;
      fetch(`/api/public/feeds?q=${encodeURIComponent(q)}&limit=1`)
        .then((r) => r.json())
        .then((d) => {
          const latest = d.items?.[0];
          if (latest && items[0] && new Date(latest.publishedAt) > new Date(items[0].publishedAt)) {
            setNewArticlesAvailable((prev) => prev + 1);
          }
        })
        .catch(() => {});
    }, 120000);
    return () => clearInterval(interval);
  }, [activeTab, items]);

  const dedupedItems = useMemo(() => {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    return items.filter((item) => {
      const key = item.url.split("?")[0].split("#")[0];
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      // Fuzzy title dedup: normalize to lowercase words, skip if 80%+ overlap
      const words = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3);
      const titleKey = words.sort().join(" ");
      if (seenTitles.has(titleKey)) return false;
      seenTitles.add(titleKey);
      return true;
    });
  }, [items]);

  // Filter chips: All / Today / This week
  // Counts are computed once so the chip labels can show "Today (12)" style hints.
  const { filteredItems, filterCounts } = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const week = dedupedItems.filter((i) => now - new Date(i.publishedAt).getTime() < 7 * DAY);
    const today = dedupedItems.filter((i) => now - new Date(i.publishedAt).getTime() < DAY);
    const out = filter === "today" ? today : filter === "week" ? week : dedupedItems;
    return {
      filteredItems: out,
      filterCounts: { all: dedupedItems.length, today: today.length, week: week.length },
    };
  }, [dedupedItems, filter]);

  const loadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    const fetchMore = activeTab ? fetchFeed(activeTab.query, nextCursor) : fetchBySlug(feedSlug, nextCursor);
    fetchMore
      .then((d) => { setItems((p) => [...p, ...(d.items || [])]); setHasMore(d.hasMore || false); setNextCursor(d.nextCursor || null); })
      .finally(() => setLoadingMore(false));
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <header className="fixed top-0 left-0 right-0 z-50 bg-bg-card border-b border-border flex items-center h-11">
          <Link href="/" className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-2">
            <span className="flex items-center justify-center w-7 h-7 bg-text text-bg rounded-md text-[12px] font-black leading-none" style={{ letterSpacing: "-0.02em" }}>MF</span>
          </Link>
          <div className="flex-1" />
          <div className="flex-shrink-0 flex items-center gap-1.5 pr-3 pl-2 ml-0.5 border-l border-border/50">
            <Link href="/explore" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap"><Search className="h-3 w-3" />Explore</Link>
          </div>
        </header>
        <div className="h-11" />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 2.75rem)" }}>
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-2">404</h1>
            <p className="text-text-muted mb-6">Feed not found</p>
            <Link href="/explore" className="bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 mx-auto w-fit"><Search className="h-4 w-4" />Explore feeds</Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = activeTab?.name || communityFeed?.name || feedSlug;

  const handleShareFeed = useCallback(async () => {
    const url = `https://myfeed.space/${feedSlug}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${displayName} - MyFeed`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast("Link copied!", "success");
    }
  }, [feedSlug, displayName, toast]);

  // Build combined tab list: system tabs + user feeds, respecting order and hidden
  const allTabs = useMemo(() => {
    const systemTabs = TABS.map((t) => ({ id: t.id, name: t.name, icon: t.icon, isSystem: true }));
    const custom = userFeeds.map((f) => ({ id: f.id, name: f.name, icon: f.icon, isSystem: false }));
    const combined = [...systemTabs, ...custom];

    // Apply custom ordering if set
    if (tabOrder.length > 0) {
      const orderMap = new Map(tabOrder.map((id, i) => [id, i]));
      combined.sort((a, b) => {
        const ai = orderMap.get(a.id) ?? 999;
        const bi = orderMap.get(b.id) ?? 999;
        return ai - bi;
      });
    }

    // Filter hidden tabs
    return combined.filter((t) => !hiddenTabs.has(t.id));
  }, [userFeeds, tabOrder, hiddenTabs]);

  const saveTabOrder = useCallback((newOrder: string[]) => {
    setTabOrder(newOrder);
    try { sessionStorage.setItem("mf_tab_order", JSON.stringify(newOrder)); } catch {}
    // For signed-in users, also save to DB (future: user preferences table)
  }, []);

  const removeTab = useCallback((tabId: string) => {
    const newHidden = new Set(hiddenTabs);
    newHidden.add(tabId);
    setHiddenTabs(newHidden);
    try { sessionStorage.setItem("mf_hidden_tabs", JSON.stringify([...newHidden])); } catch {}
    setShowRemoveConfirm(null);
  }, [hiddenTabs]);

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string, tabName: string, tabIcon: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", tabId);
    // Create a clean drag image that looks like the tab
    const ghost = document.createElement("div");
    ghost.textContent = `${tabIcon} ${tabName}`;
    ghost.style.cssText = "position:fixed;top:-100px;left:-100px;padding:6px 12px;font-size:12px;font-weight:500;background:var(--color-bg-card);color:var(--color-text);border:1px solid var(--color-border);border-radius:8px;white-space:nowrap;z-index:9999;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    requestAnimationFrame(() => ghost.remove());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetId) return;
    const currentOrder = allTabs.map((t) => t.id);
    const fromIdx = currentOrder.indexOf(draggedTab);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    currentOrder.splice(fromIdx, 1);
    currentOrder.splice(toIdx, 0, draggedTab);
    saveTabOrder(currentOrder);
  }, [draggedTab, allTabs, saveTabOrder]);

  const handleDragEnd = useCallback(() => {
    setDraggedTab(null);
  }, []);

  // Mobile touch DnD -long press to start, drag to reorder
  const touchState = useRef<{ id: string; startX: number; timer: ReturnType<typeof setTimeout> | null }>({ id: "", startX: 0, timer: null });

  const handleTouchStart = useCallback((tabId: string, x: number) => {
    touchState.current.timer = setTimeout(() => {
      touchState.current.id = tabId;
      setDraggedTab(tabId);
    }, 400); // 400ms long press
    touchState.current.startX = x;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if moved too much
    if (touchState.current.timer && !touchState.current.id) {
      const dx = Math.abs(e.touches[0].clientX - touchState.current.startX);
      if (dx > 10) { clearTimeout(touchState.current.timer); touchState.current.timer = null; }
      return;
    }
    if (!touchState.current.id) return;
    e.preventDefault();
    // Find which tab element we're over
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const tabEl = el?.closest("[data-tab-id]") as HTMLElement | null;
    if (tabEl) {
      const targetId = tabEl.dataset.tabId!;
      if (targetId !== touchState.current.id) {
        const currentOrder = allTabs.map((t) => t.id);
        const fromIdx = currentOrder.indexOf(touchState.current.id);
        const toIdx = currentOrder.indexOf(targetId);
        if (fromIdx !== -1 && toIdx !== -1) {
          currentOrder.splice(fromIdx, 1);
          currentOrder.splice(toIdx, 0, touchState.current.id);
          saveTabOrder(currentOrder);
        }
      }
    }
  }, [allTabs, saveTabOrder]);

  const handleTouchEnd = useCallback(() => {
    if (touchState.current.timer) { clearTimeout(touchState.current.timer); touchState.current.timer = null; }
    touchState.current.id = "";
    setDraggedTab(null);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text">
      <PullToRefreshIndicator pullPx={pullPx} refreshing={pulling} />
      {/* Top bar -fixed. On mobile, slides up to hide row 1 on scroll down. */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-bg-card border-b border-border transition-transform duration-200 will-change-transform ${hideTopRow ? "-translate-y-12" : "translate-y-0"} sm:!translate-y-0`}>
        <div className="flex items-center h-12">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2 pl-3 sm:pl-4 pr-2 sm:pr-3">
          <span className="flex items-center justify-center w-7 h-7 bg-text text-bg rounded-md text-[12px] font-black leading-none" style={{ letterSpacing: "-0.02em" }}>MF</span>
        </Link>

        {/* Desktop: horizontal tabs with scroll fade */}
        <div className="hidden sm:block relative flex-1 min-w-0 h-12">
          <div ref={(el) => { tabBarRef.current = el; desktopTabs.ref.current = el; }} className="flex overflow-x-auto scrollbar-hide items-center gap-0 h-full pr-2">
          <Link href="/" className="px-3 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 border-transparent text-text hover:bg-bg-hover transition-colors flex items-center gap-1.5">
            <Rss className="h-3.5 w-3.5" />My Feed
          </Link>
          <div className="w-px h-5 bg-border/50 mx-1 flex-shrink-0" />
          {allTabs.map((tab) => (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id, tab.name, tab.icon)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(tab.id, e.touches[0].clientX)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`group relative shrink-0 cursor-grab select-none border-b-2 text-sm font-medium transition-all active:cursor-grabbing ${
                feedSlug === tab.id
                  ? "border-text text-text"
                  : "border-transparent text-text-muted hover:text-text"
              } ${draggedTab === tab.id ? "opacity-40 scale-105" : ""}`}
            >
              <Link
                href={`/${tab.id}`}
                data-active={feedSlug === tab.id}
                draggable={false}
                onMouseEnter={() => {
                  const sysFeed = ALL_SYSTEM_FEEDS.find(f => f.id === tab.id);
                  if (sysFeed && !sessionStorage.getItem(`mf_cache_${tab.id}`)) {
                    fetch(`/api/public/feeds?q=${encodeURIComponent(sysFeed.query)}&limit=50`).then(r => r.json()).then(d => {
                      try { sessionStorage.setItem(`mf_cache_${tab.id}`, JSON.stringify({ items: d.items || [], hasMore: d.hasMore || false, cursor: d.nextCursor || null, ts: Date.now() })); } catch {}
                    }).catch(() => {});
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-3.5 whitespace-nowrap"
              >
                <span>{tab.icon}</span>
                {tab.name}
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dontShowRemoveAgain) { removeTab(tab.id); }
                  else { setShowRemoveConfirm(tab.id); }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                draggable={false}
                className={`absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded-full bg-bg-card border border-border/50 transition-opacity ${
                  feedSlug === tab.id
                    ? "opacity-0 hover:opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                aria-label={`Remove ${tab.name}`}
              >
                <X className="h-2.5 w-2.5 text-text-muted" />
              </button>
            </div>
          ))}
          </div>
          {!desktopTabs.atStart && <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg-card to-transparent" />}
          {!desktopTabs.atEnd && <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg-card to-transparent" />}
        </div>

        {/* Right actions */}
        <div className="ml-auto sm:ml-0 flex-shrink-0 flex items-center gap-1 sm:gap-2 pr-2 sm:pr-4 pl-2 sm:pl-3 sm:border-l sm:border-border/50">
          <Link href="/explore" className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium border border-text/30 text-text rounded-full hover:bg-text hover:text-bg transition-all whitespace-nowrap"><Search className="h-3.5 w-3.5" />Explore</Link>
          <button
            onClick={() => setShowNewFeed(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold bg-text text-bg rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create feed
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 sm:p-1.5 rounded-full hover:bg-bg-hover transition-colors" aria-label="More options">
              <MoreVertical className="h-4 w-4 text-text-muted" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-bg-card border border-border rounded-xl shadow-lg py-1 z-50" onMouseLeave={() => setShowMenu(false)}>
                {user && <div className="px-3 py-2 border-b border-border"><p className="text-xs font-medium text-text truncate">{user.email}</p></div>}
                {mounted && (
                  <button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </button>
                )}
                {!user && (
                  <Link href="/login?signup=true" className="flex items-center gap-2 px-3 py-2 text-sm text-text font-medium hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>
                    <LogIn className="h-4 w-4" />
                    Sign up / Sign in
                  </Link>
                )}
                {user && (
                  <Link href="/bookmarks" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>
                    <Bookmark className="h-4 w-4" />
                    Bookmarks
                  </Link>
                )}
                {user && (
                  <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors">
                    <LogIn className="h-4 w-4" />
                    Sign out
                  </button>
                )}
                <div className="border-t border-border my-1" />
                <Link href="/contact" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>Contact</Link>
                <Link href="/privacy" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>Privacy</Link>
                <Link href="/terms" className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors" onClick={() => setShowMenu(false)}>Terms</Link>
              </div>
            )}
          </div>
        </div>
        </div>
        {/* Mobile second row: scrollable tabs */}
        <div className="sm:hidden relative border-t border-border/50">
          <div ref={mobileTabs.ref} className="flex overflow-x-auto scrollbar-hide items-center gap-0 h-11">
            <Link href="/" className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 border-transparent text-text-muted hover:text-text flex items-center gap-1.5 flex-shrink-0 h-full">
              <Rss className="h-3.5 w-3.5" />My Feed
            </Link>
            <div className="w-px h-4 bg-border/50 mx-1 flex-shrink-0" />
            {allTabs.map((tab) => (
              <Link key={tab.id} href={`/${tab.id}`} className={`shrink-0 flex items-center gap-1.5 px-2.5 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors h-full ${feedSlug === tab.id ? "border-text text-text font-semibold" : "border-transparent text-text-muted hover:text-text font-medium"}`}>
                <span>{tab.icon}</span>{tab.name}
              </Link>
            ))}
          </div>
          {!mobileTabs.atStart && <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-bg-card to-transparent" />}
          {!mobileTabs.atEnd && <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg-card to-transparent" />}
        </div>
      </header>
      <div className="h-[5.75rem] sm:h-12" /> {/* Spacer: h-12 + h-11 + border on mobile, h-12 on desktop */}

      {/* Feed header -full width, 2 rows */}
      <div className="border-b border-border bg-bg">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-2 sm:pt-3 pb-2">
          {/* Row 1: icon + title left, action buttons right */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-base font-bold text-text flex items-center gap-2 min-w-0">
              <span className="text-lg flex-shrink-0">{activeTab?.icon || "📡"}</span> <span className="truncate">{displayName}</span>
            </h2>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={handleRefresh} className="p-2 rounded-full text-text-muted hover:text-text hover:bg-bg-hover transition-all" aria-label="Refresh feed" disabled={refreshing}>
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button onClick={handleShareFeed} className="p-2 rounded-full text-text-muted hover:text-text hover:bg-bg-hover transition-all" aria-label="Share feed">
                <Share2 className="h-3.5 w-3.5" />
              </button>
              {!user && (
                <Link href="/login?signup=true&email=true" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-text text-bg hover:opacity-90 transition-opacity">
                  <Mail className="h-3 w-3" />Get in email
                </Link>
              )}
            </div>
          </div>
          {/* Row 2: prompt text (scrollable) + Customize pinned right */}
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-x-auto scrollbar-hide min-w-0">
              <p className="text-xs text-text-muted whitespace-nowrap">
                {activeTab?.query || communityFeed?.description || ""}
                {communityFeed ? ` · by ${communityFeed.creator}` : ""}
              </p>
            </div>
            <button onClick={() => { setShowCustomize(true); setNewPrompt(activeTab?.query || communityFeed?.description || ""); }} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap text-text-muted hover:text-text hover:bg-bg-hover transition-all flex-shrink-0">
              <Sparkles className="h-3 w-3" />Customize
            </button>
          </div>
        </div>
      </div>

      {/* Fixed new articles toast */}
      {newArticlesAvailable > 0 && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50">
          <button onClick={handleRefresh} className="bg-text text-bg px-4 py-2 rounded-full text-xs font-semibold shadow-lg hover:opacity-90 transition-all">
            {newArticlesAvailable} new {newArticlesAvailable === 1 ? "post" : "posts"} - tap to refresh
          </button>
        </div>
      )}

      {/* Filter chips */}
      {!loading && dedupedItems.length > 0 && (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {([
              { id: "all" as const, label: "All", n: filterCounts.all },
              { id: "today" as const, label: "Today", n: filterCounts.today },
              { id: "week" as const, label: "This week", n: filterCounts.week },
            ]).map((chip) => {
              const active = filter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setFilter(chip.id)}
                  aria-pressed={active}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? "border-text bg-text text-bg" : "border-border text-text-muted hover:text-text hover:border-text/30"}`}
                >
                  <span>{chip.label}</span>
                  <span className={`text-[10px] ${active ? "opacity-70" : "opacity-60"}`}>{chip.n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Feed */}
      <main id="main-content" className="max-w-2xl mx-auto px-3 sm:px-4 pb-4 sm:pb-6">
        {loading ? (
          <div className="space-y-2 sm:space-y-4 pt-1 sm:pt-2">{[1,2,3,4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border overflow-hidden bg-bg-card">
              {i <= 2 && <div className="w-full aspect-[2.5/1] bg-bg-hover" />}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3"><div className="w-4 h-4 rounded-full bg-bg-hover" /><div className="h-3 bg-bg-hover rounded w-16" /></div>
                <div className="h-5 bg-bg-hover rounded w-4/5 mb-2" />
                <div className="h-3 bg-bg-hover rounded w-full" />
              </div>
            </div>
          ))}</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-text-muted font-medium">
              {dedupedItems.length === 0 ? "Scanning the internet..." : "No posts in this window"}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {dedupedItems.length === 0 ? "Content updates continuously" : (
                <button onClick={() => setFilter("all")} className="underline hover:text-text">Show all posts</button>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-4 pt-1 sm:pt-2">
            {filteredItems.map((item, i) => {
              const src = getSourceInfo(item.source);
              const favicon = src.icon || getSourceFavicon(item.source, item.url);
              const title = cleanTitle(item.title);
              const summary = cleanSummary(item.summary, title);
              const hasImage = !!item.image_url;
              const ytMatch = item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
              const ytId = ytMatch?.[1];
              return (
                <article key={item.id || i} className="group rounded-3xl border border-border overflow-hidden bg-bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  {ytId ? (
                    <div className="w-full aspect-video">
                      <iframe src={`https://www.youtube.com/embed/${ytId}`} title={title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                    </div>
                  ) : null}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block" onClick={() => trackEvent("article_click", { source: item.source, feed: feedSlug })}>
                    {!ytId && hasImage && (
                      <div className="w-full aspect-[2/1] overflow-hidden relative">
                        <img
                          src={item.image_url}
                          alt={title}
                          className="w-full h-full object-cover"
                          loading={i === 0 ? "eager" : "lazy"}
                          fetchPriority={i === 0 ? "high" : "auto"}
                          onError={(e) => { const container = (e.target as HTMLImageElement).parentElement; if (container) container.style.display = "none"; }}
                        />
                      </div>
                    )}
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${src.color}`}>
                          {favicon ? <img src={favicon} alt="" className="w-3 h-3 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : null}
                          {src.name}
                        </span>
                        <span className="text-[11px] text-text-muted">{timeAgo(item.publishedAt)}</span>
                      </div>
                      <h2 className="font-semibold text-text leading-snug text-[15px] group-hover:text-text/80 transition-colors">{title}</h2>
                      {summary && summary !== title && summary.length > 10 && (
                        <p className="text-sm text-text-muted mt-1.5 line-clamp-2 leading-relaxed">{summary}</p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-4">
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "like"); }} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${userReactions[item.id] === "like" ? "text-green-400 bg-green-500/10" : "text-text-muted hover:text-green-400 hover:bg-green-500/10"}`} aria-label="More like this"><ThumbsUp className="h-3.5 w-3.5" />More</button>
                          <button onClick={(e) => { e.preventDefault(); handleReaction(item.id, "dislike"); }} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${userReactions[item.id] === "dislike" ? "text-red-400 bg-red-500/10" : "text-text-muted hover:text-red-400 hover:bg-red-500/10"}`} aria-label="Less like this"><ThumbsDown className="h-3.5 w-3.5" />Less</button>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={(e) => { e.preventDefault(); handleBookmark(item.id); }} className={`p-1.5 rounded-md text-xs flex items-center justify-center transition-all ${userBookmarks.has(item.id) ? "text-yellow-400 bg-yellow-500/10" : "text-text-muted hover:text-text hover:bg-bg-hover"}`} aria-label="Save">{userBookmarks.has(item.id) ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}</button>
                          <button onClick={(e) => { e.preventDefault(); handleShare(item); }} className="p-1.5 rounded-md text-xs text-text-muted hover:text-text hover:bg-bg-hover flex items-center justify-center transition-all" aria-label="Share"><Share2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  </a>
                </article>
              );
            })}
          </div>
        )}

        {hasMore && (
          <LoadMoreSentinel loading={loadingMore} onVisible={loadMore} />
        )}
        {!hasMore && dedupedItems.length > 0 && dedupedItems.length >= 15 && (
          <p className="text-center py-6 text-xs text-text-muted">You&apos;ve reached the end of this feed</p>
        )}
        {!hasMore && dedupedItems.length > 0 && dedupedItems.length < 15 && (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted mb-1">This feed is building up</p>
            <p className="text-xs text-text-muted">New content is added continuously. Check back soon for more.</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 rounded-2xl border border-border bg-bg-card overflow-hidden">
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-text/5 mb-4">
              <Zap className="h-6 w-6 text-text" />
            </div>
            <h3 className="font-bold text-lg mb-2">Your internet, curated by AI</h3>
            <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">
              Describe what you care about in plain English. MyFeed scans thousands of sources and delivers only what matters to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setShowNewFeed(true)} className="inline-flex items-center justify-center gap-2 bg-text text-bg px-6 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity">
                <Sparkles className="h-4 w-4" />
                Create your custom feed
              </button>
            </div>
          </div>
          <div className="border-t border-border/50 px-6 py-4 bg-bg-hover/30">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2 font-medium">Popular feeds</p>
            <div className="flex flex-wrap gap-2">
              {["AI tools & products", "Startup funding", "React & Next.js", "Space exploration", "Cybersecurity"].map((ex) => (
                <span key={ex} className="text-xs px-3 py-1 rounded-full border border-border/50 text-text-muted">{ex}</span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 mt-8">
        <div className="max-w-2xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-text-muted">
          <span>MyFeed &copy; {new Date().getFullYear()}</span>
          <Link href="/privacy" className="hover:text-text transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-text transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-text transition-colors">Contact</Link>
        </div>
      </footer>

      {/* New Feed Modal */}
      {/* Remove tab confirmation popup */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRemoveConfirm(null)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Remove from tabs?</h3>
            <p className="text-sm text-text-muted mb-4">This will remove the tab from your bar. You can find it again in Explore.</p>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowRemoveAgain}
                onChange={(e) => {
                  setDontShowRemoveAgain(e.target.checked);
                  try { localStorage.setItem("mf_dont_show_remove", e.target.checked ? "1" : "0"); } catch {}
                }}
                className="rounded border-border"
              />
              <span className="text-xs text-text-muted">Don&apos;t show this again</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowRemoveConfirm(null)} className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
              <button onClick={() => removeTab(showRemoveConfirm)} className="flex-1 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}

      {showNewFeed && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewFeed(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-text/5 flex items-center justify-center"><Sparkles className="h-4 w-4 text-text" /></div>
                  <h2 className="font-bold text-lg">Create a Feed</h2>
                </div>
                <button onClick={() => setShowNewFeed(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4 ml-10">Describe what you want to follow. AI will find the best content.</p>
              <textarea autoFocus placeholder="e.g. Latest React and Next.js tutorials, new CSS features, web performance tips" className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 transition-all placeholder:text-text-muted/50" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
              <div className="mt-3 mb-4">
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2 font-medium">Try these</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => setNewPrompt(ex)} className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-text-muted hover:text-text hover:border-text/30 transition-all">{ex.length > 40 ? ex.slice(0, 37) + "..." : ex}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewFeed(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                {user ? (
                  <button
                    onClick={async () => {
                      if (!newPrompt.trim()) return;
                      trackEvent("create_feed", { prompt: newPrompt.slice(0, 100), logged_in: true });
                      try {
                        const res = await fetch("/api/feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPrompt.slice(0, 40), query_text: newPrompt }) });
                        const data = await res.json();
                        const id = data.feed?.id;
                        if (id) { fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {}); window.location.href = `/my/${id}`; return; }
                        window.location.href = "/dashboard";
                      } catch { window.location.href = "/dashboard"; }
                    }}
                    className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Create feed
                  </button>
                ) : (
                  <Link href={`/login?signup=true${newPrompt ? `&prompt=${encodeURIComponent(newPrompt)}` : ""}`} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sign up to create
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load More Sentinel is defined below */}

      {/* Customize Feed Modal */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCustomize(false)}>
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-text/5 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-text" /></div>
                  <h2 className="font-bold text-lg">Customize Feed</h2>
                </div>
                <button onClick={() => setShowCustomize(false)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"><X className="h-5 w-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-muted mb-4 ml-10">Change the prompt to adjust what content appears.</p>
              <textarea autoFocus className="w-full bg-bg-hover border border-border rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:border-text/50 focus:ring-1 focus:ring-text/20 transition-all" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowCustomize(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-bg-hover transition-colors font-medium">Cancel</button>
                {user ? (
                  <button onClick={async () => { if (!newPrompt.trim()) return; try { const res = await fetch("/api/feeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPrompt.slice(0, 40), query_text: newPrompt }) }); const data = await res.json(); const id = data.feed?.id; if (id) { fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {}); window.location.href = `/my/${id}`; return; } } catch {} setShowCustomize(false); }} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Save as custom feed
                  </button>
                ) : (
                <Link href={`/login?signup=true${newPrompt ? `&prompt=${encodeURIComponent(newPrompt)}` : ""}`} className="flex-1 py-2.5 text-sm text-center bg-text text-bg rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sign up to customize
                </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadMoreSentinel({ loading, onVisible }: { loading: boolean; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onVisibleRef.current(); },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex justify-center py-6">
      {loading && (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
      )}
    </div>
  );
}
