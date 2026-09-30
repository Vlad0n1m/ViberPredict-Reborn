// Reborn seed: mock data shaped like the on-chain Market account. Swap for packages/sdk reads when the backend lands.

export type Side = "yes" | "no";
export type MarketStatus = "active" | "awaiting" | "resolved";

export type Market = {
  id: string;
  question: string;
  tag: string;
  yesPool: number; // SOL
  noPool: number; // SOL
  bettors: number;
  closesIn: string;
  creator: string;
  source: string;
  status: MarketStatus;
  // chance of YES over time, 0–100, oldest first — for the featured chart
  history?: number[];
};

export const FEE = 0.02;
export const MAX_BET = 1;

export const markets: Market[] = [
  {
    id: "mobile-wins",
    question: "Will Viber Predict Reborn make it to the final pitch?",
    tag: "Hackathon",
    yesPool: 9.09,
    noPool: 3.71,
    bettors: 46,
    closesIn: "2h 10m",
    creator: "7xQa…m2Fe",
    source: "Organisers' finalist list",
    status: "active",
    history: [42, 45, 40, 49, 47, 55, 53, 60, 58, 64, 62, 68, 66, 71, 70, 71],
  },
  { id: "pitch-over-2", question: "Will any pitch tonight run over 2 minutes?", tag: "Hackathon", yesPool: 2.73, noPool: 0.37, bettors: 19, closesIn: "38m", creator: "BK4T…PRHc", source: "Stage timer", status: "active" },
  { id: "judges-seeker", question: "Will the judges deal another restart card tonight?", tag: "Hackathon", yesPool: 4.1, noPool: 2.3, bettors: 22, closesIn: "1h 10m", creator: "9pLm…Qe1A", source: "Organisers' winner announcement", status: "active" },
  { id: "sol-250", question: "Will SOL close above $250 on Oct 7?", tag: "Crypto", yesPool: 114.2, noPool: 70.0, bettors: 311, closesIn: "7d", creator: "3fTr…wZ9k", source: "CoinGecko daily close", status: "active" },
  { id: "tps-5000", question: "Will Solana process 5,000+ TPS at any point this week?", tag: "Solana", yesPool: 21.7, noPool: 35.3, bettors: 98, closesIn: "5d", creator: "Hx2e…u7Rb", source: "Solana Explorer", status: "active" },
  { id: "ai-agent-track", question: "Will an AI agent win a Solana hackathon track this year?", tag: "Tech & AI", yesPool: 12.0, noPool: 10.3, bettors: 57, closesIn: "92d", creator: "Qq8s…Ld3N", source: "Colosseum results", status: "active" },
  { id: "astana-snow", question: "Will it snow in Astana before October 15?", tag: "Kazakhstan", yesPool: 2.0, noPool: 6.4, bettors: 33, closesIn: "15d", creator: "Kz1a…Ast4", source: "Kazhydromet", status: "active" },
  { id: "wallets-100", question: "Will 50 wallets bet on this app before midnight?", tag: "Seeker", yesPool: 3.0, noPool: 3.6, bettors: 27, closesIn: "9h", creator: "BK4T…PRHc", source: "On-chain unique bettors", status: "active" },
  { id: "kz-football", question: "Will Kazakhstan score in their next football match?", tag: "Sports", yesPool: 3.5, noPool: 1.7, bettors: 18, closesIn: "4d", creator: "Fb7x…Goal", source: "UEFA match report", status: "active" },
  { id: "demo-live", question: "Will the reborn demo work on the first try?", tag: "Hackathon", yesPool: 1.8, noPool: 1.1, bettors: 12, closesIn: "closed", creator: "BK4T…PRHc", source: "Judges", status: "awaiting" },
];

export const categories = ["Trending", "New", "Hackathon", "Crypto", "Solana", "Kazakhstan", "Sports", "Tech & AI", "Seeker"];

export type Position = { marketId: string; side: Side; stake: number; claimable?: number };

export const positions: Position[] = [
  { marketId: "pitch-over-2", side: "yes", stake: 0.5, claimable: 1.84 },
  { marketId: "mobile-wins", side: "yes", stake: 0.5 },
  { marketId: "astana-snow", side: "no", stake: 0.25 },
  { marketId: "tps-5000", side: "no", stake: 1 },
];

export const wallet = { short: "BK4T…PRHc", balance: 9.8 };

export function getMarket(id: string) {
  return markets.find((m) => m.id === id);
}

export function total(m: Market) {
  return m.yesPool + m.noPool;
}

/** Chance of YES in whole percent. */
export function chance(m: Market) {
  const t = total(m);
  return t === 0 ? 50 : Math.round((m.yesPool / t) * 100);
}

/** Payout multiplier for a side, after fee. */
export function multiplier(m: Market, side: Side) {
  const pool = side === "yes" ? m.yesPool : m.noPool;
  return pool === 0 ? 0 : (total(m) * (1 - FEE)) / pool;
}

/** Payout if `side` wins after adding `stake` to it. */
export function payoutFor(m: Market, side: Side, stake: number) {
  const yes = m.yesPool + (side === "yes" ? stake : 0);
  const no = m.noPool + (side === "no" ? stake : 0);
  const pool = side === "yes" ? yes : no;
  return pool === 0 ? 0 : (stake / pool) * (yes + no) * (1 - FEE);
}

export function sol(n: number, digits = 2) {
  return n.toFixed(digits);
}
