import { NextResponse } from "next/server";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

// Feed generation endpoint — takes a prompt, returns curated internet content
// For MVP: uses web search simulation. Production: integrate real search API.

interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

// Generate feed items based on a prompt
// MVP: returns simulated results based on topic keywords
// TODO: Integrate real web search API (SerpAPI, Brave Search, or Google Custom Search)
async function generateFeedItems(prompt: string): Promise<FeedItem[]> {
  const now = Date.now();

  // Try real search via Brave Search API if key available
  if (process.env.BRAVE_SEARCH_API_KEY) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(prompt + " latest news")}&count=10&freshness=pw`,
        {
          headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return (data.web?.results || []).map((r: { title: string; description: string; url: string; age?: string; profile?: { img?: string } }, i: number) => {
          const hostname = new URL(r.url).hostname.replace("www.", "");
          return {
            id: `brave-${i}-${Date.now()}`,
            title: r.title,
            summary: r.description,
            source: hostname,
            url: r.url,
            publishedAt: new Date(now - i * 3600000).toISOString(),
            sourceIcon: r.profile?.img || `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
          };
        });
      }
    } catch {}
  }

  // Fallback: generate mock content based on prompt keywords
  const topics = prompt.toLowerCase();
  const items: FeedItem[] = [];
  const id = () => Math.random().toString(36).slice(2, 9);

  if (topics.includes("ai") || topics.includes("artificial intelligence") || topics.includes("machine learning")) {
    items.push(
      { id: id(), title: "New Breakthrough in AI Reasoning Capabilities", summary: "Researchers demonstrate significant improvements in multi-step reasoning tasks, with new models achieving 40% better accuracy on complex problem-solving benchmarks.", source: "AI Research Daily", url: "https://arxiv.org", publishedAt: new Date(now - 2 * 3600000).toISOString() },
      { id: id(), title: "Open Source AI Models Close Gap with Proprietary Systems", summary: "Latest open-weight models from the community now match GPT-4 class performance on most benchmarks, making advanced AI accessible to everyone.", source: "Hugging Face Blog", url: "https://huggingface.co/blog", publishedAt: new Date(now - 5 * 3600000).toISOString() },
      { id: id(), title: "AI Agents Now Handle Complex Enterprise Workflows", summary: "New agentic frameworks enable AI to manage multi-step business processes autonomously, from customer onboarding to financial reporting.", source: "TechCrunch", url: "https://techcrunch.com", publishedAt: new Date(now - 8 * 3600000).toISOString() },
    );
  }

  if (topics.includes("startup") || topics.includes("business") || topics.includes("entrepreneur")) {
    items.push(
      { id: id(), title: "Y Combinator Latest Batch: Top Companies to Watch", summary: "The newest YC batch features 15 AI-native companies, 8 climate tech startups, and 5 developer tool companies. Here are the ones with the most traction.", source: "TechCrunch", url: "https://techcrunch.com", publishedAt: new Date(now - 3 * 3600000).toISOString() },
      { id: id(), title: "How to Bootstrap a SaaS to $10K MRR", summary: "A practical guide from a founder who went from zero to $10K monthly recurring revenue in 6 months without raising funding.", source: "Indie Hackers", url: "https://indiehackers.com", publishedAt: new Date(now - 7 * 3600000).toISOString() },
      { id: id(), title: "Remote Work Tools Seeing Massive Adoption in 2026", summary: "With 60% of knowledge workers now fully remote, tools for async collaboration, AI meeting summaries, and virtual offices are seeing record growth.", source: "The Information", url: "https://theinformation.com", publishedAt: new Date(now - 12 * 3600000).toISOString() },
    );
  }

  if (topics.includes("tech") || topics.includes("programming") || topics.includes("developer") || topics.includes("code")) {
    items.push(
      { id: id(), title: "Rust Adoption Hits New Milestone in Systems Programming", summary: "Major tech companies report that Rust now powers critical infrastructure, with 30% of new systems code being written in Rust at Google, Microsoft, and Amazon.", source: "The Register", url: "https://theregister.com", publishedAt: new Date(now - 4 * 3600000).toISOString() },
      { id: id(), title: "WebAssembly 3.0 Brings Native Performance to Browsers", summary: "The latest WebAssembly spec adds garbage collection, threads, and SIMD support, enabling complex applications to run at near-native speed in any browser.", source: "Mozilla Hacks", url: "https://hacks.mozilla.org", publishedAt: new Date(now - 9 * 3600000).toISOString() },
    );
  }

  if (topics.includes("crypto") || topics.includes("bitcoin") || topics.includes("blockchain") || topics.includes("web3")) {
    items.push(
      { id: id(), title: "Bitcoin ETFs See Record Inflows as Institutional Interest Grows", summary: "Bitcoin ETFs attracted $2.5 billion in a single week, marking the highest weekly inflow since their launch.", source: "CoinDesk", url: "https://coindesk.com", publishedAt: new Date(now - 3 * 3600000).toISOString() },
      { id: id(), title: "Ethereum Layer 2 Solutions Process More Transactions Than Mainnet", summary: "Combined L2 throughput now exceeds Ethereum mainnet by 5x, with costs dropping to fractions of a cent per transaction.", source: "The Block", url: "https://theblock.co", publishedAt: new Date(now - 6 * 3600000).toISOString() },
    );
  }

  // Generic fallback for any other topic
  if (items.length === 0) {
    items.push(
      { id: id(), title: `Latest Updates on ${prompt}`, summary: `A comprehensive overview of recent developments related to "${prompt}". Stay informed with curated content from across the web.`, source: "Web", url: "https://google.com/search?q=" + encodeURIComponent(prompt), publishedAt: new Date(now - 1 * 3600000).toISOString() },
      { id: id(), title: `Expert Analysis: ${prompt} Trends`, summary: `Industry experts weigh in on the latest trends and predictions for "${prompt}" in 2026. Key takeaways and actionable insights.`, source: "Medium", url: "https://medium.com", publishedAt: new Date(now - 6 * 3600000).toISOString() },
      { id: id(), title: `Community Discussion: ${prompt}`, summary: `Active community discussions and debates about "${prompt}". Top-voted comments and expert opinions from various platforms.`, source: "Reddit", url: "https://reddit.com", publishedAt: new Date(now - 12 * 3600000).toISOString() },
    );
  }

  return items;
}

export async function POST(req: Request) {
  // Rate limit: 20 requests per minute per IP
  const rl = rateLimit(`generate:${getClientKey(req)}`, { limit: 20, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const items = await generateFeedItems(prompt.trim());
    return NextResponse.json({ items, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to generate feed" },
      { status: 500 }
    );
  }
}
