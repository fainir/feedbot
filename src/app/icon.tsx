import { ImageResponse } from "next/og";

export const size = { width: 128, height: 128 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "30px",
          fontSize: 68,
          fontWeight: 900,
          letterSpacing: "-0.12em",
          lineHeight: 1,
        }}
      >
        MF
      </div>
    ),
    { ...size }
  );
}
