import { landingImages } from "../data/landingContent";
import { LandingPressureTimeline } from "./LandingPressureTimeline";

export function LandingWeekBeforeService() {
  return (
    <section
      id="service-pressure"
      className="relative scroll-mt-24 overflow-hidden border-b py-12 text-[var(--landing-cream)] sm:py-16 lg:py-20"
      style={{ background: "var(--landing-ink)", borderColor: "rgba(255,255,255,.08)" }}
    >
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="mb-8 grid gap-5 lg:grid-cols-[.56fr_.44fr] lg:items-end">
          <div>
            <span className="landing-section-eyebrow on-dark">The Week Before Service</span>
            <h2 className="landing-section-title on-dark max-w-[720px] text-balance">
              The rota is where the pressure shows up first.
            </h2>
          </div>
          <p className="max-w-[560px] text-pretty text-[15px] leading-[1.65] text-[var(--landing-cream-dim)] sm:text-[16px]">
            Sick calls, leave clashes, open shifts, and handovers do not arrive as neat modules.
            DocklistAI keeps them close to the week so the manager can decide before service.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr] lg:items-stretch">
          <div
            className="group relative flex min-h-[360px] flex-col justify-end overflow-hidden rounded-[18px] sm:min-h-[460px]"
            style={{
              background: "var(--landing-ink)",
              boxShadow: "0 34px 80px -40px rgba(0,0,0,.86)",
            }}
          >
            <img
              src={landingImages.because}
              alt="Hospitality chef at the pass"
              className="absolute inset-0 size-full object-cover object-[45%_58%] transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(17,23,20,0) 20%, rgba(17,23,20,0.5) 60%, rgba(17,23,20,0.92) 100%)",
              }}
            />
            <div className="relative z-10 p-6 text-[var(--landing-cream)] sm:p-8">
              <span className="landing-mono text-[11px] uppercase tracking-[0.15em] text-[#d9ad70]">
                Hospitality Reality
              </span>
              <p className="mt-3 max-w-[380px] text-pretty text-[22px] font-bold leading-[1.22] sm:text-[24px]">
                This is the week before service. Precise control, real pressure.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[13px] text-white/60">
                <span className="h-px w-6 bg-[#d9ad70]" />
                <span>The manager owns the floor.</span>
              </div>
            </div>
          </div>

          <LandingPressureTimeline />
        </div>
      </div>
    </section>
  );
}
