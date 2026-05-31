export function LandingControlRoom() {
  return (
    <section className="relative bg-[var(--landing-ink)] py-24 text-[var(--landing-cream)] sm:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--landing-teal)]/30 to-transparent" />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="landing-mono inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-[var(--landing-teal)] before:h-px before:w-9 before:bg-[var(--landing-teal)]/70 before:content-['']">
          The manager workspace
        </p>
        <h2 className="mt-7 text-balance font-serif text-[clamp(2.5rem,5.5vw,4.75rem)] font-light leading-[0.98] tracking-[-0.035em]">
          A control room for the{" "}
          <span className="italic text-[var(--landing-teal)]">week ahead.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-2xl text-pretty text-[17px] leading-8 text-[var(--landing-cream)]/68">
          Not a screen to learn — a calm view of the things that decide your week. The draft rota,
          what&apos;s left before publishing, where the pressure sits, and what&apos;s worth a second look.
        </p>
      </div>
    </section>
  );
}
