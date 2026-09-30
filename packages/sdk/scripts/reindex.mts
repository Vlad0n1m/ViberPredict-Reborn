// Replays every program transaction through the deployed /api/index so Neon holds the full event feed.
// Usage: HELIUS_API_KEY=... APP_URL=https://viber-predict-reborn.vercel.app pnpm reindex
import { Connection } from "@solana/web3.js";
import * as sdk from "../src/index.ts";

const conn = new Connection(`https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, "confirmed");
const app = process.env.APP_URL ?? "https://viber-predict-reborn.vercel.app";

// Tag + resolution source per seeded question (kept in sync with scripts/seed.mts).
const meta: Record<string, [string, string]> = {
  "Will Viber Predict Reborn make it to the final pitch?": ["Hackathon", "Organisers' finalist list"],
  "Will the judges deal another restart card tonight?": ["Hackathon", "Stage announcement"],
  "Will a team that restarted from scratch win the hackathon?": ["Hackathon", "Organisers' winner announcement"],
  "Will any pitch tonight run over 2 minutes?": ["Hackathon", "Stage timer"],
  "Will SOL close above $250 on Oct 7?": ["Crypto", "CoinGecko daily close"],
  "Will Solana devnet stay up for the whole hackathon?": ["Solana", "status.solana.com"],
  "Will it snow in Astana before October 15?": ["Kazakhstan", "Kazhydromet"],
  "Will Kazakhstan score in their next football match?": ["Sports", "UEFA match report"],
  "Will an AI agent win a Solana hackathon track this year?": ["Tech & AI", "Colosseum results"],
  "Will 50 wallets bet on this app before midnight?": ["Seeker", "On-chain unique bettors"],
};
const byMarket = new Map((await sdk.fetchMarkets(conn)).map((m) => [m.pubkey, meta[m.question]]));

const sigs = (await conn.getSignaturesForAddress(sdk.PROGRAM_ID, { limit: 1000 })).filter((s) => !s.err).reverse();
for (const { signature } of sigs) {
  const tx = await conn.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  const keys = tx?.transaction.message.getAccountKeys();
  const create = tx?.transaction.message.compiledInstructions.find((ix) => keys!.get(ix.programIdIndex)?.equals(sdk.PROGRAM_ID) && ix.data[0] === 0);
  const m = create ? byMarket.get(keys!.get(create.accountKeyIndexes[1])!.toBase58()) : undefined;
  const res = await fetch(`${app}/api/index`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signature, tag: m?.[0], source: m?.[1] }),
  });
  console.log(res.status, signature.slice(0, 8), JSON.stringify(await res.json()));
}
