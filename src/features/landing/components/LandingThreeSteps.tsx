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
    body: "Publish with confidence. Keep your team in the loop with notes, context and changes they can trust.",
    Icon: Send,
  },
] as const;

export function LandingThreeSteps() {
  return (
    <section className="relative bg-[var(--landing-ink)] py-20 text-[var(--landing-cream)] sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--landing-teal)]/35 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-3 lg:gap-16 lg:px-8">
        {steps.map((step, index) => (
          <article key={step.title} className="relative pt-2">
            <span className="pointer-events-none absolute -top-6 left-0 font-serif text-[78px] font-light leading-none tracking-[-0.03em] text-[var(--landing-teal)]/15">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="relative z-10 mt-2 grid size-12 place-items-center rounded-full border border-[var(--landing-teal)]/35 bg-[var(--landing-teal)]/10 text-[var(--landing-teal)]">
              <step.Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="relative z-10 mt-6 font-serif text-3xl font-normal leading-tight tracking-[-0.02em]">
              {step.title}
            </h2>
            <p className="relative z-10 mt-3 max-w-xs text-pretty text-[15px] leading-6 text-[var(--landing-cream)]/65">
              {step.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
