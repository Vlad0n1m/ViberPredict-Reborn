"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { useWalletModal } from "@/components/wallet";

const durations = ["1h", "3h", "1d", "7d"];

export default function CreatePage() {
  const [q, setQ] = useState("Will any pitch tonight run over 2 minutes?");
  const [dur, setDur] = useState("3h");
  const [src, setSrc] = useState("");
  const [sent, setSent] = useState(false);
  const { publicKey } = useWallet();
  const { open: openWallet } = useWalletModal();

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
          rows={3}
          className="resize-none bg-transparent font-display text-[21px] font-bold leading-tight outline-none"
        />
        <span className="self-end font-mono text-[11px] text-muted">{q.length} / 200</span>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs text-muted">Betting closes in</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {durations.map((d) => (
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

      <div className="flex flex-col gap-2">
        <label htmlFor="src" className="text-xs text-muted">
          Resolution source
        </label>
        <input
          id="src"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          placeholder="https://"
          className="h-[50px] rounded-md bg-card px-4 text-[15px] outline-none focus:ring-2 focus:ring-yes"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5 rounded-lg bg-yes-soft px-3.5 py-3 text-[#17A877]">
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
        disabled={q.trim().length < 10}
        onClick={() => (publicKey ? setSent(true) : openWallet())}
        className="mt-2 h-[60px] rounded-md bg-flame text-[17px] font-semibold transition-transform duration-150 active:scale-[0.98] disabled:opacity-40"
      >
        {!publicKey ? "Connect wallet to launch" : sent ? "Approve in your wallet…" : "Launch market"}
      </button>
      <p className="text-center text-xs text-muted">Devnet · you resolve it after it closes</p>
    </main>
  );
}
