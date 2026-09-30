"use client";

// Admin data layer on the live program: reads via /api/markets, writes signed by the connected wallet.
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { ADMIN, FEE_BPS, TREASURY, resolveIx, voidIx } from "@reborn/sdk";
import { useMemo } from "react";
import { useSendTx } from "./chain-client";
import { MAX_BET, fromApi, total, type ApiMarket, type Market, type Side } from "./markets";

export type ProgramConfig = {
  admin: string;
  treasury: string;
  feeBps: number;
  maxBetSol: number;
  paused: boolean;
};

export type Stats = {
  tvl: number;
  active: number;
  awaiting: number;
  resolved: number;
  bettors: number;
  feesEarned: number;
};

export type TxResult = { ok: true; signature: string } | { ok: false; error: string };

export interface Backend {
  kind: "chain";
  getMarkets(): Promise<Market[]>;
  getConfig(): Promise<ProgramConfig>;
  getStats(): Promise<Stats>;
  updateConfig(patch: Partial<Omit<ProgramConfig, "admin">>): Promise<TxResult>;
  resolveMarket(id: string, outcome: Side): Promise<TxResult>;
  voidMarket(id: string): Promise<TxResult>;
}

const config: ProgramConfig = {
  admin: ADMIN.toBase58(),
  treasury: TREASURY.toBase58(),
  feeBps: FEE_BPS,
  maxBetSol: MAX_BET,
  paused: false,
};

async function markets() {
  const r = await fetch("/api/markets", { cache: "no-store" });
  return ((await r.json()).markets as ApiMarket[]).map((m) => fromApi(m));
}

export function useBackend(): Backend {
  const send = useSendTx();
  const { publicKey } = useWallet();
  return useMemo(() => {
    const tx = async (build: (me: PublicKey) => Parameters<typeof send>[0]): Promise<TxResult> => {
      try {
        if (!publicKey) throw new Error("Connect the admin wallet");
        return { ok: true, signature: await send(build(publicKey)) };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    };
    return {
      kind: "chain",
      getMarkets: markets,
      getConfig: async () => config,
      async getStats() {
        const list = await markets();
        const done = list.filter((m) => m.status === "resolved" && m.outcome !== "void");
        return {
          tvl: list.filter((m) => m.status !== "resolved").reduce((s, m) => s + total(m), 0),
          active: list.filter((m) => m.status === "active").length,
          awaiting: list.filter((m) => m.status === "awaiting").length,
          resolved: done.length,
          bettors: list.reduce((s, m) => s + m.bettors, 0),
          feesEarned: done.reduce((s, m) => s + total(m) * (FEE_BPS / 20000), 0),
        };
      },
      updateConfig: async () => ({ ok: false, error: "Fee, max bet and treasury are compiled into the program — redeploy to change them." }),
      resolveMarket: (id, outcome) => tx((me) => [resolveIx(me, new PublicKey(id), outcome)]),
      voidMarket: (id) => tx((me) => [voidIx(me, new PublicKey(id))]),
    };
  }, [publicKey, send]);
}
