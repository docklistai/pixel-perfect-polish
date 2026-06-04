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
      className="relative scroll-mt-24 overflow-hidden border-b py-16 text-[var(--landing-ink)] sm:py-20 lg:py-24"
      style={{ background: "var(--landing-paper)", borderColor: "var(--landing-border)" }}
    >
      {/* Background subtleties */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background: "linear-gradient(180deg,rgba(17,23,20,.04),rgba(246,241,232,0))",
        }}
      />
      <div className="relative mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-12 flex flex-col items-end justify-between gap-6 border-b border-[var(--landing-border)] pb-8 text-center sm:flex-row sm:text-left">
            <div className="max-w-[500px]">
              <span className="landing-section-eyebrow">Weekly rhythm</span>
              <h2 className="mt-4 text-balance text-[clamp(28px,3vw,40px)] font-extrabold leading-[1.08] text-[var(--landing-ink)]">
                Build the week. Check the pressure. Publish with{" "}
                <span className="landing-it">confidence.</span>
              </h2>
            </div>
            <p className="hidden max-w-[340px] text-pretty text-[14.5px] leading-[1.6] text-[var(--landing-ink-600)] sm:block">
              An elegant operational sequence ensuring the team only sees the rota when it is
              perfectly ready.
            </p>
          </div>

          <div className="relative">
            {/* The horizontal brass rail */}
            <div
              aria-hidden="true"
              className="absolute left-6 right-6 top-[3.25rem] hidden h-0.5 rounded-full lg:block"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(201,149,77,.3) 15%, rgba(201,149,77,.3) 85%, transparent)",
              }}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {rhythmSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.title}
                    className="group relative flex flex-col text-left transition duration-200"
                  >
                    <div className="mb-6 flex items-center lg:justify-center">
                      <div
                        className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border transition-transform duration-300 motion-safe:group-hover:-translate-y-1"
                        style={{
                          background: step.active
                            ? "linear-gradient(145deg,#111714,#1a221e)"
                            : "#fff",
                          borderColor: step.active
                            ? "rgba(201,149,77,.4)"
                            : "var(--landing-border)",
                          boxShadow: step.active
                            ? "0 12px 24px -10px rgba(17,23,20,.6)"
                            : "0 4px 12px -8px rgba(17,23,20,.1)",
                          color: step.active ? "#d9ad70" : "var(--landing-ink-400)",
                        }}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                        {step.active && (
                          <div className="absolute -bottom-1 -right-1 grid size-4.5 place-items-center rounded-full border-2 border-[var(--landing-paper)] bg-[var(--landing-teal-deep)] text-white">
                            <div className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="flex w-full flex-1 flex-col rounded-[20px] border p-5 transition-all duration-300 sm:p-6"
                      style={{
                        background: step.active ? "white" : "rgba(255,255,255,.45)",
                        borderColor: step.active ? "var(--landing-border)" : "transparent",
                        boxShadow: step.active ? "0 12px 30px -15px rgba(17,23,20,.08)" : "none",
                      }}
                    >
                      <span
                        className="landing-mono mb-3 block text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          color: step.active
                            ? "var(--landing-amber-700)"
                            : "var(--landing-ink-400)",
                        }}
                      >
                        Step {step.number}
                      </span>
                      <h3 className="text-[18px] font-extrabold text-[var(--landing-ink-900)]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-pretty text-[14px] leading-[1.55] text-[var(--landing-ink-600)]">
                        {step.body}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
