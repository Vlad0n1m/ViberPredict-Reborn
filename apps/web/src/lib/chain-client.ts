"use client";

// Client data + transaction layer: reads come from our API (cached chain state), writes are signed by the
// connected wallet and sent through our devnet RPC proxy, then indexed so the feed updates.
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, type Connection, type TransactionInstruction } from "@solana/web3.js";
import { explainError, priorityIxs } from "@reborn/sdk";
import { useCallback, useEffect, useState } from "react";
import { fromApi, historyFrom, type ApiMarket, type Market, type MarketEvent } from "./markets";

export const TX_EVENT = "reborn:tx";

function usePoll<T>(url: string | null, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!url) return;
    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      setData(j);
      setError(null);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, [url]);
  useEffect(() => {
    setData(null);
    load();
    if (!url) return;
    const id = setInterval(load, ms);
    window.addEventListener(TX_EVENT, load);
    return () => {
      clearInterval(id);
      window.removeEventListener(TX_EVENT, load);
    };
  }, [load, ms, url]);
  return { data, error, reload: load };
}

/** All live markets (void ones hidden). */
export function useMarkets() {
  const { data, error } = usePoll<{ markets: ApiMarket[] }>("/api/markets", 5000);
  const markets = data?.markets.filter((m) => m.outcome !== "void").map((m) => fromApi(m));
  return { markets, error };
}

/** One market, fresh from chain, with its indexed activity. */
export function useMarket(id: string | undefined) {
  const { data, error } = usePoll<{ market: ApiMarket; events: MarketEvent[] }>(id ? `/api/markets/${id}` : null, 4000);
  const market: Market | undefined = data ? fromApi(data.market, historyFrom(data.events)) : undefined;
  return { market, events: data?.events ?? [], error };
}

export type PositionRow = {
  position: string;
  marketId: string;
  market: ApiMarket;
  yes: number;
  no: number;
  claimed: boolean;
  claimable: number;
};

export function usePositions(owner: string | undefined) {
  const { data, error } = usePoll<{ positions: PositionRow[] }>(owner ? `/api/positions?owner=${owner}` : null, 8000);
  return { positions: data?.positions, error };
}

/** Sign with the connected wallet, send via our devnet RPC, confirm, index. Returns the signature. */
export function useSendTx() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction } = useWallet();

  return useCallback(
    async (ixs: TransactionInstruction[], meta?: { tag?: string; source?: string }) => {
      if (!publicKey) throw new Error("Connect a wallet first");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight }).add(...priorityIxs(), ...ixs);
      let signature: string;
      try {
        // Sign in the wallet but send through our devnet RPC, so a wallet left on mainnet can't misroute it.
        if (signTransaction) {
          const signed = await signTransaction(tx);
          signature = await connection.sendRawTransaction(signed.serialize(), { preflightCommitment: "confirmed" });
        } else {
          signature = await sendTransaction(tx, connection, { preflightCommitment: "confirmed" });
        }
        await confirm(connection, signature, lastValidBlockHeight);
      } catch (e) {
        throw new Error(friendly(e));
      }
      await fetch("/api/index", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature, ...meta }),
      }).catch(() => {});
      window.dispatchEvent(new Event(TX_EVENT));
      return signature;
    },
    [connection, publicKey, sendTransaction, signTransaction],
  );
}

/** Poll-based confirm: our RPC proxy is HTTP-only, so no websocket subscriptions. */
async function confirm(connection: Connection, signature: string, lastValidBlockHeight: number) {
  for (let i = 0; i < 90; i++) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const st = value[0];
    if (st?.err) throw new Error(`Transaction failed: ${JSON.stringify(st.err)}`);
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return;
    if (i % 5 === 4 && (await connection.getBlockHeight("confirmed")) > lastValidBlockHeight) throw new Error("blockhash expired");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("blockhash expired");
}

function friendly(e: unknown) {
  const msg = explainError(e);
  if (/reject|denied|cancel/i.test(msg)) return "You cancelled in the wallet.";
  if (/insufficient|0x1\b|debit an account/i.test(msg)) return "Not enough devnet SOL — top up in Settings.";
  if (/blockhash|expired/i.test(msg)) return "Took too long to sign — try again.";
  return msg.length > 140 ? `${msg.slice(0, 140)}…` : msg;
}
