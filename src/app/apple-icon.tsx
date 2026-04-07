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
          background: "#e7e9ea",
          color: "#000000",
          borderRadius: "40px",
          fontSize: 78,
          fontWeight: 900,
          letterSpacing: "-0.08em",
          lineHeight: 1,
        }}
      >
        MF
      </div>
    ),
    { ...size }
  );
}
