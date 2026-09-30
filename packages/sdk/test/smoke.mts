// End-to-end check on devnet: create → bet YES/NO → admin resolve → claim.
// Usage: HELIUS_API_KEY=... KEYPAIR=path/to/admin.json pnpm smoke
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import * as sdk from "../src/index.ts";

const conn = new Connection(`https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, "confirmed");
const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.KEYPAIR!, "utf8"))));
const bob = Keypair.generate();
const send = (signers: Keypair[], ...ixs: any[]) =>
  sendAndConfirmTransaction(conn, new Transaction().add(...sdk.priorityIxs(), ...ixs), signers);

const id = sdk.newMarketId();
const { ix, market } = sdk.createMarketIx(admin.publicKey, id, Math.floor(Date.now() / 1000) + 3600, "Smoke test: will this market resolve YES?");
console.log("fund bob + create", await send([admin], SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: bob.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }), ix));
console.log("admin YES 0.03", await send([admin], sdk.placeBetIx(admin.publicKey, market, "yes", 0.03 * LAMPORTS_PER_SOL)));
console.log("bob NO 0.01", await send([bob], sdk.placeBetIx(bob.publicKey, market, "no", 0.01 * LAMPORTS_PER_SOL)));
let m = (await sdk.fetchMarket(conn, market))!;
console.log("market", m.status, sdk.sol(m.yesPool), sdk.sol(m.noPool), "bettors", m.bettors, "chance", sdk.chance(m));
try {
  await send([bob], sdk.resolveIx(bob.publicKey, market, "no"));
  throw new Error("bob should not resolve");
} catch (e) {
  console.log("bob resolve rejected:", sdk.explainError(e));
}
console.log("admin resolve YES", await send([admin], sdk.resolveIx(admin.publicKey, market, "yes")));
m = (await sdk.fetchMarket(conn, market))!;
const pos = (await sdk.fetchPositions(conn, admin.publicKey)).find((p) => p.market === market.toBase58())!;
console.log("claimable", sdk.sol(sdk.claimable(m, pos)));
const before = await conn.getBalance(admin.publicKey);
console.log("claim", await send([admin], sdk.claimIx(admin.publicKey, market, admin.publicKey)));
console.log("admin delta (payout+fees-txfee)", sdk.sol((await conn.getBalance(admin.publicKey)) - before));
try {
  await send([admin], sdk.claimIx(admin.publicKey, market, admin.publicKey));
} catch (e) {
  console.log("double claim rejected:", sdk.explainError(e));
}
console.log("markets on chain:", (await sdk.fetchMarkets(conn)).length, "market", market.toBase58());
