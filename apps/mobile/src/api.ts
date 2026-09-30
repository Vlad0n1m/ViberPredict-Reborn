// Reads come from the deployed backend (chain state cached + Neon index); the Helius key never ships in the APK.
import { Connection, Transaction, type PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { priorityIxs } from "@reborn/sdk";

export const API = "https://viber-predict-reborn.vercel.app";
export const connection = new Connection(`${API}/api/rpc`, { commitment: "confirmed", disableRetryOnRateLimit: true });

export type Side = "yes" | "no";
export type Market = {
  id: string;
  question: string;
  tag: string;
  source: string;
  yesPool: number;
  noPool: number;
  bettors: number;
  endTs: number;
  createdTs: number;
  creator: string;
  status: "active" | "awaiting" | "resolved";
  outcome: Side | "void" | null;
};
export type MarketEvent = { signature: string; kind: string; wallet: string; side: Side | null; sol: number; block_time: string | null };
export type Position = { position: string; marketId: string; market: Market; yes: number; no: number; claimed: boolean; claimable: number };

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { headers: { "cache-control": "no-cache" } });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;
}

export const getMarkets = () => get<{ markets: Market[] }>("/api/markets").then((j) => j.markets.filter((m) => m.outcome !== "void"));
export const getMarket = (id: string) => get<{ market: Market; events: MarketEvent[] }>(`/api/markets/${id}`);
export const getPositions = (owner: string) => get<{ positions: Position[] }>(`/api/positions?owner=${owner}`).then((j) => j.positions);

export async function buildTx(payer: PublicKey, ixs: TransactionInstruction[]) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight }).add(...priorityIxs(), ...ixs);
  return { tx, lastValidBlockHeight };
}

/** HTTP-only confirm (the RPC proxy has no websockets). */
export async function confirm(signature: string, lastValidBlockHeight: number) {
  for (let i = 0; i < 90; i++) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const st = value[0];
    if (st?.err) throw new Error(`Transaction failed: ${JSON.stringify(st.err)}`);
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return;
    if (i % 5 === 4 && (await connection.getBlockHeight("confirmed")) > lastValidBlockHeight) throw new Error("Took too long — try again.");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Took too long — try again.");
}

export const index = (signature: string, meta?: { tag?: string; source?: string }) =>
  fetch(`${API}/api/index`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signature, ...meta }) }).catch(() => null);

export const total = (m: Pick<Market, "yesPool" | "noPool">) => m.yesPool + m.noPool;
export const chance = (m: Pick<Market, "yesPool" | "noPool">) => (total(m) === 0 ? 50 : Math.round((m.yesPool / total(m)) * 100));
export const multiplier = (m: Pick<Market, "yesPool" | "noPool">, s: Side) => {
  const p = s === "yes" ? m.yesPool : m.noPool;
  return p === 0 ? 0 : (total(m) * 0.98) / p;
};
export const payoutFor = (m: Pick<Market, "yesPool" | "noPool">, s: Side, stake: number) => {
  const yes = m.yesPool + (s === "yes" ? stake : 0);
  const no = m.noPool + (s === "no" ? stake : 0);
  const pool = s === "yes" ? yes : no;
  return pool === 0 ? 0 : (stake / pool) * (yes + no) * 0.98;
};
export function closesIn(endTs: number) {
  const s = Math.floor(endTs - Date.now() / 1000);
  if (s <= 0) return "closed";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d${h ? ` ${h}h` : ""}` : h > 0 ? `${h}h ${m}m` : `${Math.max(m, 1)}m`;
}
export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
export const solscanTx = (sig: string) => `https://solscan.io/tx/${sig}?cluster=devnet`;
