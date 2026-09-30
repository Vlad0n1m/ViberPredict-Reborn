// Seeds the reborn program with fresh devnet markets and a few real bets.
// Idempotent: skips questions already on chain. Index into Neon afterwards with scripts/reindex.mts.
// Usage: HELIUS_API_KEY=... KEYPAIR=path/to/admin.json pnpm seed
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, type TransactionInstruction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import * as sdk from "../src/index.ts";

const conn = new Connection(`https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, "confirmed");
const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.KEYPAIR!, "utf8"))));
const crowd = Array.from({ length: 3 }, () => Keypair.generate());
const send = (signers: Keypair[], ...ixs: TransactionInstruction[]) =>
  sendAndConfirmTransaction(conn, new Transaction().add(...sdk.priorityIxs(), ...ixs), signers);

const H = 3600, D = 86400;
const seeds: { q: string; tag: string; source: string; in: number; yes: number[]; no: number[] }[] = [
  { q: "Will Viber Predict Reborn make it to the final pitch?", tag: "Hackathon", source: "Organisers' finalist list", in: 4 * H, yes: [0.2, 0.08, 0.05], no: [0.04] },
  { q: "Will the judges deal another restart card tonight?", tag: "Hackathon", source: "Stage announcement", in: 3 * H, yes: [0.03], no: [0.12, 0.06] },
  { q: "Will a team that restarted from scratch win the hackathon?", tag: "Hackathon", source: "Organisers' winner announcement", in: 5 * H, yes: [0.1, 0.05], no: [0.07] },
  { q: "Will any pitch tonight run over 2 minutes?", tag: "Hackathon", source: "Stage timer", in: 2 * H, yes: [0.09, 0.04], no: [0.02] },
  { q: "Will SOL close above $250 on Oct 7?", tag: "Crypto", source: "CoinGecko daily close", in: 7 * D, yes: [0.15], no: [0.1, 0.05] },
  { q: "Will Solana devnet stay up for the whole hackathon?", tag: "Solana", source: "status.solana.com", in: 6 * H, yes: [0.12, 0.03], no: [0.02] },
  { q: "Will it snow in Astana before October 15?", tag: "Kazakhstan", source: "Kazhydromet", in: 15 * D, yes: [0.03], no: [0.09, 0.04] },
  { q: "Will Kazakhstan score in their next football match?", tag: "Sports", source: "UEFA match report", in: 4 * D, yes: [0.06, 0.03], no: [0.03] },
  { q: "Will an AI agent win a Solana hackathon track this year?", tag: "Tech & AI", source: "Colosseum results", in: 92 * D, yes: [0.05], no: [0.04] },
  { q: "Will 50 wallets bet on this app before midnight?", tag: "Seeker", source: "On-chain unique bettors", in: 10 * H, yes: [0.04, 0.02], no: [0.05] },
];

await send([admin], ...crowd.map((c) => SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: c.publicKey, lamports: 0.8 * LAMPORTS_PER_SOL })));
const existing = new Set((await sdk.fetchMarkets(conn)).map((m) => m.question));
const now = Math.floor(Date.now() / 1000);
for (const s of seeds) {
  if (existing.has(s.q)) continue;
  const { ix, market } = sdk.createMarketIx(admin.publicKey, sdk.newMarketId(), now + s.in, s.q);
  await send([admin], ix);
  const bets: [Keypair, sdk.Side, number][] = [
    ...s.yes.map((v, i) => [[admin, ...crowd][i % 4], "yes", v] as [Keypair, sdk.Side, number]),
    ...s.no.map((v, i) => [crowd[(i + 1) % 3], "no", v] as [Keypair, sdk.Side, number]),
  ];
  for (const [who, side, v] of bets) {
    await send([who], sdk.placeBetIx(who.publicKey, market, side, Math.round(v * LAMPORTS_PER_SOL)));
  }
  console.log("seeded", market.toBase58(), s.q);
}
