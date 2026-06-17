import { landingImages } from "../data/landingContent";

export function LandingFinalCTA() {
  return (
    <section
      className="relative overflow-hidden pb-[56px] pt-[130px] text-[var(--landing-cream)]"
      style={{ background: "var(--landing-ink)" }}
    >
      <img
        src={landingImages.moments}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover object-[50%_55%]"
        style={{ opacity: 0.62 }}
        loading="lazy"
        decoding="async"
      />
      {/* Bg gradients — cinematic vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(70% 60% at 86% 30%,rgba(14,165,162,.14),transparent 60%),
                     linear-gradient(90deg,rgba(17,23,20,.88),rgba(17,23,20,.42) 54%,rgba(17,23,20,.78)),
                     radial-gradient(50% 70% at 6% 100%,rgba(201,149,77,.22),transparent 70%),
                     radial-gradient(120% 90% at 50% 110%, rgba(8,11,10,0.85), transparent 60%),
                     radial-gradient(120% 90% at 50% -10%, rgba(8,11,10,0.7), transparent 60%)`,
        }}
      />
      {/* Grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1.2px)",
          backgroundSize: "3px 3px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(to right,transparent,rgba(201,149,77,.5) 50%,transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background: "linear-gradient(to right,transparent,rgba(201,149,77,.22) 50%,transparent)",
        }}
      />

      <div className="relative mx-auto max-w-[1240px] px-6 lg:px-10">
        <span className="landing-section-eyebrow on-dark mb-7 block">The week ahead</span>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <h2
            className="text-balance font-bold leading-[1.0] text-[var(--landing-cream)]"
            style={{ fontSize: "clamp(44px,5.6vw,80px)" }}
          >
            Build the week.
            <br />
            Run a better <span className="landing-it on-dark">service.</span>
          </h2>
          <div>
            <p className="max-w-[380px] text-pretty text-[17px] leading-[1.6] text-[var(--landing-cream-dim)]">
              Plan with clarity, check pressure before it hits the floor, and publish when the week
              is ready.
            </p>
            <div className="mt-[26px] flex flex-wrap gap-3">
              <a
                href="#pricing"
                className="group inline-flex items-center gap-2 rounded-[10px] bg-[#c9954d] px-5 py-3 text-[14px] font-semibold text-[#111714] shadow-[0_1px_0_rgba(255,255,255,.18)_inset] transition hover:-translate-y-px hover:bg-[#d6a865] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3eee5]"
              >
                Request beta access
                <svg
                  className="size-3.5 transition group-hover:translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <p
          className="mt-[72px] max-w-[780px] border-t pt-[32px] text-[clamp(18px,2vw,24px)] leading-[1.5] text-[var(--landing-cream-dim)]"
          style={{ borderColor: "rgba(255,255,255,.06)" }}
        >
          Draft changes stay private.{" "}
          <span className="text-[var(--landing-cream)]">Managers confirm before publishing.</span>{" "}
          Staff see the rota when it is ready. Built carefully{" "}
          <span className="landing-it on-dark" style={{ fontSize: "1em" }}>
            in Scotland
          </span>{" "}
          — for the hospitality teams who actually run the floor.
        </p>
      </div>
    </section>
  );
}
