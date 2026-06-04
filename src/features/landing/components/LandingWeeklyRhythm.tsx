import { CalendarDays, CheckCircle2, Send, ShieldCheck } from "lucide-react";

const rhythmSteps = [
  {
    number: "1",
    title: "Build",
    body: "Create your draft rota with shifts, roles, and real availability.",
    icon: CalendarDays,
    active: false,
  },
  {
    number: "2",
    title: "Check",
    body: "See the full picture. Spot gaps, clashes, and pressure early.",
    icon: ShieldCheck,
    active: true,
  },
  {
    number: "3",
    title: "Confirm",
    body: "Lock the plan when you're happy and ready to go.",
    icon: CheckCircle2,
    active: false,
  },
  {
    number: "4",
    title: "Publish",
    body: "Your team gets the rota. Clear, final, and in one place.",
    icon: Send,
    active: false,
  },
] as const;

export function LandingWeeklyRhythm() {
  return (
    <section
      id="rhythm"
      className="relative scroll-mt-24 overflow-hidden border-b py-10 text-[var(--landing-ink)] sm:py-12 lg:py-14"
      style={{ background: "var(--landing-paper)", borderColor: "var(--landing-border)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-36"
        style={{
          background: "linear-gradient(180deg,rgba(201,149,77,.12),rgba(246,241,232,0))",
        }}
      />
      <div className="relative mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="mx-auto max-w-[1040px]">
          <div className="mx-auto max-w-[760px] text-center">
            <span className="landing-section-eyebrow">Weekly rhythm</span>
            <h2 className="mt-3 text-balance text-[clamp(32px,4vw,48px)] font-extrabold leading-[1.04] text-[var(--landing-ink)]">
              Build the week. Check the pressure. Publish with{" "}
              <span className="landing-it">confidence.</span>
            </h2>
          </div>

          <div className="relative mt-7 sm:mt-8">
            <div
              aria-hidden="true"
              className="absolute left-[8%] right-[8%] top-[26px] hidden h-px lg:block"
              style={{
                background:
                  "linear-gradient(90deg,rgba(201,149,77,.2),rgba(14,165,162,.42),rgba(201,149,77,.2))",
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {rhythmSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.title}
                    className="landing-rhythm-card relative min-h-[150px] rounded-[14px] border p-4 transition duration-200 hover:-translate-y-0.5 focus-within:-translate-y-0.5 sm:p-5"
                    style={{
                      background: step.active
                        ? "linear-gradient(145deg,#111714,#17201c 62%,#211a12)"
                        : "rgba(255,255,255,.72)",
                      borderColor: step.active ? "rgba(201,149,77,.62)" : "var(--landing-border)",
                      boxShadow: step.active
                        ? "0 24px 54px -30px rgba(17,23,20,.8)"
                        : "0 16px 38px -34px rgba(17,23,20,.45)",
                      color: step.active ? "var(--landing-cream)" : "var(--landing-ink)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className="landing-mono text-[22px] leading-none"
                        style={{
                          color: step.active ? "#d9ad70" : "rgba(74,84,104,.32)",
                        }}
                      >
                        {step.number}
                      </span>
                      <span
                        className="grid size-9 place-items-center rounded-xl border"
                        style={{
                          background: step.active ? "rgba(217,173,112,.12)" : "#fff",
                          borderColor: step.active
                            ? "rgba(217,173,112,.32)"
                            : "var(--landing-border-faint)",
                          color: step.active ? "#d9ad70" : "var(--landing-teal-deep)",
                        }}
                      >
                        <Icon className="size-4.5" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-5 text-[17px] font-extrabold">{step.title}</h3>
                    <p
                      className="mt-2.5 text-pretty text-[13px] leading-[1.5]"
                      style={{
                        color: step.active ? "var(--landing-cream-dim)" : "var(--landing-ink-600)",
                      }}
                    >
                      {step.body}
                    </p>
                  </article>
                );
              })}
            </div>
            <div
              className="mt-5 flex items-center justify-center gap-2 lg:hidden"
              aria-hidden="true"
            >
              {rhythmSteps.map((step) => (
                <span
                  key={step.title}
                  className="h-1.5 w-6 rounded-full"
                  style={{ background: step.active ? "#c9954d" : "var(--landing-border)" }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
