import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { landingImages } from "../data/landingContent";

export function LandingHero() {
  return (
    <section
      id="top"
      className="relative min-h-dvh overflow-hidden bg-[#07171d] pt-16 text-[#f5efe2]"
    >
      <img
        src={landingImages.hero}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover object-center"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-[#07171d]/10" aria-hidden="true" />
      <div
        className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,#07171d_0%,rgba(7,23,29,0.92)_38%,rgba(7,23,29,0.42)_100%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#56b8a3]/30 bg-[#56b8a3]/12 px-4 py-2 text-xs font-semibold text-[#c9eee4]">
            <span className="size-2 rounded-full bg-[#56b8a3]" aria-hidden="true" />
            Built for hospitality rota teams
          </span>

          <h1 className="mt-8 max-w-4xl text-balance font-serif text-6xl leading-none text-[#f5efe2] sm:text-7xl lg:text-8xl">
            The rota, <span className="italic text-[#56b8a3]">rebuilt.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-[#d8d0bd] sm:text-xl">
            Build the week, check the pressure, and publish a rota your team can trust.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#56b8a3] px-6 py-3.5 text-sm font-semibold text-[#07171d] shadow-[0_18px_40px_-12px_rgba(86,184,163,0.55)] ring-1 ring-inset ring-white/15 transition hover:-translate-y-0.5 hover:bg-[#6cc7b4] hover:shadow-[0_22px_50px_-12px_rgba(86,184,163,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#56b8a3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07171d]"
            >
              Get started
              <ArrowRight
                className="size-4 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-[#f5efe2]/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-[#f5efe2] backdrop-blur-sm transition hover:border-[#f5efe2]/40 hover:bg-white/10"
            >
              See how it works
            </a>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 text-sm text-[#d8d0bd]/80">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#56b8a3]" aria-hidden="true" />
              No credit card required
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#56b8a3]" aria-hidden="true" />
              Built for hospitality teams
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#56b8a3]" aria-hidden="true" />
              Scheduling first
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
