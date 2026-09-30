import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { claimable, fetchPositions, sol } from "@reborn/sdk";
import { cachedMarkets, connection, toApiMarket } from "@/server/chain";
import { metaMap } from "@/server/db";

export const dynamic = "force-dynamic";

// GET /api/positions?owner=<wallet> — user's positions with market and claimable SOL.
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  let key: PublicKey;
  try {
    key = new PublicKey(owner ?? "");
  } catch {
    return NextResponse.json({ error: "owner required" }, { status: 400 });
  }
  const [positions, markets, meta] = await Promise.all([
    fetchPositions(connection, key),
    cachedMarkets(),
    metaMap().catch(() => ({}) as Record<string, never>),
  ]);
  const byKey = new Map(markets.map((m) => [m.pubkey, m]));
  const out = positions.flatMap((p) => {
    const m = byKey.get(p.market);
    if (!m) return [];
    return [{
      position: p.pubkey,
      marketId: p.market,
      market: toApiMarket(m, meta[m.pubkey]),
      yes: sol(p.yes),
      no: sol(p.no),
      claimed: p.claimed,
      claimable: sol(claimable(m, p)),
    }];
  });
  return NextResponse.json({ positions: out }, { headers: { "Cache-Control": "private, no-store" } });
}
