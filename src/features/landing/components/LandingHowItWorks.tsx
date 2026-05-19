const steps = [
  {
    number: "01",
    title: "Import your team",
    body: "Get your staff, roles and availability in.",
  },
  {
    number: "02",
    title: "Build your rota",
    body: "Shape the week around your team, your sections, and the trade you're walking into.",
  },
  {
    number: "03",
    title: "Check before publish",
    body: "Spot clashes, gaps and coverage pressure early.",
  },
  {
    number: "04",
    title: "Share and update",
    body: "Keep your team informed as things change.",
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t border-[#0c1412]/10 bg-[var(--landing-paper)] py-24 text-[var(--landing-ink)] sm:py-36"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <p className="landing-section-eyebrow">How it works</p>
            <h2 className="landing-section-title">
              Simple steps.
              <br />
              Powerful impact.
            </h2>
          </div>
          <p className="max-w-xl text-pretty text-[17px] leading-7 text-[#3f4744]">
            A small, deliberate workflow. The same four steps every week — calmer, clearer and
            faster every time you run them.
          </p>
        </div>

        <div className="flex flex-col border-t border-[#0c1412]/15">
          {steps.map((step) => (
            <article
              key={step.number}
              className="grid gap-4 border-b border-[#0c1412]/10 py-8 md:grid-cols-[180px_1fr_1.4fr] md:gap-16 md:py-11"
            >
              <div className="font-serif text-7xl font-light leading-none tracking-[-0.045em] text-[var(--landing-ink)] md:text-8xl">
                {step.number}
                <span className="text-[var(--landing-teal-deep)]">.</span>
              </div>
              <h3 className="font-serif text-3xl font-normal leading-tight tracking-[-0.02em] md:text-4xl">
                {step.title}
              </h3>
              <p className="max-w-md pt-2 text-pretty text-[15.5px] leading-7 text-[#4f564f]">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
