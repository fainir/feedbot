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
          backgroundColor: "#0f1419",
        }}
      >
        <div
          style={{
            width: "180px",
            height: "180px",
            borderRadius: "44px",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "96px",
            fontWeight: 900,
            color: "#0f1419",
            letterSpacing: "-0.04em",
            marginBottom: "40px",
          }}
        >
          MF
        </div>
        <h1
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "#e7e9ea",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "16px",
          }}
        >
          MyFeed
        </h1>
        <p
          style={{
            fontSize: "28px",
            color: "#71767b",
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          AI curates custom feeds from any topic you describe
        </p>
        <p
          style={{
            fontSize: "22px",
            color: "#536471",
            textAlign: "center",
            marginTop: "24px",
          }}
        >
          myfeed.space
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
