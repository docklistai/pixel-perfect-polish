import { Link } from "@tanstack/react-router";
import { ArrowRight, CirclePlay } from "lucide-react";

export function LandingFinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[var(--landing-ink)] py-24 text-[var(--landing-cream)] sm:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_88%_50%,rgba(91,162,156,0.16),transparent_60%),radial-gradient(50%_80%_at_8%_100%,rgba(91,162,156,0.08),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--landing-teal)]/35 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="landing-mono mb-8 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-[var(--landing-teal)] before:h-px before:w-9 before:bg-[var(--landing-teal)]/70 before:content-['']">
          The week ahead
        </p>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <h2 className="text-balance font-serif text-[clamp(3.5rem,7vw,6.75rem)] font-light leading-[0.94] tracking-[-0.038em]">
            Ready to rebuild
            <br />
            <span className="italic text-[var(--landing-teal)]">your rota?</span>
          </h2>
          <div>
            <p className="max-w-sm text-pretty text-[17px] leading-7 text-[var(--landing-cream)]/70">
              Spend less time on rotas. More time with your team, your guests, and the service you
              set out to run.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-[var(--landing-cream)]/20 bg-black/10 px-6 py-3.5 text-sm font-semibold text-[var(--landing-cream)] transition hover:bg-white/10"
              >
                <CirclePlay className="size-4" aria-hidden="true" />
                See how it works
              </a>
            </div>
          </div>
        </div>

        <p className="mt-20 max-w-3xl border-t border-white/10 pt-9 font-serif text-[clamp(1.25rem,2.2vw,1.75rem)] font-light italic leading-relaxed tracking-[-0.01em] text-[var(--landing-cream)]/65">
          A calmer rota week.{" "}
          <span className="text-[var(--landing-cream)]">A team that knows where it stands.</span> A
          service that begins on time. Built carefully, in Scotland — for the hospitality teams who
          actually run the floor.
        </p>
      </div>
    </section>
  );
}
