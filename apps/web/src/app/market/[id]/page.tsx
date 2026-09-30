import Link from "next/link";
import { notFound } from "next/navigation";
import { BetPanel } from "@/components/bet-panel";
import { Sparkline } from "@/components/market";
import { chance, markets, sol, total, wallet } from "@/lib/markets";

export function generateStaticParams() {
  return markets.map((m) => ({ id: m.id }));
}

export default async function MarketPage({ params }: PageProps<"/market/[id]">) {
  const { id } = await params;
  const m = markets.find((x) => x.id === id);
  if (!m) notFound();

  const c = chance(m);
  const isCreator = m.creator === wallet.short || m.id === "mobile-wins";

  return (
    <main className="mx-auto grid w-full max-w-[1344px] gap-5 px-4 pt-2 sm:px-8 lg:grid-cols-[1fr_400px] lg:gap-6 lg:px-12">
      <div className="flex flex-col gap-5">
        <Link href="/" className="text-sm text-muted hover:text-fg">
          ← All markets
        </Link>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-[10px] bg-card px-2.5 py-1.5">{m.tag}</span>
          <span className="rounded-[10px] bg-card px-2.5 py-1.5 font-mono">
            {m.status === "active" ? `closes in ${m.closesIn}` : "betting closed"}
          </span>
          <span className="rounded-[10px] bg-card px-2.5 py-1.5 font-mono">by {m.creator}</span>
        </div>
        <h1 className="max-w-[860px] font-display text-[32px] font-extrabold leading-none tracking-tight sm:text-[56px]">{m.question}</h1>

        <div className="flex flex-col gap-4 rounded-lg bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-6xl font-extrabold leading-[0.9] tracking-tighter text-yes sm:text-[88px]">{c}%</span>
              <span className="text-muted">chance of Yes</span>
            </div>
            <div className="flex gap-7 text-[13px] text-muted">
              <div className="flex flex-col gap-0.5">
                Pool<span className="font-mono text-lg text-fg">{sol(total(m))} SOL</span>
              </div>
              <div className="flex flex-col gap-0.5">
                Bettors<span className="font-mono text-lg text-fg">{m.bettors}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                Fee<span className="font-mono text-lg text-fg">2%</span>
              </div>
            </div>
          </div>
          <div className="flex h-3.5 overflow-hidden rounded-md bg-no">
            <div className="anim-grow border-r-[3px] border-card bg-yes" style={{ width: `${c}%` }} />
          </div>
          <div className="flex justify-between font-mono text-[13px]">
            <span className="text-[#17A877]">Yes · {sol(m.yesPool)} SOL</span>
            <span className="text-[#FF8A9C]">No · {sol(m.noPool)} SOL</span>
          </div>
          {m.history && (
            <div className="rounded-md bg-ink p-3">
              <Sparkline points={m.history} className="h-32 w-full" />
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-2.5 rounded-lg bg-card p-5">
            <h2 className="text-[15px] font-semibold">How it resolves</h2>
            <p className="text-sm leading-relaxed text-muted">
              Resolves by the source below. The creator resolves after close; the admin steps in if the creator is silent. Nobody on the winning side → full refund.
            </p>
            <p className="text-sm text-yes">Source: {m.source}</p>
          </div>
          {isCreator && (
            <div className="flex flex-col gap-3.5 rounded-lg bg-ink p-5 text-white">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-flame">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB02E" strokeWidth="2" aria-hidden>
                  <path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />
                </svg>
                Your market · AI resolver
              </div>
              <p className="text-sm leading-relaxed text-[#4A3B34]">After close, AI checks the source and suggests an outcome. You confirm with one transaction.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="h-11 rounded-md border border-[#3A2C26] text-sm">
                  AI suggest
                </button>
                <button type="button" className="h-11 rounded-md bg-flame text-sm font-semibold text-ink">
                  Resolve
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="lg:pt-10">
        <BetPanel m={m} />
      </div>
    </main>
  );
}
