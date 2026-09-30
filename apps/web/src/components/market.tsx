import Link from "next/link";
import { Countdown } from "./countdown";
import { chance, multiplier, sol, total, type Market } from "@/lib/markets";

const tagColors: Record<string, string> = {
  Crypto: "bg-ink text-flame",
  Solana: "bg-yes text-ink",
  "Tech & AI": "bg-no text-ink",
  Kazakhstan: "bg-devnet text-ink",
  Seeker: "bg-fg text-ink",
  Sports: "bg-[#8B7CFF] text-ink",
  Hackathon: "bg-flame text-ink",
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
      <path d={`M0 ${h * 0.2}H${w}M0 ${h * 0.5}H${w}M0 ${h * 0.8}H${w}`} stroke="#2E231E" strokeDasharray="4 6" />
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="#FFB02E" fillOpacity="0.08" className="anim-fade" />
      <path d={line} pathLength={1} fill="none" stroke="#FFB02E" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="anim-draw" />
      <g className="anim-fade" style={{ animationDelay: "1.2s" }}>
        <circle cx={w} cy={y(last)} r="6" fill="#FFB02E" className="anim-ring" />
        <circle cx={w} cy={y(last)} r="6" fill="#FFB02E" />
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
      className="anim-rise flex flex-col gap-3 rounded-lg bg-card p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,176,46,0.45),0_12px_32px_rgba(255,106,26,0.12)] sm:p-5"
    >
      <div className="flex flex-1 items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-medium ${tagColors[m.tag] ?? "bg-ink text-white"}`}>
          {tagInitials[m.tag] ?? "?"}
        </span>
        <p className="flex-1 text-base font-medium leading-snug">{m.question}</p>
        <div className="flex shrink-0 flex-col items-end">
          <span className="font-display text-2xl font-black leading-none tracking-tight text-flame">{c}%</span>
          <span className="text-[11px] text-muted">chance</span>
        </div>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-sm bg-no/60">
        <span className="anim-grow bg-yes" style={{ width: `${c}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
        <span className="flex h-11 items-center justify-between rounded-md bg-yes-soft px-3.5 text-yes">
          Yes <span className="font-mono text-xs">{multiplier(m, "yes").toFixed(2)}×</span>
        </span>
        <span className="flex h-11 items-center justify-between rounded-md bg-no-soft px-3.5 text-no">
          No <span className="font-mono text-xs">{multiplier(m, "no").toFixed(2)}×</span>
        </span>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
        {m.tag} · {sol(total(m), 1)} SOL · {m.closesIn}
      </p>
    </Link>
  );
}

export function ClosingRow({ m }: { m: Market }) {
  return (
    <Link href={`/market/${m.id}`} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5">
      <span className="flex h-[54px] w-[62px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-md bg-ink font-mono text-flame">
        <Countdown label={m.closesIn} className="text-[13px] font-medium" />
        <span className="flex items-center gap-1 text-[9px] text-[#A8988C]">
          <span className="live-dot h-1 w-1 bg-no" />
          left
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium leading-tight">{m.question}</span>
        <span className="font-mono text-xs text-yes">{chance(m)}% yes</span>
      </span>
    </Link>
  );
}
