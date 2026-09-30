import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { fetchMarket } from "@reborn/sdk";
import { connection, toApiMarket } from "@/server/chain";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// GET /api/markets/:pubkey — one market (fresh from chain) + its last 50 indexed events.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let key: PublicKey;
  try {
    key = new PublicKey(id);
  } catch {
    return NextResponse.json({ error: "bad market address" }, { status: 400 });
  }
  const m = await fetchMarket(connection, key);
  if (!m) return NextResponse.json({ error: "market not found" }, { status: 404 });
  const q = await db();
  const [meta, events] = q
    ? await Promise.all([
        q`SELECT tag, source FROM market_meta WHERE market = ${id}`,
        q`SELECT signature, kind, wallet, side, lamports::float8 / 1e9 AS sol, block_time FROM events WHERE market = ${id} ORDER BY block_time DESC NULLS LAST LIMIT 50`,
      ])
    : [[], []];
  return NextResponse.json(
    { market: toApiMarket(m, meta[0] as { tag: string; source: string } | undefined), events },
    { headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=5" } },
  );
}
