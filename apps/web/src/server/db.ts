import "server-only";
import { neon } from "@neondatabase/serverless";

export const hasDb = Boolean(process.env.DATABASE_URL);
export const sql = hasDb ? neon(process.env.DATABASE_URL!) : null;

let ready: Promise<unknown> | null = null;
/** Idempotent schema bootstrap, once per cold start. */
export function db() {
  if (!sql) return null;
  ready ??= Promise.all([
    sql`CREATE TABLE IF NOT EXISTS market_meta (
      market TEXT PRIMARY KEY,
      tag TEXT NOT NULL DEFAULT 'New',
      source TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    sql`CREATE TABLE IF NOT EXISTS events (
      signature TEXT NOT NULL,
      ix_index INT NOT NULL,
      kind TEXT NOT NULL,
      market TEXT NOT NULL,
      wallet TEXT NOT NULL,
      side TEXT,
      lamports BIGINT NOT NULL DEFAULT 0,
      slot BIGINT,
      block_time TIMESTAMPTZ,
      PRIMARY KEY (signature, ix_index)
    )`,
  ]).then(() =>
    Promise.all([
      sql`CREATE INDEX IF NOT EXISTS events_market ON events (market, block_time DESC)`,
      sql`CREATE INDEX IF NOT EXISTS events_wallet ON events (wallet, block_time DESC)`,
    ]),
  );
  return ready.then(() => sql);
}

export async function metaMap(): Promise<Record<string, { tag: string; source: string }>> {
  const q = await db();
  if (!q) return {};
  const rows = (await q`SELECT market, tag, source FROM market_meta`) as { market: string; tag: string; source: string }[];
  return Object.fromEntries(rows.map((r) => [r.market, { tag: r.tag, source: r.source }]));
}
