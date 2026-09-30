"use client";

import { useEffect, useState } from "react";

/** Parses "38m", "1h 10m", "2h", "5d" into seconds. */
function toSeconds(label: string) {
  let s = 0;
  for (const [, n, u] of label.matchAll(/(\d+)\s*([dhm])/g)) {
    s += Number(n) * (u === "d" ? 86400 : u === "h" ? 3600 : 60);
  }
  return s;
}

/** Live ticking countdown for markets that close within a day; static label otherwise. */
export function Countdown({ label, className = "" }: { label: string; className?: string }) {
  const start = toSeconds(label);
  const [left, setLeft] = useState(start);

  useEffect(() => {
    if (start === 0 || start > 86400) return;
    const t0 = Date.now();
    const id = setInterval(() => setLeft(Math.max(0, start - Math.floor((Date.now() - t0) / 1000))), 1000);
    return () => clearInterval(id);
  }, [start]);

  if (start === 0 || start > 86400) return <span className={className}>{label}</span>;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className={`tabular-nums ${className}`}>
      {h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`}
    </span>
  );
}
