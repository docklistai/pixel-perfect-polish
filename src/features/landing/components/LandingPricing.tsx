import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { LandingPricingTier } from "../types";
import { pricingTiers } from "../data/landingContent";

export function LandingPricing() {
  return (
    <section id="pricing" className="bg-[#f5efe2] py-16 text-[#07171d] sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-[#2f8c7b]">Pricing</p>
          <h2 className="mt-4 text-balance font-serif text-4xl leading-tight sm:text-5xl">
            Simple, flat workspace pricing.
          </h2>
          <p className="mt-5 text-pretty text-base leading-7 text-[#526064]">
            All plans include the core Docklist workspace. Higher plans unlock more team capacity
            and smarter scheduling tools.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl rounded-xl border border-[#2f8c7b]/25 bg-[#dff3ec] px-6 py-4 text-center">
          <p className="font-semibold text-[#1f6f61]">
            Start with a 14-day full Pro trial. No credit card required.
          </p>
          <p className="mt-1 text-sm leading-6 text-[#2d6258]">
            After your trial, continue on Pro, upgrade, or fall back to Free.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pricingTiers.map((tier) => (
            <PricingTierCard key={tier.id} tier={tier} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTierCard({ tier }: { tier: LandingPricingTier }) {
  const isRecommended = !!tier.recommended;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border shadow-sm transition ${
        isRecommended
          ? "border-[#07171d] bg-[#07171d] text-[#f5efe2] shadow-[0_30px_60px_-20px_rgba(7,23,29,0.4)]"
          : "border-[#07171d]/10 bg-white hover:border-[#2f8c7b]/30 hover:shadow-md"
      }`}
    >
      {isRecommended && tier.badge && (
        <div className="bg-[#2f8c7b] px-6 py-2.5 text-center text-xs font-semibold text-white">
          {tier.badge}
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <div>
          <p
            className={`text-sm font-semibold ${
              isRecommended ? "text-[#56b8a3]" : "text-[#2f8c7b]"
            }`}
          >
            {tier.name}
          </p>
          <div className="mt-3 flex items-end gap-1">
            <span className="font-serif text-4xl leading-none">{tier.price}</span>
            {tier.period && (
              <span
                className={`mb-0.5 text-sm ${isRecommended ? "text-[#9fb2b4]" : "text-[#667275]"}`}
              >
                {tier.period}
              </span>
            )}
          </div>
          <p
            className={`mt-1.5 text-xs font-semibold ${
              isRecommended ? "text-[#9fb2b4]" : "text-[#667275]"
            }`}
          >
            {tier.staffCap}
          </p>
          <p
            className={`mt-3 text-sm leading-6 ${
              isRecommended ? "text-[#b8c4c5]" : "text-[#526064]"
            }`}
          >
            {tier.description}
          </p>
        </div>

        <ul
          className={`mt-5 flex-1 space-y-2.5 border-t pt-5 text-sm ${
            isRecommended ? "border-white/10" : "border-[#07171d]/10"
          }`}
        >
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <CheckCircle2
                className={`mt-0.5 size-4 shrink-0 ${
                  isRecommended ? "text-[#56b8a3]" : "text-[#2f8c7b]"
                }`}
                aria-hidden="true"
              />
              <span className={isRecommended ? "text-[#d8d0bd]" : "text-[#07171d]"}>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7">
          {tier.id === "custom" ? (
            <a
              href={tier.ctaHref}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#07171d]/20 px-5 py-3 text-sm font-semibold text-[#07171d] transition hover:-translate-y-0.5 hover:border-[#07171d]/40 hover:shadow-sm"
            >
              {tier.cta}
            </a>
          ) : (
            <Link
              to="/auth"
              className={`group flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
                isRecommended
                  ? "bg-[#2f8c7b] text-white shadow-[0_14px_30px_-10px_rgba(47,140,123,0.5)] hover:bg-[#277768]"
                  : "bg-[#07171d] text-[#f5efe2] hover:bg-[#0d2832]"
              }`}
            >
              {tier.cta}
              <ArrowRight
                className="size-4 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
