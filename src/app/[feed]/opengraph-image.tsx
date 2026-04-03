import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MyFeed";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TABS: Record<string, { name: string; icon: string }> = {
  ai: { name: "AI & ML", icon: "🤖" },
  tech: { name: "Tech", icon: "💻" },
  startups: { name: "Startups", icon: "🚀" },
  dev: { name: "Dev", icon: "⚡" },
  science: { name: "Science", icon: "🔬" },
  crypto: { name: "Crypto", icon: "₿" },
  design: { name: "Design", icon: "🎨" },
  security: { name: "Security", icon: "🔒" },
  gaming: { name: "Gaming", icon: "🎮" },
  business: { name: "Business", icon: "📈" },
  space: { name: "Space", icon: "🚀" },
  health: { name: "Health", icon: "🏥" },
  climate: { name: "Climate", icon: "🌍" },
  fintech: { name: "Fintech", icon: "💳" },
  devops: { name: "DevOps", icon: "🔧" },
  data: { name: "Data", icon: "📊" },
  mobile: { name: "Mobile", icon: "📱" },
  marketing: { name: "Marketing", icon: "📣" },
};

export default async function Image({ params }: { params: Promise<{ feed: string }> }) {
  const { feed } = await params;
  const tab = TABS[feed] || { name: feed, icon: "📰" };

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#e7e9ea",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 800,
              color: "#000",
            }}
          >
            MF
          </div>
          <span style={{ fontSize: "28px", fontWeight: 700, color: "#e7e9ea" }}>
            MyFeed
          </span>
        </div>
        <div style={{ fontSize: "80px", marginBottom: "16px" }}>{tab.icon}</div>
        <h1
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "#e7e9ea",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: "16px",
          }}
        >
          {tab.name} Feed
        </h1>
        <p
          style={{
            fontSize: "24px",
            color: "#71767b",
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          AI-curated {tab.name.toLowerCase()} news from across the internet
        </p>
        <div
          style={{
            display: "flex",
            marginTop: "40px",
            gap: "24px",
            color: "#71767b",
            fontSize: "18px",
          }}
        >
          <span>Updated every 15 min</span>
          <span>&#183;</span>
          <span>myfeed.space/{feed}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
