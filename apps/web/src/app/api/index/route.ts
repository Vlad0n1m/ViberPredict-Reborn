import { NextResponse } from "next/server";
import { PROGRAM_ID, decodeIx } from "@reborn/sdk";
import { connection } from "@/server/chain";
import { db } from "@/server/db";

const TAGS = new Set(["Hackathon", "Crypto", "Solana", "Kazakhstan", "Sports", "Tech & AI", "Seeker", "New"]);

// POST /api/index { signature, tag?, source? }
// Clients call this after a confirmed tx. The server re-reads the tx from chain and stores only
// what the program actually executed, so the feed/leaderboard can't be spoofed.
export async function POST(req: Request) {
  const { signature, tag, source } = (await req.json().catch(() => ({}))) as { signature?: string; tag?: string; source?: string };
  if (!signature || !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) {
    return NextResponse.json({ error: "signature required" }, { status: 400 });
  }
  const q = await db();
  if (!q) return NextResponse.json({ error: "database not configured" }, { status: 503 });

  let tx = null;
  for (let i = 0; i < 6 && !tx; i++) {
    tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    if (!tx) await new Promise((r) => setTimeout(r, 700));
  }
  if (!tx) return NextResponse.json({ error: "transaction not found yet" }, { status: 404 });
  if (tx.meta?.err) return NextResponse.json({ error: "transaction failed on chain" }, { status: 422 });

  const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses });
  const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null;
  const indexed: { kind: string; market: string }[] = [];

  for (const [i, ix] of tx.transaction.message.compiledInstructions.entries()) {
    if (!keys.get(ix.programIdIndex)?.equals(PROGRAM_ID)) continue;
    const d = decodeIx(ix.data);
    if (!d) continue;
    const wallet = keys.get(ix.accountKeyIndexes[0])!.toBase58();
    const market = keys.get(ix.accountKeyIndexes[1])!.toBase58();
    const side = d.kind === "bet" ? d.side : d.kind === "resolve" ? d.outcome : null;
    const lamports = d.kind === "bet" ? d.lamports : 0;
    await q`INSERT INTO events (signature, ix_index, kind, market, wallet, side, lamports, slot, block_time)
            VALUES (${signature}, ${i}, ${d.kind}, ${market}, ${wallet}, ${side}, ${lamports}, ${tx.slot}, ${blockTime})
            ON CONFLICT DO NOTHING`;
    if (d.kind === "create") {
      const t = tag && TAGS.has(tag) ? tag : "New";
      const s = (source ?? "").slice(0, 200);
      await q`INSERT INTO market_meta (market, tag, source) VALUES (${market}, ${t}, ${s}) ON CONFLICT DO NOTHING`;
    }
    indexed.push({ kind: d.kind, market });
  }
  return NextResponse.json({ indexed });
}
