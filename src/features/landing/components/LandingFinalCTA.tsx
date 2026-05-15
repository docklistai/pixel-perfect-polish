import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { finalCtaBullets } from "../data/landingContent";

export function LandingFinalCTA() {
  return (
    <section className="bg-[#2f8c7b] py-20 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1fr_auto] lg:items-center lg:px-8">
        <h2 className="max-w-lg text-balance font-serif text-4xl leading-tight sm:text-5xl">
          Ready for a calmer rota week?
        </h2>
        <p className="max-w-xl text-pretty text-base leading-7 text-white/85">
          Start with the rota. Add staff, time, leave, and daily operations when you need them.
        </p>
        <Link
          to="/auth"
          className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#fbf7ee] px-6 py-3.5 text-sm font-semibold text-[#07171d] shadow-lg shadow-black/15 hover:bg-white"
        >
          Create your account <ArrowRight className="size-4" aria-hidden="true" />
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
