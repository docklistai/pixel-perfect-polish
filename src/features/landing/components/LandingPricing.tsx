import { Check, Star } from "lucide-react";

type Tier = {
  name: string;
  price: string;
  priceSuffix?: string;
  cap: string;
  bullets: readonly string[];
  cta: string;
  ctaNote?: string;
  recommended?: boolean;
};

const tiers: readonly Tier[] = [
  {
    name: "Free",
    price: "£0",
    priceSuffix: "/mo",
    cap: "Up to 5 staff",
    bullets: [
      "Basic rota-focused workspace",
      "Week planning & publishing",
      "Open shifts & basic checks",
    ],
    cta: "Start free",
  },
  {
    name: "Core",
    price: "£39",
    priceSuffix: "/mo",
    cap: "Up to 25 staff",
    bullets: [
      "Everything in Free",
      "Pre-publish checks & coverage",
      "Leave, approved hours & staff records",
      "Handover notes & team updates",
    ],
    cta: "Choose Core",
  },
  {
    name: "Pro",
    price: "£79",
    priceSuffix: "/mo",
    cap: "Up to 50 staff",
    bullets: [
      "Everything in Core",
      "Advanced rota review & warnings",
      "Labour & coverage pressure insights",
      "AI manager support & drafting",
    ],
    cta: "Start 14-day Pro trial",
    ctaNote: "14-day full trial · no card",
    recommended: true,
  },
  {
    name: "Custom",
    price: "Let's talk",
    cap: "50+ staff or multi-site",
    bullets: ["Everything in Pro", "Larger teams & multiple venues", "Onboarding & priority support"],
    cta: "Talk to us",
  },
];

const valueLines = [
  {
    label: "Workspace pricing",
    body: "Pay for the workspace, not every staff name you add.",
  },
  {
    label: "Manager-led",
    body: "AI suggests. You confirm before anything publishes.",
  },
  {
    label: "Hospitality-native",
    body: "Built around how the floor actually runs the week.",
  },
] as const;

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="border-t border-[#0c1412]/10 bg-[var(--landing-cream)] py-24 text-[var(--landing-ink)] sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-end">
          <div>
            <p className="landing-section-eyebrow">Pricing</p>
            <h2 className="landing-section-title">
              Workspace pricing.
              <br />
              No per-seat <span className="italic text-[var(--landing-teal-deep)]">anxiety.</span>
            </h2>
          </div>
          <p className="max-w-md text-pretty text-[17px] leading-7 text-[#3f4744]">
            One workspace, one team, all the rota tools. Pricing is in beta — early access pricing
            will be confirmed before launch.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {tiers.map((t) => (
            <article
              key={t.name}
              className={`relative flex flex-col rounded-2xl border bg-[var(--landing-paper)] p-7 ${
                t.recommended
                  ? "border-[var(--landing-teal)]/50 ring-1 ring-[var(--landing-teal)]/30 shadow-[0_30px_80px_-40px_rgba(91,162,156,0.45)]"
                  : "border-[#0c1412]/12"
              }`}
            >
              {t.recommended && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--landing-teal-deep)] px-3 py-1 landing-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--landing-cream)]">
                  <Star className="size-3 fill-current" aria-hidden="true" />
                  Recommended
                </span>
              )}

              <p
                className={`landing-mono text-[10px] uppercase tracking-[0.18em] ${
                  t.recommended ? "text-[var(--landing-teal-deep)]" : "text-[#8c8273]"
                }`}
              >
                {t.name}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-serif text-[44px] font-medium leading-none tracking-[-0.025em] text-[var(--landing-ink)]">
                  {t.price}
                </span>
                {t.priceSuffix && (
                  <span className="text-[14px] text-[#8c8273]">{t.priceSuffix}</span>
                )}
              </div>
              <p
                className={`mt-1 text-[14px] ${
                  t.recommended ? "text-[var(--landing-teal-deep)]" : "text-[#5c645f]"
                }`}
              >
                {t.cap}
              </p>

              <ul className="mt-6 space-y-2.5 border-t border-dashed border-[#0c1412]/12 pt-6">
                {t.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 text-[13.5px] leading-6 text-[#3f4744]"
                  >
                    <Check
                      className="mt-1 size-3.5 shrink-0 text-[var(--landing-teal-deep)]"
                      aria-hidden="true"
                    />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
                <button
                  type="button"
                  className={`w-full rounded-lg px-4 py-3 text-[13px] font-semibold transition ${
                    t.recommended
                      ? "bg-[var(--landing-teal)] text-[var(--landing-ink)] hover:bg-[#6ab3ad]"
                      : "border border-[#0c1412]/15 bg-transparent text-[var(--landing-ink)] hover:bg-[#0c1412]/[0.04]"
                  }`}
                >
                  {t.cta}
                </button>
                {t.ctaNote && (
                  <p className="mt-3 text-center landing-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--landing-teal-deep)]">
                    {t.ctaNote}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-3xl text-center text-[15px] leading-7 text-[#3f4744]">
          Start on the{" "}
          <span className="font-semibold text-[var(--landing-ink)]">14-day full Pro trial</span> —
          then upgrade, stay on Core, or fall back to Free. No per-seat billing, ever.
        </p>

        <div className="mt-10 grid gap-4 border-t border-[#0c1412]/10 pt-8 sm:grid-cols-3">
          {valueLines.map((v) => (
            <div key={v.label}>
              <p className="landing-mono text-[10px] uppercase tracking-[0.18em] text-[var(--landing-teal-deep)]">
                {v.label}
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[#3f4744]">{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
