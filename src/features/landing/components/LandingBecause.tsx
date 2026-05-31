import { landingImages } from "../data/landingContent";

export function LandingBecause() {
  return (
    <section className="border-t border-white/5 bg-[var(--landing-ink)] py-20 text-[var(--landing-cream)] sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:px-8">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg lg:aspect-[4/5]">
          <img
            src={landingImages.because}
            alt=""
            className="absolute inset-0 size-full object-cover brightness-[0.7] saturate-[0.9]"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--landing-ink)] via-[var(--landing-ink)]/30 to-transparent" />
        </div>
        <div>
          <p className="landing-mono inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-[var(--landing-teal)] before:h-px before:w-9 before:bg-[var(--landing-teal)]/70 before:content-['']">
            Origin
          </p>
          <h2 className="mt-6 text-balance font-serif text-[clamp(2rem,3.6vw,3rem)] font-light leading-tight tracking-[-0.025em]">
            Made in <span className="italic text-[var(--landing-teal)]">Scotland</span> — built from
            real hospitality rota problems.
          </h2>
          <p className="mt-5 max-w-md text-pretty text-[15.5px] leading-7 text-[var(--landing-cream)]/65">
            DocklistAI was shaped on the floor, not at a desk. Every surface earns its place by
            making a manager&apos;s Monday calmer.
          </p>
        </div>
      </div>
    </section>
  );
}
