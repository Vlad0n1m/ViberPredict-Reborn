import { NextResponse } from "next/server";
import { RPC_URL } from "@/server/chain";

// POST /api/rpc — JSON-RPC proxy to Helius devnet for web + APK, so the key stays server-side.
const ALLOWED = new Set([
  "getLatestBlockhash", "getBalance", "getAccountInfo", "getMultipleAccounts", "getSignatureStatuses",
  "sendTransaction", "simulateTransaction", "getTransaction", "getFeeForMessage", "getMinimumBalanceForRentExemption",
  "getSlot", "getBlockHeight", "isBlockhashValid", "getRecentPrioritizationFees", "getEpochInfo", "getGenesisHash", "getVersion",
]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const calls = Array.isArray(body) ? body : [body];
  if (!body || calls.length > 20 || calls.some((c) => !c || !ALLOWED.has(c.method))) {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32601, message: "method not allowed" } }, { status: 400 });
  }
  const r = await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return new NextResponse(r.body, { status: r.status, headers: { "content-type": "application/json" } });
}
