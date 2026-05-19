const venueTypes = [
  { label: "Harbor", sub: "Cafes" },
  { label: "The Coffee House", sub: "Coffee" },
  { label: "Pinewood", sub: "Inn" },
  { label: "The Waterside", sub: "Restaurant" },
  { label: "Brixton", sub: "Social" },
] as const;

export function LandingLogoStrip() {
  return (
    <section className="border-b border-[#0c1412]/10 bg-[var(--landing-paper)] py-16 text-[var(--landing-ink)] sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_2.4fr] lg:items-center">
          <p className="max-w-sm text-balance font-serif text-2xl leading-snug tracking-[-0.012em] before:mr-2 before:inline-block before:text-[var(--landing-teal-deep)] before:content-['—']">
            Built for hospitality teams across cafés, pubs, restaurants, and small hotels.
          </p>
          <div className="flex flex-wrap items-center justify-start gap-y-6 text-center lg:justify-between">
            {venueTypes.map((item) => (
              <div
                key={item.label}
                className="flex min-h-12 flex-1 basis-32 flex-col items-center justify-center border-[#0c1412]/10 px-4 font-serif text-[14.5px] font-medium uppercase tracking-[0.03em] text-[#736a5e] lg:border-r last:lg:border-r-0"
              >
                {item.label}
                <span className="landing-mono mt-1 text-[8.5px] tracking-[0.26em] text-[#a89c87]">
                  {item.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="landing-mono mt-10 text-center text-[10px] uppercase tracking-[0.22em] text-[#b1a693]">
          Venue types, not customer proof
        </p>
      </div>
    </section>
  );
}
