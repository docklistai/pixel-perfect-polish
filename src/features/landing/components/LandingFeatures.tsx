import { CalendarDays } from "lucide-react";
import { features, landingImages } from "../data/landingContent";

export function LandingFeatures() {
  const [primaryFeature, ...secondaryFeatures] = features;

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#07171d] py-20 text-[#f5efe2] sm:py-24"
    >
      {/* ambient depth — keeps the section from feeling like a flat slab */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#56b8a3]/30 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-24 size-[28rem] rounded-full bg-[#56b8a3]/8 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-10 size-[32rem] rounded-full bg-[#1a4a55]/35 blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-[#56b8a3]">Everything you need</p>
            <h2 className="mt-4 text-balance font-serif text-4xl leading-tight sm:text-5xl">
              Built around scheduling. Not around payroll.
            </h2>
          </div>
          <p className="max-w-md text-pretty text-base leading-7 text-[#b8c4c5]">
            Everything starts with the rota. Staff, time, leave, and daily operations stay close
            enough to support the week without taking over the product.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-[#0d242c] via-[#0b2027] to-[#081a20] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(86,184,163,0.06)_inset] sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#56b8a3]/40 to-transparent"
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl border border-[#56b8a3]/30 bg-[#56b8a3]/12 text-[#56b8a3] shadow-inner shadow-[#56b8a3]/10">
                  {primaryFeature ? (
                    <primaryFeature.icon className="size-6" aria-hidden="true" />
                  ) : (
                    <CalendarDays className="size-6" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#56b8a3]/80">
                    01 &middot; The centrepiece
                  </p>
                  <h3 className="mt-1.5 font-serif text-3xl">
                    {primaryFeature?.title ?? "Rota Builder"}
                  </h3>
                </div>
              </div>
            </div>

            <p className="relative mt-5 max-w-2xl text-sm leading-6 text-[#b8c4c5]">
              {primaryFeature?.body ??
                "Flexible planning, easy editing, and complete control for the weekly rota."}
            </p>

            <RotaBuilderPreview />
          </article>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {secondaryFeatures.slice(0, 3).map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index + 2} compact />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {secondaryFeatures.slice(3).map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index + 5} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  compact = false,
}: {
  feature: (typeof features)[number];
  index: number;
  compact?: boolean;
}) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0c2229] to-[#0a1c22] p-5 shadow-[0_18px_45px_-25px_rgba(0,0,0,0.7)] transition duration-300 hover:-translate-y-0.5 hover:border-[#56b8a3]/25 hover:shadow-[0_28px_60px_-25px_rgba(86,184,163,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-10 items-center justify-center rounded-lg border border-[#56b8a3]/25 bg-[#56b8a3]/10 text-[#56b8a3] transition group-hover:border-[#56b8a3]/45 group-hover:bg-[#56b8a3]/15">
          <feature.icon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7e9295]">
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-5 font-serif text-2xl">{feature.title}</h3>
      <p className={`mt-3 text-sm leading-6 text-[#b8c4c5] ${compact ? "max-w-md" : ""}`}>
        {feature.body}
      </p>
    </article>
  );
}

function RotaBuilderPreview() {
  return (
    <div className="relative mt-8">
      {/* blueprint canvas — faint grid behind the frame so it reads as a product surface, not a floating screenshot */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-4 -bottom-8 -top-4 rounded-[28px] opacity-[0.35] [background-image:linear-gradient(to_right,rgba(86,184,163,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(86,184,163,0.05)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />
      {/* soft teal radial — anchors to brand */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 top-6 size-72 rounded-full bg-[#56b8a3]/14 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 bottom-0 size-80 rounded-full bg-[#1a4a55]/40 blur-3xl"
      />

      <figure className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#05121a] shadow-[0_50px_100px_-35px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.04]">
        {/* app-native top bar — mirrors the real DocklistAI Topbar / publish chip language */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#06151b] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-md border border-[#56b8a3]/25 bg-[#56b8a3]/10 text-[10px] font-semibold text-[#56b8a3]">
              D
            </span>
            <span className="truncate text-[11px] font-medium text-[#9fb2b4]">
              Rota &middot; w/c 28 Apr
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#56b8a3]/25 bg-[#56b8a3]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#56b8a3]">
            <span className="size-1.5 rounded-full bg-[#56b8a3]" aria-hidden="true" />
            Published
          </span>
        </div>

        <div className="relative">
          <img
            src={landingImages.rotaBuilder}
            alt="DocklistAI Rota Builder — weekly schedule grid with staff, shifts, coverage, and conflicts."
            className="block w-full object-cover object-top brightness-[0.92] saturate-[0.95] contrast-[1.02]"
            loading="lazy"
            decoding="async"
          />
          {/* navy multiply tint so the screenshot belongs in the section */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[#07171d]/15 mix-blend-multiply"
          />
          {/* gradient mask, fades bottom into section */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#06151b] via-[#06151b]/60 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#06151b]/55 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.04]"
          />
        </div>
      </figure>

      {/* decorative status chips — borrowed from the real app's surface language */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 left-6 hidden rounded-xl border border-white/10 bg-[#081a20]/95 px-3 py-2 shadow-[0_18px_40px_-15px_rgba(0,0,0,0.7)] backdrop-blur sm:block"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7e9295]">
          Coverage
        </p>
        <p className="mt-0.5 font-serif text-lg leading-none text-[#56b8a3]">92%</p>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-2 right-4 hidden rounded-xl border border-white/10 bg-[#081a20]/95 px-3 py-2 shadow-[0_18px_40px_-15px_rgba(0,0,0,0.7)] backdrop-blur md:block"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7e9295]">
          Conflicts
        </p>
        <p className="mt-0.5 font-serif text-lg leading-none text-[#f5efe2]">3 to review</p>
      </div>
    </div>
  );
}
