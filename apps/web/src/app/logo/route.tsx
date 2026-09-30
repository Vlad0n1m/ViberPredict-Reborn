import { ImageResponse } from "next/og";

// Public PNG of the dark lockup (mark + wordmark) for hosts that need an image URL: /logo
export const dynamic = "force-static";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="c"><circle cx="32" cy="32" r="30"/></clipPath></defs><g clip-path="url(#c)"><rect x="-20" y="-20" width="52" height="104" fill="#2459FF" transform="rotate(20 32 32)"/><rect x="32" y="-20" width="52" height="104" fill="#FF5A1F" transform="rotate(20 32 32)"/></g><circle cx="32" cy="32" r="9" fill="#D7FF3D" stroke="#15161A" stroke-width="3"/></svg>`;

async function loadFont() {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&text=viberpdct%20")
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const font = await loadFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          background: "#15161A",
          color: "#FFFFFF",
        }}
      >
        <img src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`} width={96} height={96} alt="" />
        <span style={{ fontSize: 68, fontWeight: 800, letterSpacing: -2.5, fontFamily: font ? "Bricolage" : "sans-serif" }}>
          viber predict
        </span>
      </div>
    ),
    {
      width: 640,
      height: 320,
      fonts: font ? [{ name: "Bricolage", data: font, weight: 800, style: "normal" }] : undefined,
    },
  );
}
