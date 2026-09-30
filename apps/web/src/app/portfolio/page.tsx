"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { claimIx } from "@reborn/sdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWalletModal } from "@/components/wallet";
import { usePositions, useSendTx, type PositionRow } from "@/lib/chain-client";
import { chance, closesIn, solscanAccount } from "@/lib/markets";

export default function PortfolioPage() {
  const { publicKey } = useWallet();
  const { open } = useWalletModal();
  const { positions } = usePositions(publicKey?.toBase58());

  if (!publicKey) {
    return (
      <Shell>
        <div className="flex flex-col gap-3 rounded-lg bg-card p-6">
          <p className="font-display text-xl font-bold">Connect a wallet to see your bets.</p>
          <button type="button" onClick={open} className="h-12 rounded-md bg-flame font-semibold text-ink">
            Connect wallet
          </button>
        </div>
      </Shell>
    );
  }
  if (!positions) return <Shell><div className="h-40 animate-pulse rounded-lg bg-card" /></Shell>;

  const claim = positions.filter((p) => p.claimable > 0);
  const live = positions.filter((p) => p.market.status !== "resolved" && p.claimable === 0);
  const done = positions.filter((p) => p.market.status === "resolved" && p.claimable === 0);
  const atStake = live.reduce((s, p) => s + p.yes + p.no, 0);

  return (
    <Shell>
      <a href={solscanAccount(publicKey.toBase58())} target="_blank" rel="noreferrer" className="-mt-1 mb-1 font-mono text-xs text-flame">
        your wallet on Solscan ↗
      </a>
      {positions.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-card p-6">
          <p className="font-display text-xl font-bold">No bets yet.</p>
          <Link href="/" className="rounded-md bg-flame px-4 py-2 text-sm font-semibold text-ink">
            Find a market
          </Link>
        </div>
      )}
      {claim.map((p) => <ClaimCard key={p.position} p={p} />)}
      {live.length > 0 && <p className="mx-1 mt-2 text-xs text-muted">Open · {atStake.toFixed(3)} SOL at stake</p>}
      {live.map((p) => <Row key={p.position} p={p} />)}
      {done.length > 0 && <p className="mx-1 mt-2 text-xs text-muted">Settled</p>}
      {done.map((p) => <Row key={p.position} p={p} />)}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-2.5 px-4 pt-4 sm:pt-8">
      <h1 className="mb-2 font-display text-[40px] font-extrabold leading-none tracking-tighter sm:text-6xl">Your bets</h1>
      {children}
    </main>
  );
}

function ClaimCard({ p }: { p: PositionRow }) {
  const { publicKey } = useWallet();
  const send = useSendTx();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const stake = p.yes + p.no;
  const refund = p.market.outcome === "void";

  async function claim() {
    setBusy(true);
    setErr("");
    try {
      const sig = await send([claimIx(publicKey!, new PublicKey(p.marketId), new PublicKey(p.market.creator))]);
      const side = p.market.outcome === "no" ? "no" : "yes";
      const qs = new URLSearchParams({ m: p.marketId, q: p.market.question, side, stake: String(stake), payout: String(p.claimable), sig });
      router.push(refund ? "/portfolio" : `/win?${qs}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-lg bg-flame p-5 text-ink">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold">{refund ? "Refund" : "You won"}</span>
          <span className="font-display text-[40px] font-extrabold leading-none tracking-tighter">{p.claimable.toFixed(3)} SOL</span>
        </div>
        {!refund && stake > 0 && <span className="rounded-lg bg-ink px-2 py-1 font-mono text-xs text-flame">{(p.claimable / stake).toFixed(2)}×</span>}
      </div>
      <p className="text-[13px]">{p.market.question}</p>
      <button type="button" disabled={busy} onClick={claim} className="flex h-[52px] items-center justify-center rounded-md bg-ink text-base font-semibold text-white disabled:opacity-60">
        {busy ? "Approve in wallet…" : "Claim to wallet"}
      </button>
      {err && <p className="text-xs font-semibold">{err}</p>}
    </div>
  );
}

function Row({ p }: { p: PositionRow }) {
  const m = p.market;
  const side = p.yes >= p.no ? "yes" : "no";
  const yes = side === "yes";
  const stake = p.yes + p.no;
  const c = chance(m);
  const state =
    m.status === "resolved"
      ? p.claimed
        ? "claimed"
        : m.outcome === side
          ? "won"
          : "lost"
      : m.status === "awaiting"
        ? "awaiting result"
        : closesIn(m.endTs);
  return (
    <Link href={`/market/${m.id}`} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3.5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${yes ? "bg-yes-soft text-yes" : "bg-no-soft text-no"}`}>
        {p.yes > 0 && p.no > 0 ? "BOTH" : yes ? "YES" : "NO"}
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium leading-tight">{m.question}</span>
        <span className="font-mono text-[11px] text-muted">
          {stake.toFixed(3)} SOL · now {yes ? c : 100 - c}% · {state}
        </span>
      </span>
    </Link>
  );
}
