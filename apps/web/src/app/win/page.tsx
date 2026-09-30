"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ShareCard } from "@/components/share-card";
import { shortAddr, solscanTx } from "@/lib/markets";

export default function WinPage() {
  return (
    <Suspense>
      <Win />
    </Suspense>
  );
}

function Win() {
  const [note, setNote] = useState("");
  const [shown, setShown] = useState(0);
  const qs = useSearchParams();
  const { publicKey } = useWallet();
  const m = { id: qs.get("m") ?? "", question: qs.get("q") ?? "Your market" };
  const pos = { side: qs.get("side") === "no" ? "no" : "yes", stake: Number(qs.get("stake")) || 0.01 };
  const sig = qs.get("sig");
  const payout = Number(qs.get("payout")) || pos.stake;
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
  const text = `I called it on Viber Reborn: +${profit.toFixed(2)} SOL (+${pnl}%) on "${m.question}"`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Viber Reborn", text, url });
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
          <span className="text-sm text-[#A8988C]">
            Claimed to {publicKey ? shortAddr(publicKey.toBase58()) : "your wallet"}
            {sig && (
              <a href={solscanTx(sig)} target="_blank" rel="noreferrer" className="ml-2 text-flame underline">
                Solscan ↗
              </a>
            )}
          </span>
          <h1 className="font-display text-[46px] font-extrabold leading-[0.95] tracking-tighter md:text-6xl">You called it.</h1>
          <span className="font-display text-[64px] font-extrabold leading-none tracking-tighter text-flame tabular-nums">+{shown.toFixed(3)} SOL</span>
          <span className="font-mono text-sm text-flame">
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
            profit={`+${profit.toFixed(3)} SOL`}
            pnl={`+${pnl}%`}
            calledAt={`${calledAt}% chance`}
            stake={`${pos.stake.toFixed(3)} SOL`}
            payout={`${payout.toFixed(3)} SOL`}
          />
        </div>
        <div className="flex flex-col gap-2.5 md:hidden">
          <Actions onShare={share} onCopy={copyLink} />
        </div>
      </div>
      {note && <p className="relative mt-3 text-center text-sm text-flame">{note}</p>}
    </main>
  );
}

function Actions({ onShare, onCopy }: { onShare: () => void; onCopy: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onShare}
        className="flex h-[60px] items-center justify-center gap-2.5 rounded-md bg-flame text-[17px] font-semibold text-ink transition-transform duration-150 active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C0A09" strokeWidth="2.2" aria-hidden>
          <path d="M12 3v13M6 9l6-6 6 6M5 21h14" />
        </svg>
        Share win
      </button>
      <button type="button" onClick={onCopy} className="h-12 rounded-md border border-[#3A2C26] text-sm">
        Copy market link
      </button>
      <Link href="/" className="py-2 text-center text-sm text-[#A8988C]">
        Find the next market
      </Link>
    </>
  );
}

const CONFETTI = [
  { x: 6, w: 8, color: "#FFB02E", d: 0 },
  { x: 14, w: 6, color: "#FF4D6A", d: 180 },
  { x: 23, w: 8, color: "#22D39A", d: 90 },
  { x: 34, w: 5, color: "#FFB02E", d: 320 },
  { x: 46, w: 7, color: "#FF4D6A", d: 40 },
  { x: 57, w: 6, color: "#22D39A", d: 260 },
  { x: 66, w: 8, color: "#FFB02E", d: 140 },
  { x: 75, w: 5, color: "#FF4D6A", d: 380 },
  { x: 84, w: 7, color: "#22D39A", d: 60 },
  { x: 93, w: 6, color: "#FFB02E", d: 220 },
];
