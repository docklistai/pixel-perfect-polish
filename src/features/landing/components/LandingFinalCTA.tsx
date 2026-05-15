import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { finalCtaBullets } from "../data/landingContent";

export function LandingFinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#2f8c7b] via-[#2c8474] to-[#1f6b5e] py-20 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-32 size-[32rem] rounded-full bg-[#07171d]/30 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1fr_auto] lg:items-center lg:px-8">
        <h2 className="max-w-lg text-balance font-serif text-4xl leading-tight sm:text-5xl">
          Ready for a calmer rota week?
        </h2>
        <p className="max-w-xl text-pretty text-base leading-7 text-white/85">
          Start with the rota. Add staff, time, leave, and daily operations when you need them.
        </p>
        <Link
          to="/auth"
          className="group inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#fbf7ee] px-6 py-3.5 text-sm font-semibold text-[#07171d] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-black/5 transition hover:-translate-y-0.5 hover:bg-white"
        >
          Create your account
          <ArrowRight
            className="size-4 transition group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-wrap gap-4 px-4 text-sm text-white/80 sm:px-6 lg:px-8">
        {finalCtaBullets.map((bullet) => (
          <span key={bullet}>{bullet}</span>
        ))}
      </div>
    </section>
  );
}
