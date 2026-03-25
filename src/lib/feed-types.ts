export interface Tab {
  id: string;
  name: string;
  prompt: string;
  items: FeedItem[];
  loading: boolean;
  lastRefresh: string | null;
  error?: string | null;
}

export interface FeedItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sourceIcon?: string;
}

export const FEED_TEMPLATES = [
  {
    emoji: "🤖",
    name: "AI News",
    prompt: "Latest AI and machine learning breakthroughs, new models, and research papers",
  },
  {
    emoji: "🚀",
    name: "Startups",
    prompt: "Startup funding news, product launches, and founder stories",
  },
  {
    emoji: "💻",
    name: "Dev Tools",
    prompt: "New developer tools, frameworks, programming languages, and open source projects",
  },
  {
    emoji: "₿",
    name: "Crypto",
    prompt: "Cryptocurrency market news, DeFi updates, and blockchain technology",
  },
  {
    emoji: "🎨",
    name: "Design",
    prompt: "UI/UX design trends, tools, and inspiration",
  },
  {
    emoji: "📈",
    name: "Markets",
    prompt: "Stock market analysis, economic news, and investment trends",
  },
];

export function mapDbItemToFeedItem(item: Record<string, unknown>): FeedItem {
  const source = (item.source as string) || "";
  let hostname = source;
  try {
    if (item.url) hostname = new URL(item.url as string).hostname.replace("www.", "");
  } catch {}
  return {
    id: item.id as string,
    title: item.title as string,
    summary: item.summary as string,
    source,
    url: item.url as string,
    publishedAt: (item.published_at as string) || (item.created_at as string),
    sourceIcon: (item.image_url as string) || `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
  };
}
