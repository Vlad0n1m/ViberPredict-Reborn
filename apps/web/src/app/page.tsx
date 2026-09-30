"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClosingRow, MarketCard, Sparkline } from "@/components/market";
import { RebornBanner } from "@/components/reborn";
import { useMarket, useMarkets } from "@/lib/chain-client";
import { categories, chance, multiplier, sol, total, type Market } from "@/lib/markets";

export default function Home() {
  const [cat, setCat] = useState("Trending");
  const { markets } = useMarkets();
  const featuredId = useMemo(() => pickFeatured(markets)?.id, [markets]);
  const { market: featuredLive } = useMarket(featuredId);

  const live = (markets ?? []).filter((m) => m.status === "active");
  const featured = featuredLive ?? pickFeatured(markets);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 sm:px-8">
      <RebornBanner />

      <nav className="-mx-4 flex gap-5 overflow-x-auto px-4 text-sm [scrollbar-width:none] sm:mx-0 sm:px-0">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            aria-pressed={cat === c}
            className={`shrink-0 border-b pb-2 transition-colors duration-150 ${cat === c ? "border-flame text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {c}
          </button>
        ))}
      </nav>

      {!markets || !featured ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-72 animate-pulse rounded-xl bg-card" />
          <div className="h-72 animate-pulse rounded-xl bg-card" />
        </div>
      ) : cat !== "Trending" ? (
        <Filtered cat={cat} markets={markets} />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Featured m={featured} />
            <div className="flex min-w-0 flex-col rounded-xl bg-card p-5">
              <h2 className="mb-1 text-sm font-semibold">Closing soon</h2>
              <div className="flex flex-col divide-y divide-line">
                {[...live].sort((a, b) => a.endTs - b.endTs).slice(0, 6).map((m) => (
                  <ClosingRow key={m.id} m={m} />
                ))}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">All markets</h2>
              <span className="font-mono text-xs text-muted">{live.length} live</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...live].sort((a, b) => total(b) - total(a)).map((m, i) => (
                <MarketCard key={m.id} m={m} index={i} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Featured({ m }: { m: Market }) {
  const c = chance(m);
  const hist = m.history ?? [50, c];
  return (
    <Link href={`/market/${m.id}`} className="flex min-w-0 flex-col gap-6 rounded-xl bg-card p-5 transition-colors duration-150 hover:bg-ink sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="live-dot h-1.5 w-1.5 bg-no" />
          {m.tag} · live
        </span>
        <span>
          {sol(total(m), 3)} SOL · {m.bettors} bettors · {m.closesIn}
        </span>
      </div>
      <h2 className="max-w-[640px] text-[26px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[34px]">{m.question}</h2>
      <div className="grid grid-cols-1 items-end gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <span className="font-mono text-6xl font-medium leading-none tracking-tight">
            {c}
            <span className="text-2xl text-muted">%</span>
          </span>
          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <span className="flex h-11 items-center justify-between gap-4 rounded-lg bg-yes-soft px-4 text-yes">
              Yes <span className="font-mono text-xs">{multiplier(m, "yes").toFixed(2)}×</span>
            </span>
            <span className="flex h-11 items-center justify-between gap-4 rounded-lg bg-no-soft px-4 text-no">
              No <span className="font-mono text-xs">{multiplier(m, "no").toFixed(2)}×</span>
            </span>
          </div>
        </div>
        <Sparkline key={hist.length} points={hist} className="h-32 w-full" />
      </div>
    </Link>
  );
}

function pickFeatured(markets: Market[] | undefined) {
  const live = (markets ?? []).filter((m) => m.status === "active");
  const hack = live.filter((m) => m.tag === "Hackathon");
  return [...(hack.length ? hack : live)].sort((a, b) => total(b) - total(a))[0] ?? markets?.[0];
}

function Filtered({ cat, markets }: { cat: string; markets: Market[] }) {
  const list = cat === "New" ? [...markets].sort((a, b) => b.createdTs - a.createdTs) : markets.filter((m) => m.tag === cat);
  return (
    <section key={cat} className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{cat}</h2>
        <span className="font-mono text-xs text-muted">{list.length}</span>
      </div>
      {list.length === 0 ? (
        <div className="flex items-center justify-between rounded-xl bg-card p-5">
          <p className="text-sm text-muted">No {cat} markets yet.</p>
          <Link href="/create" className="text-sm font-semibold text-flame">
            Create one →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m, i) => (
            <MarketCard key={m.id} m={m} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
