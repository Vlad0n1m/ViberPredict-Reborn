// Season 2 seed: voids the old placeholder markets, opens fresh ones, spins up a crowd of devnet wallets
// funded from the admin wallet, and has them place real micro-bets. Every tx is indexed via APP_URL/api/index.
// Usage: HELIUS_API_KEY=... KEYPAIR=path/to/admin.json APP_URL=https://... CROWD=30 pnpm crowd
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, type TransactionInstruction } from "@solana/web3.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as sdk from "../src/index.ts";

const conn = new Connection(`https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, "confirmed");
const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.KEYPAIR!, "utf8"))));
const app = process.env.APP_URL ?? "https://viber-predict-reborn.vercel.app";
const CROWD = Number(process.env.CROWD ?? 30);
const FUND = Number(process.env.FUND ?? 0.09);
const KEYS = new URL("../../../keys/crowd.json", import.meta.url);

const send = (signers: Keypair[], ...ixs: TransactionInstruction[]) =>
  sendAndConfirmTransaction(conn, new Transaction().add(...sdk.priorityIxs(20_000, 60_000), ...ixs), signers, { commitment: "confirmed" });
const index = (signature: string, tag?: string, source?: string) =>
  fetch(`${app}/api/index`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signature, tag, source }) })
    .then((r) => r.status)
    .catch(() => 0);
async function pool<T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      try { await fn(items[i], i); } catch (e) { console.log("  skip:", sdk.explainError(e).slice(0, 120)); }
    }
  }));
}

const H = 3600, D = 86400;
// [question, tag, resolution source, closes in, target YES chance]
const MARKETS: [string, string, string, number, number][] = [
  ["Does Viber Reborn land a podium spot at Superteam KZ × Viber?", "Hackathon", "Organisers' winner announcement", 8 * H, 0.64],
  ["Will the judges pull another restart card before demos?", "Hackathon", "Stage announcement", 3 * H, 0.22],
  ["Will more than 20 teams make it to the demo stage tonight?", "Hackathon", "Organisers' demo list", 5 * H, 0.57],
  ["Will a live demo crash on stage tonight?", "Hackathon", "Anyone in the room", 6 * H, 0.71],
  ["SOL above $200 at Friday's daily close?", "Crypto", "CoinGecko daily close", 3 * D, 0.46],
  ["Bitcoin prints a new all-time high before November?", "Crypto", "CoinGecko BTC/USD", 30 * D, 0.38],
  ["Firedancer runs on 20%+ of Solana stake by year end?", "Solana", "validators.app client share", 90 * D, 0.33],
  ["Solana hits 100M+ daily transactions any day this month?", "Solana", "Solscan daily stats", 30 * D, 0.52],
  ["First snow in Astana before October 10?", "Kazakhstan", "Kazhydromet", 10 * D, 0.27],
  ["Astana hits +20°C again this October?", "Kazakhstan", "Kazhydromet", 30 * D, 0.41],
  ["Kairat win their next Premier League match?", "Sports", "KFF match report", 5 * D, 0.61],
  ["An open-weights model tops LMArena text before 2027?", "Tech & AI", "lmarena.ai leaderboard", 90 * D, 0.29],
  ["100 wallets bet on Viber Reborn before midnight?", "Seeker", "On-chain unique bettors", 10 * H, 0.68],
];

// 1) Void old placeholder markets so the feed only shows season 2.
const questions = new Set(MARKETS.map((m) => m[0]));
const old = (await sdk.fetchMarkets(conn)).filter((m) => m.status === "open" && !questions.has(m.question));
await pool(old, 4, async (m) => {
  const sig = await send([admin], sdk.voidIx(admin.publicKey, new PublicKey(m.pubkey)));
  console.log("void", m.question.slice(0, 50), await index(sig));
});

// 1b) Pull the admin's own stakes back out of voided markets.
const all = new Map((await sdk.fetchMarkets(conn)).map((m) => [m.pubkey, m]));
const refunds = (await sdk.fetchPositions(conn, admin.publicKey)).filter((p) => all.get(p.market)?.status === "void" && !p.claimed);
await pool(refunds, 4, async (p) => {
  const m = all.get(p.market)!;
  const sig = await send([admin], sdk.claimIx(admin.publicKey, new PublicKey(p.market), new PublicKey(m.creator)));
  console.log("refund", sdk.sol(p.yes + p.no), "SOL", await index(sig));
});

// 2) Open fresh markets (idempotent by question).
const existing = new Map((await sdk.fetchMarkets(conn)).filter((m) => m.status === "open").map((m) => [m.question, m.pubkey]));
const now = Math.floor(Date.now() / 1000);
const live: { pk: PublicKey; yes: number }[] = [];
for (const [q, tag, source, closesIn, yes] of MARKETS) {
  if (existing.has(q)) { live.push({ pk: new PublicKey(existing.get(q)!), yes }); continue; }
  const { ix, market } = sdk.createMarketIx(admin.publicKey, sdk.newMarketId(), now + closesIn, q);
  const sig = await send([admin], ix);
  console.log("create", q.slice(0, 50), await index(sig, tag, source));
  live.push({ pk: market, yes });
}

// 3) Crowd wallets, saved to keys/crowd.json (gitignored) so they can bet again later.
mkdirSync(new URL(".", KEYS), { recursive: true });
const saved: number[][] = existsSync(KEYS) ? JSON.parse(readFileSync(KEYS, "utf8")) : [];
while (saved.length < CROWD) saved.push(Array.from(Keypair.generate().secretKey));
writeFileSync(KEYS, JSON.stringify(saved));
const crowd = saved.slice(0, CROWD).map((k) => Keypair.fromSecretKey(Uint8Array.from(k)));

// 4) Fund them from the admin wallet, 10 transfers per tx.
for (let i = 0; i < crowd.length; i += 10) {
  const batch = crowd.slice(i, i + 10);
  const sig = await send([admin], ...batch.map((c) => SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: c.publicKey, lamports: Math.round(FUND * LAMPORTS_PER_SOL) })));
  console.log(`funded ${i + batch.length}/${crowd.length} with ${FUND} SOL`, sig.slice(0, 10));
}

// 5) Micro-bets: each wallet backs 3–5 markets, side drawn from the market's target odds.
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const bets: [Keypair, PublicKey, sdk.Side, number][] = [];
for (const c of crowd) {
  const picks = [...live].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3));
  for (const m of picks) bets.push([c, m.pk, Math.random() < m.yes ? "yes" : "no", Math.round(rnd(0.002, 0.018) * 1000) / 1000]);
}
bets.sort(() => Math.random() - 0.5);
let done = 0;
await pool(bets, 8, async ([who, market, side, amount]) => {
  const sig = await send([who], sdk.placeBetIx(who.publicKey, market, side, amount * LAMPORTS_PER_SOL));
  await index(sig);
  if (++done % 10 === 0) console.log(`bets ${done}/${bets.length}`);
});
console.log(`done: ${done} bets from ${crowd.length} wallets on ${live.length} markets`);
