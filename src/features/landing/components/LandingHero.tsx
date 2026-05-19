import { Link } from "@tanstack/react-router";
import { ArrowRight, CirclePlay } from "lucide-react";
import { landingImages } from "../data/landingContent";

export function LandingHero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[600px] items-end overflow-hidden bg-[var(--landing-ink)] pb-16 pt-24 text-[var(--landing-cream)] sm:min-h-[760px] sm:pb-24 lg:min-h-[900px]"
    >
      <img
        src={landingImages.hero}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover object-[64%_44%] contrast-110 saturate-105"
        fetchPriority="high"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(55%_75%_at_22%_58%,rgba(12,20,18,0.72),transparent_65%),radial-gradient(110%_70%_at_82%_32%,rgba(91,162,156,0.12),transparent_55%),linear-gradient(98deg,rgba(12,20,18,0.97)_0%,rgba(12,20,18,0.82)_22%,rgba(12,20,18,0.34)_50%,rgba(12,20,18,0.14)_72%,rgba(12,20,18,0.5)_100%),linear-gradient(180deg,rgba(12,20,18,0.45)_0%,rgba(12,20,18,0.2)_28%,rgba(12,20,18,0.55)_70%,rgba(12,20,18,0.96)_100%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--landing-teal)]/35 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-[780px]">
          <span className="landing-mono inline-flex items-center gap-2 rounded-full border border-[var(--landing-teal)]/35 bg-[var(--landing-teal)]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--landing-teal)]">
            <span className="size-1.5 rounded-full bg-[var(--landing-teal)] shadow-[0_0_0_3px_rgba(91,162,156,0.18)]" />
            Built for hospitality rota teams
          </span>

          <h1
            aria-label="The rota, rebuilt."
            className="mt-9 text-balance font-serif text-[clamp(4rem,9.4vw,9.5rem)] font-light leading-[0.92] tracking-[-0.045em] text-[var(--landing-cream)] [text-shadow:0_1px_40px_rgba(0,0,0,0.4)] before:mb-6 before:block before:h-px before:w-12 before:bg-gradient-to-r before:from-[var(--landing-teal)]/70 before:to-transparent"
          >
            The rota,
            <br />
            <span className="italic text-[var(--landing-teal)]">rebuilt.</span>
          </h1>

          <p className="mt-10 max-w-[480px] text-pretty text-[17.5px] leading-7 text-[var(--landing-cream)]/82">
            Build the week, check coverage, handle staff changes, and publish a rota your team can
            trust.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="group inline-flex items-center justify-center gap-3 rounded-lg bg-[var(--landing-teal)] px-6 py-3.5 text-sm font-semibold text-[var(--landing-ink)] transition hover:bg-[#6ab3ad]"
            >
              Get started
              <ArrowRight
                className="size-4 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-3 rounded-lg border border-[var(--landing-cream)]/20 bg-black/10 px-6 py-3.5 text-sm font-semibold text-[var(--landing-cream)] backdrop-blur-sm transition hover:border-[var(--landing-cream)]/35 hover:bg-white/10"
            >
              <CirclePlay className="size-4" aria-hidden="true" />
              See how it works
            </a>
          </div>

          <div className="landing-mono mt-12 flex max-w-[680px] flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.18em] text-[var(--landing-cream)]/50">
            <span>Built for hospitality teams</span>
            <span>Scheduling first</span>
            <span>Made in Scotland</span>
          </div>
        </div>
      </div>
    </section>
  );
}
