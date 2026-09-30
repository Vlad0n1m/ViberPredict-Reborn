"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { useWalletModal } from "./wallet";
import { MAX_BET, multiplier, payoutFor, type Market, type Side } from "@/lib/markets";

export function BetPanel({ m }: { m: Market }) {
  const [side, setSide] = useState<Side>("yes");
  const [amount, setAmount] = useState("0.50");
  const [sent, setSent] = useState(false);
  const { publicKey } = useWallet();
  const { open: openWallet } = useWalletModal();

  const stake = Math.min(Math.max(Number.parseFloat(amount) || 0, 0), MAX_BET);
  const payout = payoutFor(m, side, stake);
  const over = (Number.parseFloat(amount) || 0) > MAX_BET;
  const open = m.status === "active";

  return (
    <aside className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6 lg:sticky lg:top-24">
      <h2 className="font-display text-[22px] font-bold tracking-tight">Place a bet</h2>
      <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-paper p-1.5">
        {(["yes", "no"] as const).map((s) => {
          const active = side === s;
          const on = s === "yes" ? "bg-yes text-ink" : "bg-no text-ink";
          const off = s === "yes" ? "text-[#17A877]" : "text-[#FF8A9C]";
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={active}
              className={`h-14 rounded-md text-base font-semibold transition-colors duration-150 ${active ? on : off}`}
            >
              {s === "yes" ? "Yes" : "No"} · {multiplier(m, s).toFixed(2)}×
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="amount" className="text-[13px] text-muted">
          Amount
        </label>
        <div className={`flex h-16 items-center gap-2 rounded-lg border-2 px-4 ${over ? "border-no" : "border-fg"}`}>
          <input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            className="w-full min-w-0 bg-transparent font-mono text-[28px] outline-none"
          />
          <span className="text-[15px] text-muted">SOL</span>
        </div>
        {over && <p className="text-xs text-[#FF8A9C]">Max {MAX_BET} SOL per bet on this build.</p>}
        <div className="grid grid-cols-3 gap-2 font-mono text-[13px]">
          {["0.1", "0.5", "1"].map((v) => {
            const active = Number.parseFloat(amount) === Number.parseFloat(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(Number.parseFloat(v).toFixed(2))}
                className={`h-10 rounded-md ${active ? "bg-flame text-ink" : "bg-paper"}`}
              >
                {v === "1" ? "1 max" : v}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">You get if {side === "yes" ? "Yes" : "No"}</span>
          <span className="font-mono font-medium">{payout.toFixed(2)} SOL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Network</span>
          <span className="font-medium text-[#FFC53D]">Devnet · test SOL</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!open || stake <= 0}
        onClick={() => (publicKey ? setSent(true) : openWallet())}
        className="h-[60px] rounded-md bg-flame text-[17px] font-semibold text-ink transition-transform duration-150 active:scale-[0.98] disabled:opacity-40"
      >
        {!open ? "Betting closed" : !publicKey ? "Connect wallet to bet" : sent ? "Approve in your wallet…" : `Bet ${stake.toFixed(2)} SOL on ${side === "yes" ? "Yes" : "No"}`}
      </button>
      <p className="text-center text-xs text-muted">Payout moves as others bet · max {MAX_BET} SOL per bet</p>
    </aside>
  );
}
