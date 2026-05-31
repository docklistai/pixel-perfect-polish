import { CalendarDays, Send, ShieldCheck } from "lucide-react";

const steps = [
  {
    title: "Build the week",
    body: "Drag, drop and shape the week around your team, your trade and the day you're walking into.",
    Icon: CalendarDays,
  },
  {
    title: "Check the pressure",
    body: "See clashes, gaps and coverage well before they reach the floor — or your team's group chat.",
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
    <section className="relative bg-[var(--landing-ink)] py-24 text-[var(--landing-cream)] sm:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--landing-teal)]/30 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl">
          <p className="landing-section-eyebrow text-[var(--landing-teal)]">The weekly rhythm</p>
          <h2 className="landing-section-title text-[var(--landing-cream)]">
            Build it, check it,{" "}
            <span className="italic text-[var(--landing-teal)]">publish it.</span>
          </h2>
        </div>

        <div className="grid gap-12 lg:grid-cols-3 lg:gap-10">
          {steps.map((step, index) => (
            <article key={step.title} className="relative pt-10">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 left-0 select-none font-serif text-[140px] font-light leading-[0.8] tracking-[-0.04em] text-[var(--landing-teal)]/[0.08]"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="relative z-10 grid size-12 place-items-center rounded-full border border-[var(--landing-teal)]/35 bg-[var(--landing-teal)]/10 text-[var(--landing-teal)]">
                <step.Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="relative z-10 mt-6 font-serif text-[32px] font-normal leading-tight tracking-[-0.02em] text-[var(--landing-cream)]">
                {step.title}
              </h3>
              <p className="relative z-10 mt-3 max-w-sm text-pretty text-[15px] leading-7 text-[var(--landing-cream)]/65">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
