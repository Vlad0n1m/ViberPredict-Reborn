// Viber Predict Reborn client: PDAs, account decoders and instruction builders.
// Byte layouts mirror programs/prediction/src/lib.rs.
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("HqSA9nbfscPV8x3Md7wxW7o1wJp2Y8QDnP8ueGeEgJqa");
export const ADMIN = new PublicKey("BK4Tt9kZfazEs3DRzyygpDKP4mN7PyuWduUEJStUPRHc");
export const TREASURY = ADMIN;
export const LAMPORTS = 1_000_000_000;
export const FEE_BPS = 200;
export const MIN_BET = 1_000_000;
export const MAX_BET = 1_000_000_000;
export const MAX_QUESTION = 200;
export const MARKET_SIZE = 282;
export const POSITION_SIZE = 84;

export type Side = "yes" | "no";
export type MarketStatus = "open" | "resolved" | "void";

export type MarketAccount = {
  pubkey: string;
  creator: string;
  id: string; // u64 as decimal string
  endTs: number;
  createdTs: number;
  yesPool: number; // lamports
  noPool: number;
  bettors: number;
  status: MarketStatus;
  outcome: Side | null;
  question: string;
};

export type PositionAccount = {
  pubkey: string;
  market: string;
  user: string;
  yes: number; // lamports
  no: number;
  claimed: boolean;
};

export const ERRORS: Record<number, string> = {
  6000: "Invalid instruction",
  6001: "Question must be 1–200 bytes",
  6002: "Close time must be in the future",
  6003: "Market is closed",
  6004: "Bet must be between 0.001 and 1 SOL",
  6005: "Side must be YES or NO",
  6006: "Not authorized",
  6007: "Too early to resolve",
  6008: "Market is not settled yet",
  6009: "Already claimed",
  6010: "Nothing to claim",
  6011: "Wrong account",
};

const u64le = (v: bigint | number) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(v), true);
  return b;
};
const i64le = (v: bigint | number) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigInt64(0, BigInt(v), true);
  return b;
};
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const toBuf = (u: Uint8Array) => Buffer.from(u);
const sideByte = (s: Side) => (s === "yes" ? 1 : 2);

export function marketPda(creator: PublicKey, id: bigint | number) {
  return PublicKey.findProgramAddressSync([Buffer.from("market"), creator.toBuffer(), toBuf(u64le(id))], PROGRAM_ID)[0];
}
export function positionPda(market: PublicKey, user: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("position"), market.toBuffer(), user.toBuffer()], PROGRAM_ID)[0];
}

/** Random u64 market id; unique per creator in practice. */
export function newMarketId(): bigint {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return new DataView(b.buffer).getBigUint64(0, true);
}

export function decodeMarket(pubkey: PublicKey | string, data: Uint8Array): MarketAccount | null {
  if (data.length !== MARKET_SIZE || data[0] !== 1) return null;
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const status = (["open", "resolved", "void"] as const)[data[2]] ?? "open";
  const qlen = v.getUint16(80, true);
  return {
    pubkey: pubkey.toString(),
    status,
    outcome: data[3] === 1 ? "yes" : data[3] === 2 ? "no" : null,
    creator: new PublicKey(data.slice(4, 36)).toBase58(),
    id: v.getBigUint64(36, true).toString(),
    endTs: Number(v.getBigInt64(44, true)),
    yesPool: Number(v.getBigUint64(52, true)),
    noPool: Number(v.getBigUint64(60, true)),
    createdTs: Number(v.getBigInt64(68, true)),
    bettors: v.getUint32(76, true),
    question: new TextDecoder().decode(data.slice(82, 82 + qlen)),
  };
}

export function decodePosition(pubkey: PublicKey | string, data: Uint8Array): PositionAccount | null {
  if (data.length !== POSITION_SIZE || data[0] !== 2) return null;
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    pubkey: pubkey.toString(),
    claimed: data[2] !== 0,
    market: new PublicKey(data.slice(4, 36)).toBase58(),
    user: new PublicKey(data.slice(36, 68)).toBase58(),
    yes: Number(v.getBigUint64(68, true)),
    no: Number(v.getBigUint64(76, true)),
  };
}

export async function fetchMarkets(connection: Connection): Promise<MarketAccount[]> {
  const accs = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: MARKET_SIZE }],
  });
  return accs
    .map((a) => decodeMarket(a.pubkey, a.account.data))
    .filter((m): m is MarketAccount => m !== null)
    .sort((a, b) => b.createdTs - a.createdTs);
}

export async function fetchMarket(connection: Connection, pubkey: PublicKey): Promise<MarketAccount | null> {
  const acc = await connection.getAccountInfo(pubkey);
  return acc && acc.owner.equals(PROGRAM_ID) ? decodeMarket(pubkey, acc.data) : null;
}

export async function fetchPositions(connection: Connection, owner: PublicKey): Promise<PositionAccount[]> {
  const accs = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: POSITION_SIZE }, { memcmp: { offset: 36, bytes: owner.toBase58() } }],
  });
  return accs.map((a) => decodePosition(a.pubkey, a.account.data)).filter((p): p is PositionAccount => p !== null);
}

// ---------- instructions ----------

export function createMarketIx(creator: PublicKey, id: bigint, endTs: number, question: string) {
  const q = new TextEncoder().encode(question.trim());
  if (q.length === 0 || q.length > MAX_QUESTION) throw new Error(ERRORS[6001]);
  const qlen = new Uint8Array([q.length & 0xff, q.length >> 8]);
  const market = marketPda(creator, id);
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: toBuf(concat(new Uint8Array([0]), u64le(id), i64le(endTs), qlen, q)),
  });
  return { ix, market };
}

export function placeBetIx(user: PublicKey, market: PublicKey, side: Side, lamports: number) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: positionPda(market, user), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: toBuf(concat(new Uint8Array([1, sideByte(side)]), u64le(Math.round(lamports)))),
  });
}

export function resolveIx(authority: PublicKey, market: PublicKey, outcome: Side) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: market, isSigner: false, isWritable: true },
    ],
    data: toBuf(new Uint8Array([2, sideByte(outcome)])),
  });
}

export function claimIx(user: PublicKey, market: PublicKey, creator: PublicKey) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: positionPda(market, user), isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
    ],
    data: toBuf(new Uint8Array([3])),
  });
}

export function voidIx(authority: PublicKey, market: PublicKey) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: market, isSigner: false, isWritable: true },
    ],
    data: toBuf(new Uint8Array([4])),
  });
}

/** Prepend to every transaction so it lands under devnet load. */
export function priorityIxs(microLamports = 20_000, units = 200_000) {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
  ];
}

/** Decode a program instruction (for indexing bets from confirmed transactions). */
export function decodeIx(data: Uint8Array):
  | { kind: "create"; id: string; endTs: number; question: string }
  | { kind: "bet"; side: Side; lamports: number }
  | { kind: "resolve"; outcome: Side }
  | { kind: "claim" }
  | { kind: "void" }
  | null {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  switch (data[0]) {
    case 0: {
      const qlen = v.getUint16(17, true);
      return {
        kind: "create",
        id: v.getBigUint64(1, true).toString(),
        endTs: Number(v.getBigInt64(9, true)),
        question: new TextDecoder().decode(data.slice(19, 19 + qlen)),
      };
    }
    case 1:
      return { kind: "bet", side: data[1] === 1 ? "yes" : "no", lamports: Number(v.getBigUint64(2, true)) };
    case 2:
      return { kind: "resolve", outcome: data[1] === 1 ? "yes" : "no" };
    case 3:
      return { kind: "claim" };
    case 4:
      return { kind: "void" };
  }
  return null;
}

// ---------- math shown in UI ----------

export const sol = (lamports: number) => lamports / LAMPORTS;

/** Chance of YES, 0..1. */
export function chance(m: Pick<MarketAccount, "yesPool" | "noPool">) {
  const t = m.yesPool + m.noPool;
  return t === 0 ? 0.5 : m.yesPool / t;
}

/** Payout multiplier for a new bet of `lamports` on `side`, after fee. */
export function multiplier(m: Pick<MarketAccount, "yesPool" | "noPool">, side: Side, lamports = 0) {
  const pool = (side === "yes" ? m.yesPool : m.noPool) + lamports;
  const total = m.yesPool + m.noPool + lamports;
  return pool === 0 ? 0 : (total * (1 - FEE_BPS / 10_000)) / pool;
}

/** What a position can claim right now, in lamports (0 if nothing). */
export function claimable(m: MarketAccount, p: PositionAccount) {
  if (p.claimed) return 0;
  if (m.status === "void") return p.yes + p.no;
  if (m.status !== "resolved" || !m.outcome) return 0;
  const stake = m.outcome === "yes" ? p.yes : p.no;
  const win = m.outcome === "yes" ? m.yesPool : m.noPool;
  if (!stake || !win) return 0;
  const gross = Math.floor((stake * (m.yesPool + m.noPool)) / win);
  return gross - Math.floor((gross * FEE_BPS) / 10_000);
}

export function explainError(e: unknown): string {
  const s = String((e as Error)?.message ?? e);
  const m = s.match(/custom program error: 0x([0-9a-f]+)/i) ?? s.match(/"Custom":(\d+)/);
  if (m) {
    const code = m[0].includes("0x") ? parseInt(m[1], 16) : Number(m[1]);
    return ERRORS[code] ?? s;
  }
  return s;
}
