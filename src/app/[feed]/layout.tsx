import type { Metadata } from "next";

const TABS: Record<string, { name: string; icon: string; description: string }> = {
  ai: { name: "AI & ML", icon: "🤖", description: "Latest AI breakthroughs, LLM models, AI startups, machine learning research, and AI tools" },
  tech: { name: "Tech", icon: "💻", description: "Tech industry news, product launches, gadgets, and big tech company updates" },
  startups: { name: "Startups", icon: "🚀", description: "Startup funding rounds, venture capital deals, Y Combinator, and founder stories" },
  dev: { name: "Dev", icon: "⚡", description: "Software engineering, programming tutorials, developer tools, and open source projects" },
  science: { name: "Science", icon: "🔬", description: "Scientific discoveries, space exploration, physics breakthroughs, and research papers" },
  crypto: { name: "Crypto", icon: "₿", description: "Cryptocurrency, Bitcoin, Ethereum, blockchain, DeFi, and Web3 news" },
  design: { name: "Design", icon: "🎨", description: "UI/UX design, product design, Figma, design systems, and visual design trends" },
  security: { name: "Security", icon: "🔒", description: "Cybersecurity, data breaches, zero-day exploits, infosec tools, and security research" },
  gaming: { name: "Gaming", icon: "🎮", description: "Video games, game releases, esports, game development, and indie games" },
  business: { name: "Business", icon: "📈", description: "Business strategy, leadership, market trends, and entrepreneurship news" },
  space: { name: "Space", icon: "🚀", description: "SpaceX launches, NASA missions, Mars exploration, and space industry updates" },
  health: { name: "Health", icon: "🏥", description: "Health research, medical breakthroughs, mental health, nutrition, and biotech news" },
  climate: { name: "Climate", icon: "🌍", description: "Climate change, renewable energy, sustainability, and green technology news" },
  fintech: { name: "Fintech", icon: "💳", description: "Fintech news, digital banking, payment technology, neobanks, and financial APIs" },
  devops: { name: "DevOps", icon: "🔧", description: "DevOps, cloud infrastructure, Kubernetes, CI/CD, AWS, Azure, GCP, and SRE" },
  data: { name: "Data", icon: "📊", description: "Data science, analytics, big data, data engineering, and business intelligence" },
  mobile: { name: "Mobile", icon: "📱", description: "Mobile app development, iOS, Android, React Native, Flutter, and app trends" },
  marketing: { name: "Marketing", icon: "📣", description: "Digital marketing, SEO, content marketing, growth hacking, and social media" },
};

type Props = {
  params: Promise<{ feed: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { feed } = await params;
  const tab = TABS[feed];

  if (!tab) {
    return { title: "Feed Not Found — MyFeed" };
  }

  const title = `${tab.name} News Feed — MyFeed`;
  const description = tab.description;
  const url = `https://myfeed.space/${feed}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "MyFeed",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
