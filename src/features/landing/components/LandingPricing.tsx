import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { pricingFeatures } from "../data/landingContent";

export function LandingPricing() {
  return (
    <section id="pricing" className="bg-[#f5efe2] py-20 text-[#07171d] sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-[#2f8c7b]">Pricing</p>
          <h2 className="mt-4 text-balance font-serif text-4xl leading-tight sm:text-5xl">
            Simple early access for hospitality teams.
          </h2>
          <p className="mt-5 text-pretty text-base leading-7 text-[#526064]">
            One plan, built around scheduling first. Start with the rota, then add the operational
            pieces when you need them.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl overflow-hidden rounded-2xl border border-[#07171d]/10 bg-white shadow-[0_40px_80px_-30px_rgba(7,23,29,0.25)] ring-1 ring-black/[0.03] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-[#07171d]/10 bg-[#fbf7ee] p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#2f8c7b]">DocklistAI</span>
              <span className="rounded-full bg-[#eadac0] px-3 py-1 text-xs font-semibold text-[#765d36]">
                Early access
              </span>
            </div>

            <h3 className="mt-6 font-serif text-5xl">Core</h3>
            <p className="mt-4 max-w-md text-base leading-7 text-[#526064]">
              For small hospitality teams that need clearer rotas, staff visibility, and fewer
              weekly surprises.
            </p>

            <div className="mt-7 flex gap-4 rounded-lg border border-dashed border-[#07171d]/15 bg-white p-4">
              <Clock3 className="mt-1 size-5 shrink-0 text-[#2f8c7b]" aria-hidden="true" />
              <div>
                <p className="font-semibold">Pricing in beta</p>
                <p className="mt-1 text-sm leading-6 text-[#526064]">
                  Early access pricing will be confirmed before launch.
                </p>
              </div>
            </div>

            <Link
              to="/auth"
              className="group mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#2f8c7b] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-10px_rgba(47,140,123,0.55)] transition hover:-translate-y-0.5 hover:bg-[#277768]"
            >
              Get started
              <ArrowRight
                className="size-4 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-sm font-semibold text-[#667275]">What's included</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {pricingFeatures.map((feature) => (
                <div key={feature} className="flex gap-3">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-[#2f8c7b]"
                    aria-hidden="true"
                  />
                  <span className="font-semibold">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-lg border border-[#07171d]/10 bg-[#fbf7ee] p-5">
              <p className="font-serif text-2xl">Running a group of venues?</p>
              <p className="mt-2 text-sm leading-6 text-[#526064]">
                Use early access to shape the rota workflow before wider rollout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
