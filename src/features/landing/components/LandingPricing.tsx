const coreFeatures = [
  "Drag-and-drop week planning, splits and doubles",
  "Pre-publish checks — clashes, coverage, hours, leave",
  "Open shift management and cover requests",
  "Handover notes and shift context",
  "Roles, sections, contracted hours and availability",
] as const;

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="border-t border-[#0c1412]/10 bg-[var(--landing-cream)] py-24 text-[var(--landing-ink)] sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="landing-section-eyebrow">Pricing</p>
          <h2 className="landing-section-title">Pricing in beta.</h2>
          <p className="max-w-md text-pretty text-[17px] leading-7 text-[#526064]">
            Early access pricing will be confirmed before launch.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <article className="flex min-h-[360px] flex-col rounded-lg border border-[#0c1412]/10 bg-[var(--landing-paper)] p-8">
            <div className="landing-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--landing-teal-deep)]">
              <span className="size-1.5 rounded-full bg-[var(--landing-teal)]" />
              Core product
            </div>
            <h3 className="mt-4 font-serif text-4xl font-normal tracking-[-0.02em]">
              DocklistAI Core
            </h3>
            <p className="mt-2 max-w-sm text-[15px] leading-6 text-[#5c645f]">
              The rota and scheduling workspace for hospitality teams.
            </p>
            <ul className="mt-6 space-y-3 border-t border-dashed border-[#0c1412]/15 pt-6">
              {coreFeatures.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm leading-6 text-[#3f4744]">
                  <span className="mt-2 size-1.5 rounded-full bg-[var(--landing-teal-deep)]" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="landing-mono mt-auto flex flex-wrap justify-between gap-3 pt-8 text-[11px] uppercase tracking-[0.12em] text-[#8c8273]">
              <span>Early access pricing</span>
              <span>Confirmed before launch</span>
            </div>
          </article>

          <article className="flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#0f1816] to-[#0a100e] text-[var(--landing-cream)]">
            <div className="p-8 pb-0">
              <div className="landing-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--landing-teal)]">
                <span className="size-1.5 rounded-full bg-[var(--landing-teal)]" />
                Workspace session
              </div>
              <h3 className="mt-4 font-serif text-4xl font-light tracking-[-0.02em]">
                See the <span className="italic text-[var(--landing-teal)]">workspace.</span>
              </h3>
              <p className="mt-2 max-w-sm text-[14.5px] leading-6 text-[var(--landing-cream)]/60">
                A short session with the rota builder, pre-publish checks and shift management — in
                your context, when you request access.
              </p>
            </div>
            <div className="mx-8 my-8 grid min-h-[170px] place-items-center rounded-md border border-dashed border-[var(--landing-teal)]/30 bg-[radial-gradient(80%_60%_at_50%_50%,rgba(91,162,156,0.08),transparent_70%)]">
              <a
                href="#top"
                className="landing-mono inline-flex items-center gap-2 rounded-md border border-[var(--landing-teal)]/35 bg-[var(--landing-teal)]/10 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-[var(--landing-teal)] transition hover:bg-[var(--landing-teal)]/15"
              >
                Request access
              </a>
            </div>
            <div className="landing-mono mt-auto flex justify-between gap-3 px-8 pb-8 text-[10px] uppercase tracking-[0.14em] text-white/45">
              <span>Early access</span>
              <span>On request</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
