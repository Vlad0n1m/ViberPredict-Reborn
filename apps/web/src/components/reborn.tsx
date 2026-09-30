// The "Reborn" story: the judges dealt us the restart card, so this build rises from zero.

export function RebornBanner() {
  return (
    <section className="anim-rise relative overflow-hidden rounded-lg border border-line bg-[#120d0b] px-5 py-8 sm:px-10 sm:py-12">
      <div className="reborn-flare pointer-events-none absolute -right-20 -top-24 h-[420px] w-[420px] rounded-full bg-[#FF6A1A]/30 blur-[90px]" />
      <div className="reborn-flare pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-no/20 blur-[80px]" />
      <img src="/mark.svg" alt="" width={260} height={260} className="reborn-rise pointer-events-none absolute top-12 hidden opacity-90 xl:block xl:right-12 xl:w-[280px]" />

      <div className="relative flex max-w-[820px] flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
          <span className="rounded-md bg-flame px-2.5 py-1 text-ink">Build #2</span>
          <span className="rounded-md border border-line px-2.5 py-1 text-muted">Day 0 · Devnet</span>
          <span className="flex items-center gap-1.5 rounded-md border border-no/40 px-2.5 py-1 text-no">
            <span className="live-dot h-1.5 w-1.5 bg-no" />
            Restart card survived
          </span>
        </div>

        <h1 className="font-display font-black uppercase leading-[0.88] tracking-tight">
          <span className="block text-[26px] text-fg sm:text-[44px]">We are back</span>
          <span className="block text-[26px] text-fg sm:text-[44px]">to business!</span>
          <span className="reborn-title mt-2 block text-[58px] sm:text-[112px] lg:text-[136px]">Reborn</span>
        </h1>

        <p className="max-w-[580px] text-[15px] leading-relaxed text-[#CFC2B6] sm:text-lg">
          Mid-hackathon the judges pulled the cursed card on us: <b className="text-fg">wipe everything, start from zero.</b>{" "}
          So we did. New repo, new on-chain program, new database, new deploy — and a new face. Thanks, judges. The phoenix is up.
        </p>

        <div className="grid max-w-[560px] grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line font-mono text-xs">
          {[
            ["Program", "HqSA…Jqa"],
            ["Markets", "fresh"],
            ["Mood", "on fire"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 bg-[#120d0b] px-3 py-2.5">
              <span className="text-[10px] uppercase tracking-widest text-muted">{k}</span>
              <span className="text-flame">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
