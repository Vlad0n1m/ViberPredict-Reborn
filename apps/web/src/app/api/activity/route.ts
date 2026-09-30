import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// GET /api/activity?market=&wallet= — latest indexed events (bets, creates, resolves, claims).
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const market = p.get("market");
  const wallet = p.get("wallet");
  const q = await db();
  if (!q) return NextResponse.json({ events: [] });
  const events = await q`
    SELECT signature, kind, market, wallet, side, lamports::float8 / 1e9 AS sol, block_time
    FROM events
    WHERE (${market}::text IS NULL OR market = ${market}) AND (${wallet}::text IS NULL OR wallet = ${wallet})
    ORDER BY block_time DESC NULLS LAST LIMIT 50`;
  return NextResponse.json({ events }, { headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=5" } });
}
