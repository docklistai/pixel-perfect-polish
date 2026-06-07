import landingHeroManagerWriting from "@/assets/landing/landing-hero-manager-writing.png";
import { managerPreviewUrl } from "../data/landingContent";

const heroCues = ["Draft stays private", "Manager confirms", "Staff see published rota"] as const;

export function LandingHero() {
  return (
    <section
      id="top"
      className="landing-hero relative isolate min-h-[760px] overflow-hidden bg-[var(--landing-ink)] pb-16 pt-24 text-[var(--landing-cream)] sm:pb-20 sm:pt-32 lg:min-h-[900px] lg:pb-24"
    >
      <img
        src={landingHeroManagerWriting}
        alt=""
        aria-hidden="true"
        className="landing-hero-photo absolute inset-0 z-0 size-full object-cover object-[68%_48%]"
        decoding="async"
        fetchPriority="high"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-[radial-gradient(42%_50%_at_78%_42%,rgba(205,150,75,0.1),transparent_62%),linear-gradient(98deg,rgba(9,12,11,0.98)_0%,rgba(13,17,15,0.94)_30%,rgba(13,17,15,0.6)_54%,rgba(13,17,15,0.16)_76%,rgba(13,17,15,0.48)_100%),linear-gradient(180deg,rgba(8,11,10,0.28)_0%,rgba(8,11,10,0.08)_38%,rgba(8,11,10,0.78)_100%)]"
      />
      <div aria-hidden="true" className="landing-hero-grain absolute inset-0 z-20" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(17,23,20,0) 30%, rgba(246,241,232,0.04) 70%, rgba(246,241,232,0.18) 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 z-20 h-px bg-gradient-to-r from-transparent via-[rgba(201,149,77,.32)] to-transparent" />

      {/* Scroll cue */}
      <a
        href="#rhythm"
        aria-label="Scroll to the weekly rhythm"
        className="landing-mono group absolute bottom-6 right-6 z-30 hidden items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--landing-cream-dim)] transition-colors hover:text-[#d9ad70] lg:inline-flex"
      >
        <span>Scroll</span>
        <span
          aria-hidden="true"
          className="relative grid size-7 place-items-center rounded-full border"
          style={{ borderColor: "rgba(201,149,77,.35)" }}
        >
          <svg
            className="size-3 text-[#d9ad70] motion-safe:animate-bounce"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </a>

      <div className="relative z-30 mx-auto flex min-h-[calc(100dvh-10rem)] max-w-[1240px] items-center px-6 lg:min-h-[calc(100dvh-12rem)] lg:px-10">
        <div className="w-full py-10 sm:py-14 lg:py-16">
          <div className="max-w-[760px]">
            <p
              className="landing-hero-step landing-hero-step-eyebrow landing-mono inline-flex border-y py-2 text-[11px] font-medium uppercase text-[#d9ad70]"
              style={{ borderColor: "rgba(201,149,77,.26)" }}
            >
              FOR THE PERSON HOLDING THE WEEK TOGETHER BEFORE SERVICE
            </p>

            <h1
              className="mt-8 text-balance font-sans font-extrabold text-[var(--landing-cream)]"
              style={{
                fontSize: "clamp(64px,8.4vw,132px)",
                lineHeight: "0.92",
                letterSpacing: "0",
                textShadow: "0 4px 34px rgba(8,18,32,.6)",
              }}
            >
              <span className="landing-hero-step landing-hero-step-title block">The rota,</span>
              <span className="landing-hero-step landing-hero-step-rebuilt landing-it mt-2 block text-[#d9ad70] sm:mt-3">
                rebuilt.
              </span>
            </h1>

            <p className="landing-hero-step landing-hero-step-copy mt-8 max-w-[560px] text-pretty text-[18px] font-medium leading-[1.62] text-[var(--landing-cream-dim)]">
              Scheduling-first hospitality software for building the week, checking pressure, and
              publishing only when the manager is ready.
            </p>

            <div className="landing-hero-step landing-hero-step-actions mt-9 flex flex-wrap gap-4">
              <a
                href="#pricing"
                className="group inline-flex items-center gap-2.5 rounded-xl bg-[#c9954d] px-6 py-3.5 text-[14px] font-bold text-[#111714] shadow-[0_1px_0_rgba(255,255,255,.32)_inset,0_20px_40px_-16px_rgba(201,149,77,.45)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a865] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3eee5]"
              >
                Get Pro early access
                <svg
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href={managerPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl border px-6 py-3.5 text-[14px] font-semibold text-[var(--landing-cream)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3eee5]"
                style={{
                  borderColor: "rgba(255,255,255,.24)",
                  background: "rgba(255,255,255,.05)",
                }}
              >
                <svg
                  className="size-4 text-[#d9ad70]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none" />
                </svg>
                Preview manager app
              </a>
            </div>

            <div
              className="landing-hero-step landing-hero-step-cues mt-10 flex max-w-[620px] flex-wrap gap-x-6 gap-y-3 border-t pt-6 text-[12px] text-[var(--landing-cream-dim)]"
              style={{ borderColor: "rgba(243,238,229,.1)" }}
            >
              {heroCues.map((cue) => (
                <span key={cue} className="inline-flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full border border-[#c9954d]/70 text-[10px] text-[#d9ad70]">
                    <svg
                      className="size-3"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M3.5 8.2 6.7 11.4 12.7 4.8" />
                    </svg>
                  </span>
                  {cue}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
