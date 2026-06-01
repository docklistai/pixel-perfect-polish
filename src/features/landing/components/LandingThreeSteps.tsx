import { CalendarDays, Send, ShieldCheck } from "lucide-react";

const steps = [
  {
    title: "Build the week",
    body: "Drag, drop and shape the week around your team, your trade and the day you're walking into.",
    Icon: CalendarDays,
  },
  {
    title: "Check the pressure",
    body: "See clashes, gaps and coverage pressure well before they reach the floor — or your team's group chat.",
    Icon: ShieldCheck,
  },
  {
    title: "Publish clearly",
    body: "You confirm, then publish. Staff see the rota they can trust, with the notes and context they need.",
    Icon: Send,
  },
] as const;

export function LandingThreeSteps() {
  return (
    <section
      id="how-it-works"
      className="relative bg-[var(--landing-ink)] py-24 text-[var(--landing-cream)] sm:py-32"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--landing-teal)]/30 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-2xl">
          <p className="landing-section-eyebrow text-[var(--landing-teal)]">The weekly rhythm</p>
          <h2 className="landing-section-title text-[var(--landing-cream)]">
            Build it, check it,{" "}
            <span className="italic text-[var(--landing-teal)]">publish it.</span>
          </h2>
        </div>

        <div className="flex flex-col gap-5">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-[#10201d] to-[#0b1614] p-8 sm:p-10"
            >
              <span
                aria-hidden="true"
                className="landing-mono absolute right-7 top-7 text-[11px] uppercase tracking-[0.18em] text-[var(--landing-cream)]/35"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="grid size-12 place-items-center rounded-xl border border-[var(--landing-teal)]/35 bg-[var(--landing-teal)]/12 text-[var(--landing-teal)]">
                <step.Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-8 font-serif text-[28px] font-medium leading-tight tracking-[-0.018em] text-[var(--landing-cream)] sm:text-[32px]">
                {step.title}
              </h3>
              <p className="mt-3 max-w-2xl text-pretty text-[15.5px] leading-7 text-[var(--landing-cream)]/65">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
