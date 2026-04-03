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
          backgroundColor: "#000",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              backgroundColor: "#e7e9ea",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 800,
              color: "#000",
            }}
          >
            MF
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#e7e9ea",
            }}
          >
            MyFeed
          </span>
        </div>
        <h1
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#e7e9ea",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: "16px",
          }}
        >
          Your Internet, Curated by AI
        </h1>
        <p
          style={{
            fontSize: "24px",
            color: "#71767b",
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
            marginTop: "40px",
            gap: "32px",
            color: "#71767b",
            fontSize: "20px",
          }}
        >
          <span>Free to start</span>
          <span>&#183;</span>
          <span>No RSS needed</span>
          <span>&#183;</span>
          <span>30 sec setup</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
