import { NextResponse } from "next/server";
import { PROGRAM_ID } from "@reborn/sdk";
import { connection } from "@/server/chain";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// GET /api/health — RPC, program and database status.
export async function GET() {
  const [slot, program, database] = await Promise.all([
    connection.getSlot().catch(() => null),
    connection.getAccountInfo(PROGRAM_ID).then((a) => Boolean(a?.executable)).catch(() => false),
    db()?.then((q) => q`SELECT 1`).then(() => true).catch(() => false) ?? Promise.resolve(false),
  ]);
  return NextResponse.json({
    cluster: "devnet",
    programId: PROGRAM_ID.toBase58(),
    rpc: slot !== null,
    slot,
    program,
    database,
  });
}
