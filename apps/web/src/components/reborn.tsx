// The "Reborn" story, said once and quietly: the judges dealt the restart card, build #2 is live.

export function RebornBanner() {
  return (
    <section className="anim-rise grid gap-6 border-b border-line pb-8 pt-4 sm:pt-8 lg:grid-cols-[1fr_320px] lg:items-end">
      <div className="flex flex-col gap-4">
        <span className="flex items-center gap-2 font-mono text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-flame" />
          Build #2 · devnet
        </span>
        <h1 className="text-[56px] font-bold leading-[0.9] tracking-[-0.04em] sm:text-[96px]">Reborn.</h1>
        <p className="max-w-[520px] text-[15px] leading-relaxed text-muted sm:text-base">
          <span className="text-fg">We are back to business.</span> Mid-hackathon the judges dealt us the restart card — new repo,
          new on-chain program, new database. Same idea, rebuilt from zero.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-4 font-mono text-xs lg:grid-cols-1 lg:gap-2 lg:border-l lg:border-line lg:pl-6">
        {[
          ["program", "HqSA…Jqa"],
          ["network", "devnet"],
          ["settles in", "SOL"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 lg:flex-row lg:justify-between">
            <dt className="text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
