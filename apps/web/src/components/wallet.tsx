"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Phantom, Solflare, Backpack register themselves via Wallet Standard.
// On Android (Seeker) WalletProvider adds Mobile Wallet Adapter → Seed Vault Wallet automatically.

const ModalCtx = createContext<{ open: () => void }>({ open: () => {} });

export function useWalletModal() {
  return useContext(ModalCtx);
}

export function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function WalletProviders({ children }: { children: ReactNode }) {
  const [endpoint, setEndpoint] = useState("https://api.devnet.solana.com");
  useEffect(() => setEndpoint(`${window.location.origin}/api/rpc`), []);
  const onError = useCallback((e: Error) => console.warn("[wallet]", e.message), []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect onError={onError}>
        <WalletModal>{children}</WalletModal>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function useBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) return setBalance(null);
    try {
      setBalance((await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL);
    } catch {
      /* RPC hiccup — keep the last value */
    }
  }, [connection, publicKey]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  return { balance, refresh };
}

function WalletModal({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const { wallets, select, connecting, connected } = useWallet();
  const ctx = useMemo(() => ({ open: () => setOpen(true) }), []);

  useEffect(() => {
    if (connected) setOpen(false);
  }, [connected]);

  const list = [...wallets].sort((a, b) => rank(a.readyState) - rank(b.readyState));

  return (
    <ModalCtx.Provider value={ctx}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Connect a wallet"
            onClick={(e) => e.stopPropagation()}
            className="anim-rise flex w-full max-w-md flex-col gap-3 rounded-t-[30px] bg-card p-5 pb-8 sm:rounded-lg sm:pb-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">Connect wallet</h2>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-md bg-paper">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-muted">Devnet only — use test SOL.</p>
            {list.length === 0 && (
              <a href="https://phantom.app/download" target="_blank" rel="noreferrer" className="rounded-md bg-paper px-4 py-4 text-sm font-medium">
                No wallet found. Install Phantom →
              </a>
            )}
            {list.map((w) => {
              const ready = w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable;
              return (
                <button
                  key={w.adapter.name}
                  type="button"
                  disabled={connecting}
                  onClick={() => {
                    if (!ready && w.adapter.url) return window.open(w.adapter.url, "_blank");
                    select(w.adapter.name);
                  }}
                  className="flex h-16 items-center gap-3 rounded-md bg-paper px-4 text-left transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.adapter.icon} alt="" width={32} height={32} className="rounded-lg" />
                  <span className="flex-1 font-semibold">{label(w.adapter.name)}</span>
                  <span className={`text-xs ${ready ? "text-[#3BE3A5]" : "text-muted"}`}>
                    {connecting ? "Connecting…" : ready ? (w.readyState === WalletReadyState.Installed ? "Detected" : "Tap to open") : "Install"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </ModalCtx.Provider>
  );
}

function rank(s: WalletReadyState) {
  return s === WalletReadyState.Installed ? 0 : s === WalletReadyState.Loadable ? 1 : 2;
}

function label(name: string) {
  return name === "Mobile Wallet Adapter" ? "Seed Vault / mobile wallet" : name;
}

/** Header pill: Connect button, or address + live balance. */
export function WalletButton() {
  const { publicKey } = useWallet();
  const { open } = useWalletModal();
  const { balance } = useBalance();

  if (!publicKey) {
    return (
      <button type="button" onClick={open} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.97]">
        Connect
      </button>
    );
  }
  return (
    <a href="/settings" className="flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-xs text-white sm:px-4 sm:text-sm">
      <span className="live-dot h-1.5 w-1.5 bg-flame" />
      <span className="hidden sm:inline">{short(publicKey.toBase58())} · </span>
      {balance === null ? "…" : balance.toFixed(2)} SOL
    </a>
  );
}
