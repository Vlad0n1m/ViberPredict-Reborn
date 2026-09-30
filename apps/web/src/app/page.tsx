"use client";

import { useState } from "react";
import Link from "next/link";
import { ClosingRow, MarketCard, Sparkline } from "@/components/market";
import { RebornBanner } from "@/components/reborn";
import { categories, chance, markets, multiplier, sol, total } from "@/lib/markets";

export default function Home() {
  const [cat, setCat] = useState("Trending");
  const featured = markets[0];
  const c = chance(featured);
  const hist = featured.history ?? [];
  const delta = hist.length > 1 ? hist[hist.length - 1] - hist[Math.max(0, hist.length - 8)] : 0;
  const hackathon = markets.filter((m) => m.tag === "Hackathon" && m.id !== featured.id && m.status === "active");
  const hackPool = hackathon.reduce((s, m) => s + total(m), 0);
  const snow = markets.find((m) => m.id === "astana-snow")!;
  const closing = ["pitch-over-2", "judges-seeker", "mobile-wins", "wallets-100"].map((id) => markets.find((m) => m.id === id)!);
  const all = markets.filter((m) => m.status === "active" && m.tag !== "Hackathon").sort((a, b) => total(b) - total(a));

  return (
    <main className="mx-auto flex w-full max-w-[1344px] flex-col gap-7 px-4 sm:px-8 lg:px-12">
      <RebornBanner />
      <nav className="-mx-4 flex gap-1.5 overflow-x-auto border-b border-line px-4 pb-3 text-sm font-medium [scrollbar-width:none] sm:mx-0 sm:px-0 sm:text-[15px]">
        {categories.map((c, i) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            aria-pressed={cat === c}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 transition-colors duration-200 ${cat === c ? "bg-flame text-ink" : "bg-card hover:bg-card sm:bg-transparent"}`}
          >
            {i === 0 && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFB02E" strokeWidth="2.5" aria-hidden>
                <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
              </svg>
            )}
            {c === "Hackathon" && <span className="live-dot h-1.5 w-1.5 bg-no" />}
            {c === "Hackathon" ? "Hackathon live" : c}
          </button>
        ))}
      </nav>

      {cat !== "Trending" ? (
        <Filtered cat={cat} />
      ) : (
      <>
      <section className="grid gap-4 lg:grid-cols-3">
        <Link
          href={`/market/${featured.id}`}
          className="flex flex-col gap-6 overflow-hidden rounded-lg bg-ink p-5 text-white sm:rounded-lg sm:p-8 lg:col-span-2 lg:flex-row"
        >
          <div className="flex flex-col gap-4 lg:w-[400px] lg:shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-no px-2.5 py-1 text-xs font-bold text-ink">
                <span className="live-dot h-1.5 w-1.5 bg-ink" />
                LIVE
              </span>
              <span className="text-[13px] text-[#A8988C]">Featured · {featured.tag} · {featured.closesIn}</span>
            </div>
            <h2 className="font-display text-[28px] font-extrabold leading-[1.02] tracking-tight sm:text-[40px]">{featured.question}</h2>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-5xl font-extrabold leading-none tracking-tighter text-flame sm:text-[64px]">{c}%</span>
              <span className="text-sm text-[#A8988C]">chance</span>
              <span className="font-mono text-sm text-flame">▲ {delta} today</span>
            </div>
            <Sparkline points={hist} className="h-28 w-full lg:hidden" />
            <div className="mt-auto grid grid-cols-2 gap-2.5 font-semibold">
              <span className="flex h-14 items-center justify-between rounded-md bg-yes px-4 text-ink">
                Buy Yes <span className="font-mono text-[13px]">{multiplier(featured, "yes").toFixed(2)}×</span>
              </span>
              <span className="flex h-14 items-center justify-between rounded-md bg-no px-4 text-ink">
                Buy No <span className="font-mono text-[13px]">{multiplier(featured, "no").toFixed(2)}×</span>
              </span>
            </div>
          </div>
          <div className="hidden flex-1 flex-col gap-2.5 lg:flex">
            <div className="flex justify-between font-mono text-xs text-[#A8988C]">
              <span>{sol(total(featured))} SOL · {featured.bettors} bettors</span>
              <span>1H · 6H · <span className="text-white">ALL</span></span>
            </div>
            <Sparkline points={hist} className="w-full flex-1" />
            <div className="flex justify-between font-mono text-[11px] text-[#6F625A]">
              <span>17:00</span><span>17:40</span><span>18:20</span><span>now</span>
            </div>
          </div>
        </Link>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link href={`/market/${hackathon[0]?.id ?? featured.id}`} className="relative flex min-h-[220px] flex-col gap-3 overflow-hidden rounded-lg bg-flame p-6 sm:rounded-lg">
            <svg width="160" height="160" viewBox="0 0 160 160" className="absolute -right-8 -top-8" aria-hidden>
              <circle cx="80" cy="80" r="70" fill="none" stroke="#0C0A09" strokeWidth="2" strokeDasharray="6 8" />
              <circle cx="80" cy="80" r="40" fill="#0C0A09" />
            </svg>
            <span className="text-xs font-bold tracking-wide">EVENT · TONIGHT</span>
            <p className="max-w-[240px] font-display text-3xl font-extrabold leading-none tracking-tight">Pitch Night Astana</p>
            <div className="mt-auto flex flex-col gap-1.5 text-[13px]">
              {hackathon.slice(0, 2).map((m) => (
                <div key={m.id} className="flex justify-between gap-4">
                  <span className="truncate">{m.question}</span>
                  <span className="font-mono font-medium">{chance(m)}%</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold">
                <span>{hackathon.length + 1} markets →</span>
                <span className="font-mono">{sol(hackPool + total(featured), 1)} SOL</span>
              </div>
            </div>
          </Link>
          <Link href={`/market/${snow.id}`} className="relative flex min-h-[170px] flex-col gap-2 overflow-hidden rounded-lg bg-yes px-6 py-5 text-white sm:rounded-lg">
            <svg width="140" height="140" viewBox="0 0 140 140" className="absolute -bottom-10 -right-5" aria-hidden>
              <path d="M70 10l12 40h40l-32 24 12 40-32-24-32 24 12-40-32-24h40z" fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="2" />
            </svg>
            <span className="text-xs font-bold tracking-wide text-flame">ASTANA · WEATHER</span>
            <p className="max-w-[250px] font-display text-2xl font-extrabold leading-tight tracking-tight">First snow before Oct 15?</p>
            <span className="mt-auto font-mono text-sm">{chance(snow)}% yes · {sol(total(snow), 1)} SOL</span>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Closing soon</h2>
          <span className="text-[13px] text-muted">Last chance to get in</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {closing.map((m) => (
            <ClosingRow key={m.id} m={m} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">All markets</h2>
          <span className="text-[13px] text-muted">Sorted by pool size</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {all.map((m, i) => (
            <MarketCard key={m.id} m={m} index={i} />
          ))}
        </div>
      </section>
      </>
      )}
    </main>
  );
}

function Filtered({ cat }: { cat: string }) {
  const list = cat === "New" ? [...markets].reverse() : markets.filter((m) => m.tag === cat);
  return (
    <section key={cat} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{cat}</h2>
        <span className="text-[13px] text-muted">
          {list.length} market{list.length === 1 ? "" : "s"}
        </span>
      </div>
      {list.length === 0 ? (
        <div className="anim-rise flex flex-col items-start gap-3 rounded-lg bg-card p-6">
          <p className="font-display text-xl font-bold">No {cat} markets yet.</p>
          <Link href="/create" className="rounded-md bg-flame px-4 py-2 text-sm font-semibold">
            Create the first one
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {list.map((m, i) => (
            <MarketCard key={m.id} m={m} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
