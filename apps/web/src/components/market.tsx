import Link from "next/link";
import { Countdown } from "./countdown";
import { chance, multiplier, sol, total, type Market } from "@/lib/markets";

export function Sparkline({ points, className = "" }: { points: number[]; className?: string }) {
  const w = 440;
  const h = 300;
  const step = w / (points.length - 1);
  const y = (p: number) => h - (p / 100) * h;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path d={`M0 ${h * 0.2}H${w}M0 ${h * 0.5}H${w}M0 ${h * 0.8}H${w}`} stroke="#262321" strokeDasharray="2 6" />
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="#FF8A3D" fillOpacity="0.06" className="anim-fade" />
      <path d={line} pathLength={1} fill="none" stroke="#FF8A3D" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="anim-draw" />
      <g className="anim-fade" style={{ animationDelay: "1.2s" }}>
        <circle cx={w} cy={y(last)} r="6" fill="#FF8A3D" className="anim-ring" />
        <circle cx={w} cy={y(last)} r="4" fill="#FF8A3D" />
      </g>
    </svg>
  );
}

export function MarketCard({ m, index = 0 }: { m: Market; index?: number }) {
  const c = chance(m);
  return (
    <Link
      href={`/market/${m.id}`}
      style={{ animationDelay: `${index * 40}ms` }}
      className="anim-rise group flex flex-col gap-4 rounded-xl bg-card p-5 transition-colors duration-150 hover:bg-ink"
    >
      <div className="flex items-center justify-between font-mono text-[11px] text-muted">
        <span>{m.tag}</span>
        <span>{m.closesIn}</span>
      </div>
      <p className="flex-1 text-[15px] font-semibold leading-snug">{m.question}</p>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-2xl font-medium tracking-tight">
            {c}
            <span className="text-sm text-muted">%</span>
          </span>
          <span className="font-mono text-xs text-muted">{sol(total(m), 3)} SOL</span>
        </div>
        <div className="flex h-1 overflow-hidden rounded-full bg-line">
          <span className="bg-yes" style={{ width: `${c}%` }} />
        </div>
        <div className="flex justify-between font-mono text-[11px]">
          <span className="text-yes">Yes {multiplier(m, "yes").toFixed(2)}×</span>
          <span className="text-no">No {multiplier(m, "no").toFixed(2)}×</span>
        </div>
      </div>
    </Link>
  );
}

export function ClosingRow({ m }: { m: Market }) {
  return (
    <Link href={`/market/${m.id}`} className="flex items-center gap-4 py-3 transition-colors duration-150 hover:text-flame">
      <Countdown label={m.closesIn} className="w-16 shrink-0 font-mono text-xs text-muted" />
      <span className="flex-1 truncate text-sm">{m.question}</span>
      <span className="font-mono text-xs text-muted">{chance(m)}%</span>
    </Link>
  );
}
