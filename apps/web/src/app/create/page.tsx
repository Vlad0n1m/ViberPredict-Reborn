"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { createMarketIx, newMarketId } from "@reborn/sdk";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWalletModal } from "@/components/wallet";
import { useSendTx } from "@/lib/chain-client";
import { TAGS } from "@/lib/markets";

const durations: [string, number][] = [["1h", 3600], ["3h", 3 * 3600], ["1d", 86400], ["7d", 7 * 86400]];

export default function CreatePage() {
  const [q, setQ] = useState("");
  const [dur, setDur] = useState("3h");
  const [tag, setTag] = useState("Hackathon");
  const [src, setSrc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { publicKey } = useWallet();
  const { open: openWallet } = useWalletModal();
  const send = useSendTx();
  const router = useRouter();

  async function launch() {
    if (!publicKey) return openWallet();
    setBusy(true);
    setErr("");
    try {
      const secs = durations.find(([d]) => d === dur)![1];
      const { ix, market } = createMarketIx(publicKey, newMarketId(), Math.floor(Date.now() / 1000) + secs, q);
      await send([ix], { tag, source: src.trim() });
      router.push(`/market/${market.toBase58()}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4 sm:pt-8">
      <h1 className="font-display text-[40px] font-extrabold leading-none tracking-tighter sm:text-6xl">
        Ask the
        <br />
        crowd.
      </h1>

      <div className="flex flex-col gap-2 rounded-lg bg-card p-4">
        <label htmlFor="q" className="text-xs text-muted">
          Yes / No question
        </label>
        <textarea
          id="q"
          value={q}
          maxLength={200}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Will the judges regret the restart card?"
          rows={3}
          className="resize-none bg-transparent font-display text-[21px] font-bold leading-tight outline-none"
        />
        <span className="self-end font-mono text-[11px] text-muted">{q.length} / 200</span>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs text-muted">Betting closes in</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {durations.map(([d]) => (
            <button
              key={d}
              type="button"
              onClick={() => setDur(d)}
              aria-pressed={dur === d}
              className={`h-12 rounded-md text-sm ${dur === d ? "bg-flame font-semibold text-ink" : "bg-card"}`}
            >
              {d}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs text-muted">Category</legend>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              aria-pressed={tag === t}
              className={`h-10 rounded-md px-3.5 text-sm ${tag === t ? "bg-flame font-semibold text-ink" : "bg-card"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="src" className="text-xs text-muted">
          Resolution source
        </label>
        <input
          id="src"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          placeholder="Where the answer comes from, e.g. stage announcement"
          maxLength={200}
          className="h-[50px] rounded-md bg-card px-4 text-[15px] outline-none focus:ring-2 focus:ring-yes"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5 rounded-lg bg-yes-soft px-3.5 py-3 text-yes">
          <span className="text-[11px]">You earn</span>
          <span className="font-mono text-[15px] font-medium">1% of pool</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg bg-card px-3.5 py-3">
          <span className="text-[11px] text-muted">Costs</span>
          <span className="font-mono text-[15px] font-medium">≈0.003 SOL</span>
        </div>
      </div>

      <button
        type="button"
        disabled={q.trim().length < 10 || busy}
        onClick={launch}
        className="mt-2 h-[60px] rounded-md bg-flame text-[17px] font-semibold text-ink transition-transform duration-150 active:scale-[0.98] disabled:opacity-40"
      >
        {!publicKey ? "Connect wallet to launch" : busy ? "Approve in wallet, then sending…" : "Launch market on devnet"}
      </button>
      {err && <p className="rounded-md bg-no-soft px-4 py-3 text-sm text-no">{err}</p>}
      <p className="text-center text-xs text-muted">Devnet · you resolve it after it closes</p>
    </main>
  );
}
