import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
          backgroundColor: "#0f172a",
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.15), transparent 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              backgroundColor: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              color: "white",
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#f8fafc",
            }}
          >
            FeedBot
          </span>
        </div>
        <h1
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#f8fafc",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: "16px",
          }}
        >
          Your Internet,{" "}
          <span style={{ color: "#6366f1" }}>Curated by AI</span>
        </h1>
        <p
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          Describe what you care about. Get a real-time feed from across the
          entire internet.
        </p>
        <div
          style={{
            display: "flex",
            marginTop: "32px",
            gap: "32px",
            color: "#94a3b8",
            fontSize: "20px",
          }}
        >
          <span>✓ Free forever</span>
          <span>✓ No RSS needed</span>
          <span>✓ 30 sec setup</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
