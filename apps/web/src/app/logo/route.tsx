import { ImageResponse } from "next/og";
import { MARK_SVG } from "@/lib/brand";

// Public PNG of the Reborn lockup (phoenix mark + wordmark): /logo
export const dynamic = "force-static";

async function loadFont() {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Unbounded:wght@900&text=VIBERREBORNPDICT%C2%B7%20")
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const font = await loadFont();
  const family = font ? "Unbounded" : "sans-serif";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: "radial-gradient(circle at 20% 50%, #2a1510 0%, #0C0A09 60%)",
          color: "#F5EDE4",
          fontFamily: family,
        }}
      >
        <img src={`data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString("base64")}`} width={220} height={220} alt="" />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.95 }}>
          <span style={{ fontSize: 96, fontWeight: 900, letterSpacing: -3 }}>VIBER</span>
          <span style={{ fontSize: 96, fontWeight: 900, letterSpacing: -3, color: "#FF8A1F" }}>REBORN</span>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: 8, color: "#9C8E84", marginTop: 18 }}>PREDICT · DEVNET</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 600,
      fonts: font ? [{ name: "Unbounded", data: font, weight: 900, style: "normal" }] : undefined,
    },
  );
}
