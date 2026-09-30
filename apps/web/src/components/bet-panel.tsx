"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { placeBetIx } from "@reborn/sdk";
import { useState } from "react";
import { useBalance, useWalletModal } from "./wallet";
import { useSendTx } from "@/lib/chain-client";
import { MAX_BET, MIN_BET, multiplier, payoutFor, solscanTx, type Market, type Side } from "@/lib/markets";

type Status = { kind: "idle" } | { kind: "signing" } | { kind: "ok"; sig: string; text: string } | { kind: "err"; text: string };

export function BetPanel({ m }: { m: Market }) {
  const [side, setSide] = useState<Side>("yes");
  const [amount, setAmount] = useState("0.05");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { publicKey } = useWallet();
  const { open: openWallet } = useWalletModal();
  const { balance } = useBalance();
  const send = useSendTx();

  const raw = Number.parseFloat(amount) || 0;
  const stake = Math.min(Math.max(raw, 0), MAX_BET);
  const payout = payoutFor(m, side, stake);
  const bad = raw > MAX_BET || (raw > 0 && raw < MIN_BET);
  const open = m.status === "active";
  const broke = balance !== null && stake + 0.003 > balance;

  async function bet() {
    if (!publicKey) return openWallet();
    setStatus({ kind: "signing" });
    try {
      const sig = await send([placeBetIx(publicKey, new PublicKey(m.id), side, Math.round(stake * LAMPORTS_PER_SOL))]);
      setStatus({ kind: "ok", sig, text: `${stake} SOL on ${side === "yes" ? "Yes" : "No"} is in the pool.` });
    } catch (e) {
      setStatus({ kind: "err", text: (e as Error).message });
    }
  }

  return (
    <aside className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-6 lg:sticky lg:top-24">
      <h2 className="font-display text-[22px] font-bold tracking-tight">Place a bet</h2>
      <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-paper p-1.5">
        {(["yes", "no"] as const).map((s) => {
          const active = side === s;
          const on = s === "yes" ? "bg-yes text-ink" : "bg-no text-ink";
          const off = s === "yes" ? "text-yes" : "text-no";
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={active}
              className={`h-14 rounded-md text-base font-semibold transition-colors duration-150 ${active ? on : off}`}
            >
              {s === "yes" ? "Yes" : "No"} · {multiplier(m, s) ? `${multiplier(m, s).toFixed(2)}×` : "—"}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[13px] text-muted">
          <label htmlFor="amount">Amount</label>
          {publicKey && <span className="font-mono">balance {balance === null ? "…" : balance.toFixed(3)} SOL</span>}
        </div>
        <div className={`flex h-16 items-center gap-2 rounded-lg border-2 px-4 ${bad ? "border-no" : "border-fg"}`}>
          <input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            className="w-full min-w-0 bg-transparent font-mono text-[28px] outline-none"
          />
          <span className="text-[15px] text-muted">SOL</span>
        </div>
        {bad && <p className="text-xs text-no">Bet between {MIN_BET} and {MAX_BET} SOL.</p>}
        <div className="grid grid-cols-4 gap-2 font-mono text-[13px]">
          {["0.01", "0.05", "0.1", "0.5"].map((v) => {
            const active = raw === Number.parseFloat(v);
            return (
              <button key={v} type="button" onClick={() => setAmount(v)} className={`h-10 rounded-md ${active ? "bg-flame text-ink" : "bg-paper"}`}>
                {v}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">You get if {side === "yes" ? "Yes" : "No"}</span>
          <span className="font-mono font-medium">{payout.toFixed(3)} SOL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Network</span>
          <span className="font-medium text-devnet">Devnet · real test SOL</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!open || stake <= 0 || bad || status.kind === "signing"}
        onClick={bet}
        className="flex h-[60px] items-center justify-center gap-2 rounded-md bg-flame text-[17px] font-semibold text-ink transition-transform duration-150 active:scale-[0.98] disabled:opacity-40"
      >
        {status.kind === "signing" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />}
        {!open
          ? "Betting closed"
          : !publicKey
            ? "Connect wallet to bet"
            : status.kind === "signing"
              ? "Approve in wallet, then sending…"
              : `Bet ${stake} SOL on ${side === "yes" ? "Yes" : "No"}`}
      </button>

      {status.kind === "ok" && (
        <div className="anim-rise flex flex-col gap-1 rounded-md bg-yes-soft px-4 py-3 text-sm">
          <span className="font-semibold text-yes">✓ Confirmed on devnet</span>
          <span className="text-[#CFC2B6]">{status.text}</span>
          <a href={solscanTx(status.sig)} target="_blank" rel="noreferrer" className="font-mono text-xs text-flame underline underline-offset-2">
            View on Solscan → {status.sig.slice(0, 10)}…
          </a>
        </div>
      )}
      {status.kind === "err" && <p className="anim-rise rounded-md bg-no-soft px-4 py-3 text-sm text-no">{status.text}</p>}
      {publicKey && broke && status.kind !== "ok" && (
        <a href="/settings" className="text-center text-xs text-devnet underline underline-offset-2">
          Low on devnet SOL? Grab some in Settings →
        </a>
      )}
      <p className="text-center text-xs text-muted">Payout moves as others bet · {MIN_BET}–{MAX_BET} SOL per bet</p>
    </aside>
  );
}
