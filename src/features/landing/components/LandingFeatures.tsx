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
          <article className="min-w-0 rounded-lg border border-white/10 bg-[#0b2027] p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-lg border border-[#56b8a3]/25 bg-[#56b8a3]/12 text-[#56b8a3]">
                  {primaryFeature ? (
                    <primaryFeature.icon className="size-6" aria-hidden="true" />
                  ) : (
                    <CalendarDays className="size-6" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className="text-sm text-[#9fb2b4]">01 &middot; The centrepiece</p>
                  <h3 className="mt-1 font-serif text-3xl">
                    {primaryFeature?.title ?? "Rota Builder"}
                  </h3>
                </div>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-[#b8c4c5]">
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
    <article className="rounded-lg border border-white/10 bg-[#0b2027] p-5 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-10 items-center justify-center rounded-lg border border-[#56b8a3]/20 bg-[#56b8a3]/10 text-[#56b8a3]">
          <feature.icon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-xs text-[#7e9295]">{String(index).padStart(2, "0")}</span>
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
    <div className="mt-7 overflow-hidden rounded-lg border border-white/10 bg-[#07171d]/70 shadow-2xl">
      <img
        src={landingImages.rotaBuilder}
        alt="Real DocklistAI Rota Builder interface"
        className="w-full object-cover"
      />
    </div>
  );
}
