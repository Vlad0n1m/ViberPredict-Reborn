"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { backend, type ProgramConfig, type Stats, type TxResult } from "@/lib/backend";
import { chance, sol, total, type Market, type MarketStatus, type Side } from "@/lib/markets";

type Row = Market & { outcome?: Side | "void" };
type Filter = "all" | MarketStatus;

const statusStyle: Record<MarketStatus, { label: string; dot: string; chip: string }> = {
  active: { label: "Active", dot: "bg-[#22D39A]", chip: "bg-[#0F2A20] text-[#3BE3A5]" },
  awaiting: { label: "To resolve", dot: "bg-devnet", chip: "bg-[#2B2110] text-[#FFC53D]" },
  resolved: { label: "Resolved", dot: "bg-muted", chip: "bg-paper text-muted" },
};

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [config, setConfig] = useState<ProgramConfig | null>(null);
  const [draft, setDraft] = useState<ProgramConfig | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { publicKey } = useWallet();
  const me = publicKey?.toBase58();

  const load = useCallback(async () => {
    const [m, c, s] = await Promise.all([backend.getMarkets(), backend.getConfig(), backend.getStats()]);
    setRows(m);
    setConfig(c);
    setDraft((d) => d ?? c);
    setStats(s);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function run(key: string, label: string, fn: () => Promise<TxResult>) {
    setBusy(key);
    const r = await fn();
    setBusy(null);
    setToast(r.ok ? `${label} · tx ${r.signature.slice(0, 8)}…` : `Failed: ${r.error}`);
    await load();
  }

  const visible = useMemo(
    () =>
      rows.filter(
        (m) => (filter === "all" || m.status === filter) && m.question.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [rows, filter, query],
  );
  const queue = rows.filter((m) => m.status === "awaiting");
  const isAdmin = !!config && me === config.admin;
  const dirty = !!config && !!draft && JSON.stringify(config) !== JSON.stringify(draft);

  return (
    <main className="mx-auto flex w-full max-w-[1344px] flex-col gap-5 px-4 pt-4 sm:px-8 sm:pt-8 lg:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[40px] font-extrabold leading-none tracking-tighter sm:text-6xl">Admin</h1>
          <p className="font-mono text-xs text-muted">program HqSA…Jqa · devnet · admin {config ? `${config.admin.slice(0, 4)}…${config.admin.slice(-4)}` : "…"}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[13px] font-medium">
          <span className="flex items-center gap-2 rounded-md bg-card px-3.5 py-2">
            <span className={`live-dot h-2 w-2 ${backend.kind === "mock" ? "bg-devnet" : "bg-[#22D39A]"}`} />
            {backend.kind === "mock" ? "Mock backend" : "On-chain"}
          </span>
          <span className="flex items-center gap-2 rounded-md bg-card px-3.5 py-2">
            <span className={`live-dot h-2 w-2 ${config?.paused ? "bg-no" : "bg-[#22D39A]"}`} />
            {config?.paused ? "Program paused" : "Program live"}
          </span>
          <span className={`flex items-center gap-2 rounded-md px-3.5 py-2 ${isAdmin ? "bg-ink text-white" : "bg-no-soft text-[#FF8A9C]"}`}>
            {isAdmin ? `Signed in as admin · ${me!.slice(0, 4)}…${me!.slice(-4)}` : "Connect the admin wallet"}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Value locked" value={stats ? `${sol(stats.tvl, 1)} SOL` : "—"} />
        <Tile label="Active markets" value={stats ? String(stats.active) : "—"} />
        <Tile label="Awaiting resolution" value={stats ? String(stats.awaiting) : "—"} accent={!!stats?.awaiting} />
        <Tile label="Fees to treasury" value={stats ? `${sol(stats.feesEarned, 3)} SOL` : "—"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-3 rounded-lg bg-card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-extrabold tracking-tight">Resolution queue</h2>
            <span className="text-xs text-muted">closed markets waiting for an outcome</span>
          </div>
          {queue.length === 0 ? (
            <p className="rounded-md bg-paper px-4 py-6 text-center text-sm text-muted">Queue is clear.</p>
          ) : (
            queue.map((m) => (
              <div key={m.id} className="anim-rise flex flex-col gap-3 rounded-md bg-paper p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-[15px] font-medium leading-snug">{m.question}</span>
                  <span className="font-mono text-xs text-muted">
                    {chance(m)}% yes · {sol(total(m))} SOL · by {m.creator} · {m.source}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  <Btn busy={busy === `${m.id}-yes`} onClick={() => run(`${m.id}-yes`, "Resolved YES", () => backend.resolveMarket(m.id, "yes"))} className="bg-yes text-ink">
                    YES
                  </Btn>
                  <Btn busy={busy === `${m.id}-no`} onClick={() => run(`${m.id}-no`, "Resolved NO", () => backend.resolveMarket(m.id, "no"))} className="bg-no text-ink">
                    NO
                  </Btn>
                  <Btn busy={busy === `${m.id}-void`} onClick={() => run(`${m.id}-void`, "Voided, refunds open", () => backend.voidMarket(m.id))} className="border border-line bg-card">
                    Void
                  </Btn>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-lg bg-ink p-5 text-white">
          <h2 className="font-display text-xl font-extrabold tracking-tight">Program config</h2>
          {draft && (
            <>
              <Field label="Fee, basis points" hint={`${(draft.feeBps / 100).toFixed(2)}% — half to creator, half to treasury`}>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={draft.feeBps}
                  onChange={(e) => setDraft({ ...draft, feeBps: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl bg-[#241B17] px-3 font-mono outline-none focus:ring-2 focus:ring-flame"
                />
              </Field>
              <Field label="Max bet, SOL" hint="Per transaction cap">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={draft.maxBetSol}
                  onChange={(e) => setDraft({ ...draft, maxBetSol: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl bg-[#241B17] px-3 font-mono outline-none focus:ring-2 focus:ring-flame"
                />
              </Field>
              <Field label="Treasury" hint="Receives the treasury half of fees">
                <input
                  value={draft.treasury}
                  onChange={(e) => setDraft({ ...draft, treasury: e.target.value.trim() })}
                  className="h-11 w-full rounded-xl bg-[#241B17] px-3 font-mono text-xs outline-none focus:ring-2 focus:ring-flame"
                />
              </Field>
              <button
                type="button"
                role="switch"
                aria-checked={draft.paused}
                onClick={() => setDraft({ ...draft, paused: !draft.paused })}
                className="flex items-center justify-between rounded-md bg-[#241B17] px-4 py-3 text-left"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">Pause program</span>
                  <span className="text-xs text-[#A8988C]">Blocks new markets and bets. Claims stay open.</span>
                </span>
                <span className={`relative h-7 w-12 shrink-0 rounded-md transition-colors duration-200 ${draft.paused ? "bg-no" : "bg-[#3A2C26]"}`}>
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${draft.paused ? "translate-x-6" : "translate-x-1"}`} />
                </span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!dirty} onClick={() => setDraft(config)} className="h-11 rounded-md border border-[#3A2C26] text-sm disabled:opacity-40">
                  Reset
                </button>
                <Btn
                  busy={busy === "config"}
                  disabled={!dirty || !isAdmin}
                  onClick={() => run("config", "Config updated", () => backend.updateConfig(draft))}
                  className="bg-flame text-ink"
                >
                  Save on-chain
                </Btn>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight">All markets</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-9 w-40 rounded-md bg-paper px-3.5 text-sm outline-none focus:ring-2 focus:ring-yes"
            />
            {(["all", "active", "awaiting", "resolved"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`h-9 rounded-md px-3.5 text-sm transition-colors duration-200 ${filter === f ? "bg-flame text-ink" : "bg-paper"}`}
              >
                {f === "all" ? "All" : statusStyle[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-[1fr_120px_110px_80px_110px] gap-4 border-b border-line px-3 pb-2 text-xs text-muted md:grid">
          <span>Market</span>
          <span>Status</span>
          <span className="text-right">Pool</span>
          <span className="text-right">Yes</span>
          <span className="text-right">Action</span>
        </div>
        {visible.map((m, i) => {
          const st = statusStyle[m.status];
          return (
            <div
              key={m.id}
              style={{ animationDelay: `${i * 30}ms` }}
              className="anim-rise grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-md px-3 py-3 hover:bg-paper md:grid-cols-[1fr_120px_110px_80px_110px]"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium leading-snug">{m.question}</span>
                <span className="font-mono text-[11px] text-muted">
                  {m.tag} · {m.bettors} bettors · closes {m.closesIn}
                  {m.outcome && ` · outcome ${m.outcome.toUpperCase()}`}
                </span>
              </span>
              <span className={`flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${st.chip}`}>
                <span className={`${m.status === "resolved" ? "" : "live-dot"} h-1.5 w-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
              <span className="font-mono text-sm md:text-right">{sol(total(m))} SOL</span>
              <span className="text-right font-mono text-sm text-[#17A877]">{chance(m)}%</span>
              <span className="col-span-2 flex justify-end md:col-span-1">
                {m.status !== "resolved" ? (
                  <Btn
                    busy={busy === `${m.id}-void`}
                    onClick={() => run(`${m.id}-void`, "Voided, refunds open", () => backend.voidMarket(m.id))}
                    className="h-9 border border-line bg-card px-3 text-xs"
                  >
                    Void
                  </Btn>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </span>
            </div>
          );
        })}
        {visible.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Nothing matches.</p>}
      </section>

      {toast && (
        <div className="anim-rise fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-md bg-ink px-4 py-3 text-sm text-white shadow-lg md:bottom-8">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-flame" />
          {toast}
        </div>
      )}
    </main>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`anim-rise flex flex-col gap-1 rounded-lg p-4 sm:p-5 ${accent ? "bg-devnet" : "bg-card"}`}>
      <span className={`text-xs ${accent ? "" : "text-muted"}`}>{label}</span>
      <span className="font-display text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">{value}</span>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-[#A8988C]">{label}</span>
      {children}
      <span className="text-[11px] text-[#6F625A]">{hint}</span>
    </label>
  );
}

function Btn({
  busy,
  disabled,
  onClick,
  className = "",
  children,
}: {
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-transform duration-150 active:scale-[0.97] disabled:opacity-40 ${className}`}
    >
      {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
