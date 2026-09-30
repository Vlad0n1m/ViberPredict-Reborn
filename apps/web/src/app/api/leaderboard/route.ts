import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// GET /api/leaderboard — top wallets by SOL wagered.
export async function GET() {
  const q = await db();
  if (!q) return NextResponse.json({ leaders: [] });
  const leaders = await q`
    SELECT wallet, SUM(lamports)::float8 / 1e9 AS volume, COUNT(*)::int AS bets, COUNT(DISTINCT market)::int AS markets
    FROM events WHERE kind = 'bet' GROUP BY wallet ORDER BY volume DESC LIMIT 20`;
  return NextResponse.json({ leaders }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
}
