// Single data layer for the UI. Today it runs on in-memory mocks; when the Anchor program
// and packages/sdk land, implement `Backend` with RPC reads + wallet-signed transactions
// and flip NEXT_PUBLIC_BACKEND=chain. Pages and the admin panel only talk to this interface.

import { FEE, MAX_BET, markets as seed, total, type Market, type MarketStatus, type Side } from "./markets";

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
  kind: "mock" | "chain";
  getMarkets(): Promise<Market[]>;
  getConfig(): Promise<ProgramConfig>;
  getStats(): Promise<Stats>;
  updateConfig(patch: Partial<Omit<ProgramConfig, "admin">>): Promise<TxResult>;
  resolveMarket(id: string, outcome: Side): Promise<TxResult>;
  voidMarket(id: string): Promise<TxResult>;
  placeBet(id: string, side: Side, sol: number): Promise<TxResult>;
  createMarket(input: { question: string; closesIn: string; source: string }): Promise<TxResult>;
}

type Resolved = Market & { outcome?: Side | "void" };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fakeSig = () => Array.from({ length: 12 }, () => "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random() * 58)]).join("");

function createMockBackend(): Backend {
  let list: Resolved[] = seed.map((m) => ({ ...m }));
  let config: ProgramConfig = {
    admin: "BK4Tt9kZfazEs3DRzyygpDKP4mN7PyuWduUEJStUPRHc",
    treasury: "BK4Tt9kZfazEs3DRzyygpDKP4mN7PyuWduUEJStUPRHc",
    feeBps: FEE * 10000,
    maxBetSol: MAX_BET,
    paused: false,
  };
  const tx = async (fn: () => void): Promise<TxResult> => {
    await wait(700);
    fn();
    return { ok: true, signature: fakeSig() };
  };
  const setStatus = (id: string, status: MarketStatus, outcome?: Side | "void") => {
    list = list.map((m) => (m.id === id ? { ...m, status, outcome } : m));
  };

  return {
    kind: "mock",
    async getMarkets() {
      await wait(150);
      return list;
    },
    async getConfig() {
      await wait(100);
      return config;
    },
    async getStats() {
      await wait(100);
      const tvl = list.filter((m) => m.status !== "resolved").reduce((s, m) => s + total(m), 0);
      const done = list.filter((m) => m.status === "resolved");
      return {
        tvl,
        active: list.filter((m) => m.status === "active").length,
        awaiting: list.filter((m) => m.status === "awaiting").length,
        resolved: done.length,
        bettors: list.reduce((s, m) => s + m.bettors, 0),
        feesEarned: done.reduce((s, m) => s + total(m) * (config.feeBps / 20000), 0),
      };
    },
    updateConfig: (patch) => tx(() => (config = { ...config, ...patch })),
    resolveMarket: (id, outcome) => tx(() => setStatus(id, "resolved", outcome)),
    voidMarket: (id) => tx(() => setStatus(id, "resolved", "void")),
    placeBet: (id, side, sol) =>
      tx(() => {
        list = list.map((m) =>
          m.id === id ? { ...m, yesPool: m.yesPool + (side === "yes" ? sol : 0), noPool: m.noPool + (side === "no" ? sol : 0), bettors: m.bettors + 1 } : m,
        );
      }),
    createMarket: ({ question, closesIn, source }) =>
      tx(() => {
        list = [
          { id: `m-${Date.now()}`, question, closesIn, source, tag: "New", yesPool: 0, noPool: 0, bettors: 0, creator: "BK4T…PRHc", status: "active" },
          ...list,
        ];
      }),
  };
}

export const backend: Backend = createMockBackend();
