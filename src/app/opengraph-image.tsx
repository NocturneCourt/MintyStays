import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#eef7f4",
          color: "#10181c",
          padding: 64,
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 38,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #087866",
              borderRadius: 12,
              color: "#087866",
              fontSize: 34,
            }}
          >
            *
          </div>
          MintyStays
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              color: "#087866",
              fontFamily: "Arial, sans-serif",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Actually cold stays
          </div>
          <div
            style={{
              maxWidth: 900,
              fontSize: 82,
              fontWeight: 700,
              lineHeight: 0.95,
            }}
          >
            Hotels and rentals with cooling evidence.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            fontFamily: "Arial, sans-serif",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          <span>Guest Signal</span>
          <span style={{ color: "#087866" }}>/</span>
          <span>Editor Score</span>
          <span style={{ color: "#087866" }}>/</span>
          <span>Map-first</span>
        </div>
      </div>
    ),
    size,
  );
}
