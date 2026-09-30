"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";
import { useState } from "react";
import { short, useBalance, useWalletModal } from "@/components/wallet";

export default function SettingsPage() {
  const [note, setNote] = useState("");
  const [dropping, setDropping] = useState(false);
  const { publicKey, wallet, disconnect } = useWallet();
  const { open } = useWalletModal();
  const { balance, refresh } = useBalance();
  const addr = publicKey?.toBase58();

  async function airdrop() {
    if (!publicKey) return open();
    setDropping(true);
    setNote("");
    try {
      // Public devnet faucet endpoint; our RPC proxy does not allow airdrops.
      const conn = new Connection("https://api.devnet.solana.com", "confirmed");
      const sig = await conn.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, "confirmed");
      setNote("+1 test SOL landed.");
      refresh();
    } catch {
      setNote("Faucet is rate-limited right now — try faucet.solana.com.");
    } finally {
      setDropping(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pt-4 sm:pt-8">
      <h1 className="mb-2 font-display text-3xl font-bold leading-none tracking-tight sm:text-4xl">Settings</h1>

      <div className="flex flex-col gap-3.5 rounded-lg bg-ink p-5 text-white">
        {addr ? (
          <>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {wallet && <img src={wallet.adapter.icon} alt="" width={44} height={44} className="rounded-full bg-white p-1.5" />}
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-xs text-[#8A847D]">
                  <span className="live-dot h-1.5 w-1.5 bg-flame" />
                  {wallet?.adapter.name === "Mobile Wallet Adapter" ? "Seed Vault / mobile wallet" : wallet?.adapter.name}
                </span>
                <span className="font-mono text-[15px]">{short(addr)}</span>
              </div>
              <span className="font-mono text-[15px] tabular-nums">{balance === null ? "…" : balance.toFixed(2)} SOL</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(addr).catch(() => {});
                  setNote("Address copied.");
                }}
                className="h-11 rounded-md border border-[#2F2B28] text-sm"
              >
                Copy address
              </button>
              <button type="button" onClick={() => disconnect()} className="h-11 rounded-md border border-[#2F2B28] text-sm text-no">
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-display text-2xl font-bold">No wallet connected</p>
            <p className="text-sm text-[#8A847D]">Phantom on desktop, Seed Vault or Phantom on Seeker.</p>
            <button type="button" onClick={open} className="h-12 rounded-md bg-flame text-[15px] font-semibold text-ink">
              Connect wallet
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-card p-5">
        <span className="text-[13px] font-semibold">Network</span>
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="live-dot h-2 w-2 bg-devnet" />
          Solana Devnet
        </div>
        <span className="text-xs leading-relaxed text-muted">
          This build runs on devnet only. Switch your wallet to Devnet too (Phantom: Settings → Developer settings → Testnet mode).
        </span>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-card py-4 pl-5 pr-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold">Devnet faucet</span>
          <span className="text-xs text-muted">1 test SOL, free</span>
        </div>
        <button
          type="button"
          onClick={airdrop}
          disabled={dropping}
          className="flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold disabled:opacity-60"
        >
          {dropping && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          Airdrop
        </button>
      </div>

      <Link href="/admin" className="flex items-center justify-between rounded-lg bg-card px-5 py-4 text-[15px] font-semibold">
        Admin panel
        <span className="text-xs font-normal text-muted">admin wallet only →</span>
      </Link>

      {note && <p className="text-center text-sm text-muted">{note}</p>}
      <p className="mt-6 px-1 font-mono text-[11px] text-muted">program HqSA…Jqa · devnet · v0.1</p>
    </main>
  );
}
