// The "Reborn" story: the judges dealt us the restart card, so this build rises from zero.

export function Phoenix({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className={className}>
      <path d="M60 104c-18-6-30-22-26-42 3 10 9 15 15 16-8-14-6-34 11-52 0 16 8 24 14 30 4-6 4-14 2-22 12 10 18 26 14 42-2 8-6 14-12 18 6-2 12-6 14-12 2 14-12 24-32 22z" fill="#FF5A1F" />
      <path d="M60 100c-10-4-16-14-12-26 4 6 8 8 12 8-4-10 0-20 8-28 0 10 4 16 8 20 2 10-4 22-16 26z" fill="#D7FF3D" />
      <circle cx="60" cy="86" r="5" fill="#15161A" />
    </svg>
  );
}

export function RebornBadge() {
  return (
    <span className="reborn-glow flex items-center gap-1.5 rounded-full bg-no px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest text-ink sm:text-sm">
      <Phoenix size={16} />
      Reborn
    </span>
  );
}

export function RebornBanner() {
  return (
    <section className="anim-rise relative overflow-hidden rounded-[28px] bg-ink px-5 py-7 text-white sm:rounded-[36px] sm:px-10 sm:py-10">
      <div className="reborn-flare pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-no/40 blur-3xl" />
      <Phoenix size={180} className="reborn-rise absolute -right-6 bottom-0 opacity-90 sm:right-8" />
      <div className="relative flex max-w-[760px] flex-col gap-4">
        <span className="w-fit rounded-lg bg-lime px-2.5 py-1 font-mono text-xs font-bold text-ink">DAY 0 · BUILD #2 · DEVNET</span>
        <h1 className="reborn-title font-display text-[64px] font-extrabold leading-[0.85] tracking-tighter sm:text-[120px] lg:text-[148px]">
          REBORN
        </h1>
        <p className="max-w-[560px] text-base leading-relaxed text-[#d8d5cc] sm:text-lg">
          Halfway through the hackathon the judges dealt us the cursed card: <b className="text-white">wipe it all, start from scratch.</b>{" "}
          New repo, new on-chain program, new database, new deploy. Thanks, judges — we burned it down and rose again.
        </p>
        <p className="font-display text-xl font-bold text-lime sm:text-2xl">Like a phoenix. Place your bets.</p>
      </div>
    </section>
  );
}
