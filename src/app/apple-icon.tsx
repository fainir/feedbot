import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1419",
          color: "#ffffff",
          borderRadius: "44px",
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        MF
      </div>
    ),
    { ...size }
  );
}
