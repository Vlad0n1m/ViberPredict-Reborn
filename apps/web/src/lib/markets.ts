// Market shape served by /api/markets (chain state + Neon meta) and the math the UI shows.

export type Side = "yes" | "no";
export type MarketStatus = "active" | "awaiting" | "resolved";

export type Market = {
  id: string; // market account pubkey
  question: string;
  tag: string;
  source: string;
  yesPool: number; // SOL
  noPool: number; // SOL
  bettors: number;
  endTs: number;
  createdTs: number;
  creator: string;
  status: MarketStatus;
  outcome: Side | "void" | null;
  closesIn: string;
  history?: number[];
};

export type ApiMarket = Omit<Market, "closesIn" | "history">;

export type MarketEvent = {
  signature: string;
  kind: "create" | "bet" | "resolve" | "claim" | "void";
  wallet: string;
  side: Side | null;
  sol: number;
  block_time: string | null;
};

export const FEE = 0.02;
export const MAX_BET = 1;
export const MIN_BET = 0.001;

export const categories = ["Trending", "New", "Hackathon", "Crypto", "Solana", "Kazakhstan", "Sports", "Tech & AI", "Seeker"];
export const TAGS = categories.slice(2);

export function closesIn(endTs: number, now = Date.now() / 1000) {
  const s = Math.floor(endTs - now);
  if (s <= 0) return "closed";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d${h ? ` ${h}h` : ""}` : h > 0 ? `${h}h ${m}m` : `${Math.max(m, 1)}m`;
}

export function fromApi(m: ApiMarket, history?: number[]): Market {
  return { ...m, closesIn: closesIn(m.endTs), history };
}

/** YES chance over time from indexed bets, oldest first. */
export function historyFrom(events: MarketEvent[]) {
  let yes = 0;
  let no = 0;
  const pts = [50];
  for (const e of [...events].reverse()) {
    if (e.kind !== "bet") continue;
    if (e.side === "yes") yes += e.sol;
    else no += e.sol;
    pts.push(Math.round((yes / (yes + no)) * 100));
  }
  return pts.length > 1 ? pts : [50, 50];
}

export function total(m: Pick<Market, "yesPool" | "noPool">) {
  return m.yesPool + m.noPool;
}

/** Chance of YES in whole percent. */
export function chance(m: Pick<Market, "yesPool" | "noPool">) {
  const t = total(m);
  return t === 0 ? 50 : Math.round((m.yesPool / t) * 100);
}

/** Payout multiplier for a side, after fee. */
export function multiplier(m: Pick<Market, "yesPool" | "noPool">, side: Side) {
  const pool = side === "yes" ? m.yesPool : m.noPool;
  return pool === 0 ? 0 : (total(m) * (1 - FEE)) / pool;
}

/** Payout if `side` wins after adding `stake` to it. */
export function payoutFor(m: Pick<Market, "yesPool" | "noPool">, side: Side, stake: number) {
  const yes = m.yesPool + (side === "yes" ? stake : 0);
  const no = m.noPool + (side === "no" ? stake : 0);
  const pool = side === "yes" ? yes : no;
  return pool === 0 ? 0 : (stake / pool) * (yes + no) * (1 - FEE);
}

export function sol(n: number, digits = 2) {
  return n.toFixed(digits);
}

export function shortAddr(a: string) {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

export const solscanTx = (sig: string) => `https://solscan.io/tx/${sig}?cluster=devnet`;
export const solscanAccount = (addr: string) => `https://solscan.io/account/${addr}?cluster=devnet`;
