const venues = ["Cafés", "Pubs", "Restaurants", "Inns", "Small hotels", "Independent teams"];

const pillars = ["Scheduling-first", "Workspace pricing", "Manager-led AI"];

export function LandingLogoStrip() {
  return (
    <section className="bg-[var(--landing-paper)] py-24 text-[var(--landing-ink)] sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="landing-section-eyebrow">Who it&apos;s for</p>
        <h2 className="landing-section-title mt-5 max-w-3xl">
          Built for the teams who actually{" "}
          <span className="italic text-[var(--landing-teal-deep)]">run the floor.</span>
        </h2>

        <p className="landing-mono mt-10 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--landing-teal-deep)]">
          <span className="size-1.5 rounded-full bg-[var(--landing-teal-deep)]" />
          Made in Scotland
        </p>

        <div className="mt-10">
          <p className="landing-mono inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-[var(--landing-teal-deep)] before:h-px before:w-9 before:bg-[var(--landing-teal-deep)]/70 before:content-['']">
            Made for
          </p>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {venues.map((v) => (
              <li
                key={v}
                className="rounded-full border border-[#0c1412]/15 bg-[var(--landing-cream)] px-4 py-2 text-[13px] font-medium text-[var(--landing-ink)]"
              >
                {v}
              </li>
            ))}
          </ul>
        </div>

        <div className="landing-mono mt-12 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-[#0c1412]/10 pt-7 text-[10px] uppercase tracking-[0.18em] text-[#5c645f]">
          {pillars.map((p) => (
            <span key={p} className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--landing-teal-deep)]" />
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
