import "server-only";
import { Connection } from "@solana/web3.js";
import { chance, fetchMarkets, sol, type MarketAccount } from "@reborn/sdk";

// Devnet only. The Helius key never leaves the server.
export const RPC_URL = process.env.HELIUS_API_KEY
  ? `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : "https://api.devnet.solana.com";

export const connection = new Connection(RPC_URL, "confirmed");

// One getProgramAccounts per few seconds per warm instance, however many users poll.
let cache: { at: number; data: MarketAccount[] } | null = null;
let inflight: Promise<MarketAccount[]> | null = null;
export async function cachedMarkets(maxAgeMs = 3000) {
  if (cache && Date.now() - cache.at < maxAgeMs) return cache.data;
  inflight ??= fetchMarkets(connection)
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => (inflight = null));
  return inflight;
}

export type MarketMeta = { tag: string; source: string };

/** Shape consumed by the UI (matches src/lib/markets.ts `Market`, plus raw on-chain fields). */
export function toApiMarket(m: MarketAccount, meta?: MarketMeta) {
  const now = Date.now() / 1000;
  const status = m.status === "open" ? (m.endTs > now ? "active" : "awaiting") : "resolved";
  return {
    id: m.pubkey,
    question: m.question,
    tag: meta?.tag ?? "New",
    source: meta?.source ?? "",
    yesPool: sol(m.yesPool),
    noPool: sol(m.noPool),
    bettors: m.bettors,
    chance: Math.round(chance(m) * 100),
    endTs: m.endTs,
    createdTs: m.createdTs,
    creator: m.creator,
    status,
    outcome: m.status === "void" ? "void" : m.outcome,
    onchainStatus: m.status,
    marketId: m.id,
  };
}
