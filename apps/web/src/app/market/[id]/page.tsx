"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { ADMIN, resolveIx, voidIx } from "@reborn/sdk";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BetPanel } from "@/components/bet-panel";
import { Sparkline } from "@/components/market";
import { useMarket, useSendTx } from "@/lib/chain-client";
import { chance, shortAddr, sol, solscanAccount, solscanTx, total, type Market, type MarketEvent, type Side } from "@/lib/markets";

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const { market: m, events, error } = useMarket(id);

  if (!m) {
    return (
      <main className="mx-auto flex w-full max-w-[1344px] flex-col gap-4 px-4 pt-6 sm:px-8 lg:px-12">
        <Link href="/" className="text-sm text-muted hover:text-fg">← All markets</Link>
        {error ? (
          <p className="rounded-lg bg-card p-6 text-muted">Market not found on devnet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="h-14 w-3/4 animate-pulse rounded-md bg-card" />
            <div className="h-64 animate-pulse rounded-lg bg-card" />
          </div>
        )}
      </main>
    );
  }

  const c = chance(m);

  return (
    <main className="mx-auto grid w-full max-w-[1344px] gap-5 px-4 pt-2 sm:px-8 lg:grid-cols-[1fr_400px] lg:gap-6 lg:px-12">
      <div className="flex flex-col gap-5">
        <Link href="/" className="text-sm text-muted hover:text-fg">
          ← All markets
        </Link>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-md bg-card px-2.5 py-1.5">{m.tag}</span>
          <span className="rounded-md bg-card px-2.5 py-1.5 font-mono">
            {m.status === "active" ? `closes in ${m.closesIn}` : m.status === "awaiting" ? "betting closed · awaiting result" : `resolved ${m.outcome?.toUpperCase()}`}
          </span>
          <a href={solscanAccount(m.creator)} target="_blank" rel="noreferrer" className="rounded-md bg-card px-2.5 py-1.5 font-mono hover:text-flame">
            by {shortAddr(m.creator)}
          </a>
          <a href={solscanAccount(m.id)} target="_blank" rel="noreferrer" className="rounded-md bg-card px-2.5 py-1.5 font-mono text-flame">
            market on Solscan ↗
          </a>
        </div>
        <h1 className="max-w-[860px] font-display text-[30px] font-extrabold leading-[1.02] tracking-tight sm:text-[50px]">{m.question}</h1>

        <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-6xl font-extrabold leading-[0.9] tracking-tighter text-yes sm:text-[88px]">{c}%</span>
              <span className="text-muted">chance of Yes</span>
            </div>
            <div className="flex gap-7 text-[13px] text-muted">
              <div className="flex flex-col gap-0.5">
                Pool<span className="font-mono text-lg text-fg">{sol(total(m), 3)} SOL</span>
              </div>
              <div className="flex flex-col gap-0.5">
                Bettors<span className="font-mono text-lg text-fg">{m.bettors}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                Fee<span className="font-mono text-lg text-fg">2%</span>
              </div>
            </div>
          </div>
          <div className="flex h-3.5 overflow-hidden rounded-md bg-no">
            <div className="anim-grow border-r-[3px] border-card bg-yes transition-[width] duration-500" style={{ width: `${c}%` }} />
          </div>
          <div className="flex justify-between font-mono text-[13px]">
            <span className="text-yes">Yes · {sol(m.yesPool, 3)} SOL</span>
            <span className="text-no">No · {sol(m.noPool, 3)} SOL</span>
          </div>
          {m.history && m.history.length > 2 && (
            <div className="rounded-md bg-ink p-3">
              <Sparkline key={m.history.length} points={m.history} className="h-32 w-full" />
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-2.5 rounded-lg bg-card p-5">
            <h2 className="text-[15px] font-semibold">How it resolves</h2>
            <p className="text-sm leading-relaxed text-muted">
              The creator resolves after close; the admin steps in if the creator is silent. Winners split the whole pool minus 2%. Nobody on the winning side → full refund.
            </p>
            {m.source && <p className="text-sm text-yes">Source: {m.source}</p>}
          </div>
          <ResolvePanel m={m} />
        </div>

        <Activity events={events} />
      </div>
      <div className="lg:pt-10">
        <BetPanel m={m} />
      </div>
    </main>
  );
}

function ResolvePanel({ m }: { m: Market }) {
  const { publicKey } = useWallet();
  const send = useSendTx();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);
  const me = publicKey?.toBase58();
  const isAdmin = me === ADMIN.toBase58();
  const isCreator = me === m.creator;
  if (m.status === "resolved" || (!isAdmin && !isCreator)) return null;
  const canResolve = isAdmin || m.status === "awaiting";

  async function act(key: string, ix: () => ReturnType<typeof voidIx>) {
    setBusy(key);
    setNote(null);
    try {
      const sig = await send([ix()]);
      setNote({ ok: true, text: key === "void" ? "Voided — refunds open." : `Resolved ${key.toUpperCase()}.`, sig });
    } catch (e) {
      setNote({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const key = new PublicKey(m.id);
  return (
    <div className="flex flex-col gap-3.5 rounded-lg bg-ink p-5 text-white">
      <div className="text-[13px] font-semibold text-flame">{isAdmin ? "Admin controls" : "Your market"}</div>
      <p className="text-sm leading-relaxed text-[#A8988C]">
        {canResolve ? "Pick the real-world outcome. One transaction, winners can claim right after." : `You can resolve once betting closes (${m.closesIn}).`}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(["yes", "no"] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            disabled={!canResolve || !!busy}
            onClick={() => act(s, () => resolveIx(publicKey!, key, s))}
            className={`h-11 rounded-md text-sm font-semibold text-ink disabled:opacity-40 ${s === "yes" ? "bg-yes" : "bg-no"}`}
          >
            {busy === s ? "…" : s.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          disabled={!isAdmin || !!busy}
          onClick={() => act("void", () => voidIx(publicKey!, key))}
          className="h-11 rounded-md border border-[#3A2C26] text-sm disabled:opacity-40"
        >
          {busy === "void" ? "…" : "Void"}
        </button>
      </div>
      {note && (
        <p className={`text-xs ${note.ok ? "text-yes" : "text-no"}`}>
          {note.text}{" "}
          {note.sig && (
            <a href={solscanTx(note.sig)} target="_blank" rel="noreferrer" className="text-flame underline">
              Solscan ↗
            </a>
          )}
        </p>
      )}
    </div>
  );
}

function ago(t: string | null) {
  if (!t) return "";
  const s = Math.max(1, Math.floor((Date.now() - new Date(t).getTime()) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
}

function Activity({ events }: { events: MarketEvent[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold tracking-tight">Live activity</h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">on-chain · devnet</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted">No bets yet. Be the first.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {events.slice(0, 20).map((e) => (
            <li key={e.signature + e.kind} className="flex items-center gap-3 py-2.5 text-sm">
              <span
                className={`w-14 shrink-0 rounded-md px-2 py-1 text-center font-mono text-[11px] font-bold uppercase ${
                  e.kind === "bet" ? (e.side === "yes" ? "bg-yes-soft text-yes" : "bg-no-soft text-no") : "bg-paper text-muted"
                }`}
              >
                {e.kind === "bet" ? e.side : e.kind}
              </span>
              <a href={solscanAccount(e.wallet)} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted hover:text-fg">
                {shortAddr(e.wallet)}
              </a>
              <span className="flex-1 font-mono text-xs">{e.kind === "bet" ? `${e.sol.toFixed(3)} SOL` : ""}</span>
              <span className="font-mono text-[11px] text-muted">{ago(e.block_time)}</span>
              <a href={solscanTx(e.signature)} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-flame hover:underline">
                tx ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
