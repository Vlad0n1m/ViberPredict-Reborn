"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShareCard } from "@/components/share-card";
import { getMarket, positions, wallet } from "@/lib/markets";

export default function WinPage() {
  const [note, setNote] = useState("");
  const [shown, setShown] = useState(0);
  const pos = positions.find((p) => p.claimable)!;
  const m = getMarket(pos.marketId)!;
  const payout = pos.claimable!;
  const profit = payout - pos.stake;
  const pnl = Math.round((profit / pos.stake) * 100);
  const odds = payout / pos.stake;
  const calledAt = Math.round((0.98 / odds) * 100);

  // Count the win up once on arrival.
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setShown(profit * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [profit]);

  const url = typeof window !== "undefined" ? `${window.location.origin}/market/${m.id}` : "";
  const text = `I called it on Viber Predict: +${profit.toFixed(2)} SOL (+${pnl}%) on "${m.question}"`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Viber Predict", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setNote("Copied — paste it anywhere.");
    } catch {
      /* user closed the share sheet */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied.");
    } catch {
      setNote(url);
    }
  }

  return (
    <main className="relative -mb-24 flex flex-1 flex-col overflow-hidden bg-ink pb-24 text-white md:mb-0 md:pb-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] overflow-hidden" aria-hidden>
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="anim-confetti absolute top-0 block rounded-[2px]"
            style={{ left: `${c.x}%`, width: c.w, height: c.w * 2, background: c.color, animationDelay: `${c.d}ms` }}
          />
        ))}
      </div>
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pt-8 md:flex-row md:items-center md:gap-12 md:pt-16">
        <div className="flex flex-col gap-2.5 md:w-[380px] md:shrink-0">
          <span className="text-sm text-[#a9a69e]">Claimed to {wallet.short}</span>
          <h1 className="font-display text-[46px] font-extrabold leading-[0.95] tracking-tighter md:text-6xl">You called it.</h1>
          <span className="font-display text-[64px] font-extrabold leading-none tracking-tighter text-lime tabular-nums">+{shown.toFixed(2)} SOL</span>
          <span className="font-mono text-sm text-lime">
            +{pnl}% · you were in the {calledAt}%
          </span>
          <div className="mt-6 hidden flex-col gap-2.5 md:flex">
            <Actions onShare={share} onCopy={copyLink} />
          </div>
        </div>
        <div className="flex-1">
          <ShareCard
            question={m.question}
            side={pos.side === "yes" ? "Yes" : "No"}
            odds={`${odds.toFixed(2)}×`}
            profit={`+${profit.toFixed(2)} SOL`}
            pnl={`+${pnl}%`}
            calledAt={`${calledAt}% chance`}
            stake={`${pos.stake.toFixed(2)} SOL`}
            payout={`${payout.toFixed(2)} SOL`}
          />
        </div>
        <div className="flex flex-col gap-2.5 md:hidden">
          <Actions onShare={share} onCopy={copyLink} />
        </div>
      </div>
      {note && <p className="relative mt-3 text-center text-sm text-lime">{note}</p>}
    </main>
  );
}

function Actions({ onShare, onCopy }: { onShare: () => void; onCopy: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onShare}
        className="flex h-[60px] items-center justify-center gap-2.5 rounded-full bg-lime text-[17px] font-semibold text-ink transition-transform duration-150 active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15161A" strokeWidth="2.2" aria-hidden>
          <path d="M12 3v13M6 9l6-6 6 6M5 21h14" />
        </svg>
        Share win
      </button>
      <button type="button" onClick={onCopy} className="h-12 rounded-full border border-[#3a3b40] text-sm">
        Copy market link
      </button>
      <Link href="/" className="py-2 text-center text-sm text-[#a9a69e]">
        Find the next market
      </Link>
    </>
  );
}

const CONFETTI = [
  { x: 6, w: 8, color: "#D7FF3D", d: 0 },
  { x: 14, w: 6, color: "#FF5A1F", d: 180 },
  { x: 23, w: 8, color: "#2459FF", d: 90 },
  { x: 34, w: 5, color: "#D7FF3D", d: 320 },
  { x: 46, w: 7, color: "#FF5A1F", d: 40 },
  { x: 57, w: 6, color: "#2459FF", d: 260 },
  { x: 66, w: 8, color: "#D7FF3D", d: 140 },
  { x: 75, w: 5, color: "#FF5A1F", d: 380 },
  { x: 84, w: 7, color: "#2459FF", d: 60 },
  { x: 93, w: 6, color: "#D7FF3D", d: 220 },
];
