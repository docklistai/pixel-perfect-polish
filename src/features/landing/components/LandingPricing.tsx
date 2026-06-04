import { Check } from "lucide-react";
import { pricingNotes } from "../data/landingContent";

const proFeatures = [
  "Pre-publish checks and leave clash review",
  "Coverage pressure and open shift visibility",
  "Light staff records, approved hours, and handover notes",
  "Manager-led AI support for checks and drafts",
] as const;

const supportPlans = [
  {
    name: "Core",
    price: "£39",
    meta: "Up to 25 staff · workspace pricing",
    body: "A focused rota workspace with checks, leave context, approved hours, and handover notes.",
    cta: "Join early access",
  },
  {
    name: "Free",
    price: "£0",
    meta: "Up to 5 staff · workspace pricing",
    body: "Basic weekly rota planning for small teams getting started.",
    cta: "Join early access",
  },
] as const;

const comparePoints = [
  ["Workspace price", "No per-seat meter for every staff name."],
  ["Manager confirms", "AI can suggest checks, but publishing stays manual."],
  ["Rota first", "Scheduling stays the centre of the product."],
] as const;

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="relative scroll-mt-24 overflow-hidden border-t py-12 sm:py-16 lg:py-20"
      style={{ background: "var(--landing-paper)", borderColor: "var(--landing-border)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
        style={{
          background: "radial-gradient(46% 54% at 50% 0%,rgba(201,149,77,.18),transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[.32fr_.68fr] lg:items-start">
          <div>
            <span className="landing-section-eyebrow">Pricing</span>
            <h2 className="landing-section-title max-w-[380px]">
              Start with Pro,
              <br />
              then choose <span className="landing-it">what fits.</span>
            </h2>
            <p className="max-w-[360px] text-pretty text-[15px] leading-[1.6] text-[var(--landing-ink-600)] sm:text-[16px]">
              A 14-day full Pro trial gives managers the complete rota workspace before choosing the
              right early-access path.
            </p>
            <div className="landing-mono mt-6 grid gap-2.5 text-[10.5px] uppercase text-[var(--landing-teal-deep)]">
              {pricingNotes.map((note) => (
                <span key={note} className="inline-flex items-center gap-2">
                  <span className="size-[5px] rounded-full bg-[var(--landing-teal)]" />
                  {note}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,.82fr)]">
              <article
                className="landing-reveal relative overflow-hidden rounded-[18px] p-5 text-[var(--landing-cream)] sm:p-7"
                style={{
                  background:
                    "linear-gradient(145deg,rgba(20,35,30,1),rgba(12,20,18,1) 58%,rgba(30,24,16,1))",
                  border: "1px solid rgba(201,149,77,.76)",
                  boxShadow: "0 30px 80px -28px rgba(17,23,20,.75)",
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-44 w-44 rounded-full"
                  style={{ background: "rgba(201,149,77,.14)", filter: "blur(54px)" }}
                />
                <div className="relative flex items-center justify-between gap-4">
                  <p className="landing-mono text-[11px] uppercase text-[#d9ad70]">Pro</p>
                  <span className="landing-mono rounded-full bg-[#c9954d] px-3 py-1 text-[10px] font-bold uppercase text-[#111714]">
                    Recommended
                  </span>
                </div>
                <div className="relative mt-6">
                  <p className="text-[56px] font-extrabold leading-none sm:text-[62px]">
                    £79 <span className="text-[16px] font-semibold text-white/60">/mo flat</span>
                  </p>
                  <p className="mt-3 text-[14px] font-semibold text-[var(--landing-teal-400)]">
                    Up to 50 staff · workspace pricing
                  </p>
                  <p className="mt-5 text-pretty text-[15px] leading-[1.55] text-[var(--landing-cream-dim)]">
                    The best fit for hospitality managers who need rota control, lightweight
                    workforce context, and practical support before publishing.
                  </p>
                </div>

                <ul className="relative mt-6 grid gap-3">
                  {proFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-[13.5px] text-white/74"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-[#d9ad70]" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative mt-7">
                  <a
                    href="/auth"
                    className="inline-flex w-full justify-center rounded-xl bg-[#c9954d] px-6 py-4 text-[14px] font-extrabold text-[#111714] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a865] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Get Pro early access
                  </a>
                  <p className="mt-3 text-center text-[12px] text-white/52">
                    14-day full Pro trial. No live billing implied.
                  </p>
                </div>
              </article>

              <div className="grid gap-4">
                {supportPlans.map((plan) => (
                  <article
                    key={plan.name}
                    className="rounded-[16px] border bg-white/88 p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg sm:p-5"
                    style={{
                      borderColor: "var(--landing-border)",
                      boxShadow: "0 18px 42px -36px rgba(17,23,20,.42)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="landing-mono text-[10px] uppercase text-[var(--landing-ink-400)]">
                          {plan.name}
                        </p>
                        <p className="mt-2 text-[32px] font-extrabold leading-none text-[var(--landing-ink-900)]">
                          {plan.price}
                        </p>
                        <p className="mt-2 text-[12.5px] text-[var(--landing-ink-500)]">
                          {plan.meta}
                        </p>
                      </div>
                      <a
                        href="/auth"
                        className="shrink-0 rounded-full border border-[var(--landing-border)] px-3.5 py-2 text-[12px] font-bold text-[var(--landing-ink-900)] transition hover:bg-[var(--landing-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--landing-teal)]"
                      >
                        {plan.cta}
                      </a>
                    </div>
                    <p className="mt-4 max-w-[420px] text-[13px] leading-[1.55] text-[var(--landing-ink-600)]">
                      {plan.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 text-center sm:grid-cols-3">
              {comparePoints.map(([heading, body]) => (
                <div
                  key={heading}
                  className="rounded-[12px] border bg-white/78 px-4 py-2.5 text-[12px] leading-[1.4] text-[var(--landing-ink-600)]"
                  style={{ borderColor: "var(--landing-border-faint)" }}
                >
                  <p className="landing-mono mb-1 text-[9.5px] font-bold uppercase text-[var(--landing-teal-deep)]">
                    {heading}
                  </p>
                  {body}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
