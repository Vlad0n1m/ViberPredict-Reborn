type Props = {
  question: string;
  side: string;
  odds: string;
  profit: string;
  pnl: string;
  calledAt: string;
  stake: string;
  payout: string;
};

/** 4:3 P&L card, scales with its container width. */
export function ShareCard(p: Props) {
  return (
    <div className="@container relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-ink text-white ring-1 ring-[#2E231E]">
      <svg viewBox="0 0 760 900" className="absolute right-0 top-0 h-full w-[63%]" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle cx="470" cy="420" r="330" fill="#1B1411" />
        <circle cx="470" cy="420" r="230" fill="#241B17" />
        <circle cx="470" cy="420" r="330" fill="none" stroke="#FFB02E" strokeWidth="2" strokeDasharray="3 14" />
        <rect x="160" y="120" width="18" height="36" rx="3" fill="#FFB02E" transform="rotate(24 169 138)" />
        <rect x="640" y="170" width="16" height="30" rx="3" fill="#FF4D6A" transform="rotate(-30 648 185)" />
        <rect x="690" y="560" width="16" height="32" rx="3" fill="#22D39A" transform="rotate(40 698 576)" />
        <rect x="230" y="660" width="18" height="34" rx="3" fill="#22D39A" transform="rotate(-18 239 677)" />
        <path d="M330 300 Q470 300 610 300 Q600 440 470 450 Q340 440 330 300 Z" fill="#FFB02E" fillOpacity="0.9" />
        <path d="M320 290 H620" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <path d="M330 300 Q340 440 470 450 Q600 440 610 300" fill="none" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M470 450 V650" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M390 668 Q470 640 550 668" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <circle cx="500" cy="240" r="6" fill="none" stroke="#FFB02E" strokeWidth="3" />
        <circle cx="440" cy="190" r="9" fill="none" stroke="#FFB02E" strokeWidth="3" />
      </svg>
      <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-ink from-60% to-transparent" />
      <div className="absolute inset-y-[6.5%] left-[5.5%] flex w-[48%] flex-col gap-[3cqw]">
        <div className="flex items-center gap-[1.2cqw]">
          <img src="/mark.svg" alt="" className="h-[3.6cqw] w-[3.6cqw]" />
          <span className="font-display text-[2.2cqw] font-black uppercase">Viber Reborn</span>
          <span className="rounded-md bg-yes px-[1.2cqw] py-[0.5cqw] text-[1.5cqw] font-semibold text-ink">
            {p.side} · {p.odds}
          </span>
        </div>
        <p className="font-display text-[3.1cqw] font-bold leading-tight">{p.question}</p>
        <span className="self-start rounded-[1cqw] bg-flame px-[3cqw] py-[1.6cqw] font-display text-[8cqw] font-extrabold leading-none tracking-tighter text-ink">
          {p.profit}
        </span>
        <div className="flex flex-col gap-[1cqw] text-[2.2cqw]">
          <Row k="P&L" v={p.pnl} lime />
          <Row k="Called at" v={p.calledAt} />
          <Row k="Stake" v={p.stake} />
          <Row k="Payout" v={p.payout} />
        </div>
        <div className="mt-auto flex flex-col gap-[0.5cqw]">
          <span className="font-display text-[2.6cqw] font-bold">Call the next one.</span>
          <span className="font-mono text-[1.6cqw] text-[#A8988C]">viber-predict-reborn.vercel.app</span>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, lime }: { k: string; v: string; lime?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={lime ? "text-flame" : "text-[#A8988C]"}>{k}</span>
      <span className={`font-mono ${lime ? "text-flame" : ""}`}>{v}</span>
    </div>
  );
}
