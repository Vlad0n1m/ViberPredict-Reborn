import { NextResponse } from "next/server";
import { cachedMarkets, toApiMarket } from "@/server/chain";
import { metaMap } from "@/server/db";

export const dynamic = "force-dynamic";

// GET /api/markets — all markets from chain, merged with tag/source from Neon. CDN-cached 3s.
export async function GET() {
  const [markets, meta] = await Promise.all([cachedMarkets(), metaMap().catch(() => ({}) as Record<string, never>)]);
  return NextResponse.json(
    { markets: markets.map((m) => toApiMarket(m, meta[m.pubkey])) },
    { headers: { "Cache-Control": "public, s-maxage=3, stale-while-revalidate=10" } },
  );
}
