import Link from "next/link";
import { chance, getMarket, positions } from "@/lib/markets";

export default function PortfolioPage() {
  const won = positions.find((p) => p.claimable);
  const wonMarket = won && getMarket(won.marketId);
  const open = positions.filter((p) => !p.claimable);
  const atStake = open.reduce((s, p) => s + p.stake, 0);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-2.5 px-4 pt-4 sm:pt-8">
      <h1 className="mb-2 font-display text-[40px] font-extrabold leading-none tracking-tighter sm:text-6xl">Your bets</h1>

      {won && wonMarket && (
        <div className="flex flex-col gap-3.5 rounded-lg bg-flame p-5 text-ink">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold">You won</span>
              <span className="font-display text-[44px] font-extrabold leading-none tracking-tighter">{won.claimable!.toFixed(2)} SOL</span>
            </div>
            <span className="rounded-lg bg-ink px-2 py-1 font-mono text-xs text-flame">{(won.claimable! / won.stake).toFixed(2)}×</span>
          </div>
          <p className="text-[13px]">
            {wonMarket.question} · {won.side === "yes" ? "Yes" : "No"}
          </p>
          <Link href="/win" className="flex h-[52px] items-center justify-center rounded-md bg-ink text-base font-semibold text-white">
            Claim to wallet
          </Link>
        </div>
      )}

      <p className="mx-1 mt-2 text-xs text-muted">Open · {atStake.toFixed(2)} SOL at stake</p>
      {open.map((p) => {
        const m = getMarket(p.marketId)!;
        const yes = p.side === "yes";
        return (
          <Link key={p.marketId} href={`/market/${m.id}`} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3.5">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${yes ? "bg-yes-soft text-[#17A877]" : "bg-no-soft text-[#FF8A9C]"}`}
            >
              {yes ? "YES" : "NO"}
            </span>
            <span className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium leading-tight">{m.question}</span>
              <span className="font-mono text-[11px] text-muted">
                {p.stake.toFixed(2)} SOL · now {yes ? chance(m) : 100 - chance(m)}% · {m.closesIn}
              </span>
            </span>
          </Link>
        );
      })}
    </main>
  );
}
