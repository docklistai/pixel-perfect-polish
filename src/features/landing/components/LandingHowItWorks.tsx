import { howItWorks } from "../data/landingContent";

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#fbf7ee] py-20 text-[#07171d] sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-[#2f8c7b]">How it works</p>
            <h2 className="mt-4 max-w-xl text-balance font-serif text-4xl leading-tight sm:text-5xl">
              Three steps to a better rota week.
            </h2>
            <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-[#526064]">
              The same rhythm every week: build, check, publish. No payroll-first detours, just the
              loop hospitality managers already run.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {howItWorks.map((step, index) => (
              <article
                key={step.title}
                className="group rounded-xl border border-[#07171d]/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#2f8c7b]/25 hover:shadow-[0_20px_40px_-20px_rgba(7,23,29,0.25)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-full bg-[#07171d] font-serif text-xl italic text-[#56b8a3]">
                    {index + 1}
                  </span>
                  <step.icon className="size-7 text-[#2f8c7b]" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#526064]">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
