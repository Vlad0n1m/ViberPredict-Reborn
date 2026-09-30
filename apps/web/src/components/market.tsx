import Link from "next/link";
import { Countdown } from "./countdown";
import { chance, multiplier, sol, total, type Market } from "@/lib/markets";

const tagColors: Record<string, string> = {
  Crypto: "bg-ink text-lime",
  Solana: "bg-yes text-white",
  "Tech & AI": "bg-no text-ink",
  Kazakhstan: "bg-devnet text-ink",
  Seeker: "bg-ink text-white",
  Sports: "bg-[#1fa971] text-white",
  Hackathon: "bg-lime text-ink",
};

const tagInitials: Record<string, string> = {
  Crypto: "SOL",
  Solana: "TPS",
  "Tech & AI": "AI",
  Kazakhstan: "KZ",
  Seeker: "SKR",
  Sports: "FC",
  Hackathon: "HK",
};

export function Sparkline({ points, className = "" }: { points: number[]; className?: string }) {
  const w = 440;
  const h = 300;
  const step = w / (points.length - 1);
  const y = (p: number) => h - (p / 100) * h;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path d={`M0 ${h * 0.2}H${w}M0 ${h * 0.5}H${w}M0 ${h * 0.8}H${w}`} stroke="#2A2B30" strokeDasharray="4 6" />
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="#D7FF3D" fillOpacity="0.08" className="anim-fade" />
      <path d={line} pathLength={1} fill="none" stroke="#D7FF3D" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="anim-draw" />
      <g className="anim-fade" style={{ animationDelay: "1.2s" }}>
        <circle cx={w} cy={y(last)} r="6" fill="#D7FF3D" className="anim-ring" />
        <circle cx={w} cy={y(last)} r="6" fill="#D7FF3D" />
      </g>
    </svg>
  );
}

export function MarketCard({ m, index = 0 }: { m: Market; index?: number }) {
  const c = chance(m);
  return (
    <Link
      href={`/market/${m.id}`}
      style={{ animationDelay: `${index * 50}ms` }}
      className="anim-rise flex flex-col gap-3 rounded-3xl bg-card p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(21,22,26,0.06)] sm:p-5"
    >
      <div className="flex flex-1 items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-mono text-[11px] font-medium ${tagColors[m.tag] ?? "bg-ink text-white"}`}>
          {tagInitials[m.tag] ?? "?"}
        </span>
        <p className="flex-1 text-base font-medium leading-snug">{m.question}</p>
        <div className="flex shrink-0 flex-col items-end">
          <span className="font-display text-3xl font-extrabold leading-none tracking-tight">{c}%</span>
          <span className="text-[11px] text-muted">chance</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
        <span className="flex h-11 items-center justify-between rounded-2xl bg-yes-soft px-3.5 text-[#1a45d6]">
          Yes <span className="font-mono text-xs">{multiplier(m, "yes").toFixed(2)}×</span>
        </span>
        <span className="flex h-11 items-center justify-between rounded-2xl bg-no-soft px-3.5 text-[#b83a0b]">
          No <span className="font-mono text-xs">{multiplier(m, "no").toFixed(2)}×</span>
        </span>
      </div>
      <p className="font-mono text-xs text-muted">
        {m.tag} · {sol(total(m), 1)} SOL · {m.closesIn}
      </p>
    </Link>
  );
}

export function ClosingRow({ m }: { m: Market }) {
  return (
    <Link href={`/market/${m.id}`} className="flex items-center gap-3 rounded-[22px] bg-card px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5">
      <span className="flex h-[54px] w-[62px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-ink font-mono text-lime">
        <Countdown label={m.closesIn} className="text-[13px] font-medium" />
        <span className="flex items-center gap-1 text-[9px] text-[#a9a69e]">
          <span className="live-dot h-1 w-1 bg-no" />
          left
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium leading-tight">{m.question}</span>
        <span className="font-mono text-xs text-[#1a45d6]">{chance(m)}% yes</span>
      </span>
    </Link>
  );
}
