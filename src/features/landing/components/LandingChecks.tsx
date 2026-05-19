import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, CalendarX2 } from "lucide-react";

const checks = [
  {
    title: "Open shifts",
    body: "Spot the gaps that need filling — before the week starts.",
    Icon: CalendarDays,
    tone: "bg-[var(--landing-teal)]/20 text-[var(--landing-teal-deep)]",
  },
  {
    title: "Clashes",
    body: "Catch overlaps and leave conflicts early.",
    Icon: AlertTriangle,
    tone: "bg-[#b8674a]/20 text-[#b8674a]",
  },
  {
    title: "Coverage",
    body: "Check roles, sections and skills are covered.",
    Icon: CheckCircle2,
    tone: "bg-[#c99a5b]/25 text-[#8e6629]",
  },
  {
    title: "Hours",
    body: "Keep hours fair and on target.",
    Icon: Clock3,
    tone: "bg-[var(--landing-teal-deep)]/15 text-[var(--landing-teal-deep)]",
  },
  {
    title: "Leave",
    body: "See who's off and when, in context.",
    Icon: CalendarX2,
    tone: "bg-[var(--landing-teal)]/15 text-[var(--landing-teal-deep)]",
  },
] as const;

export function LandingChecks() {
  return (
    <section
      id="features"
      className="relative border-t border-[#0c1412]/10 bg-[var(--landing-cream-2)] py-24 text-[var(--landing-ink)] sm:py-36"
    >
      <div className="absolute left-1/2 top-0 h-16 w-px -translate-x-1/2 bg-gradient-to-b from-[#0c1412]/20 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div>
            <p className="landing-section-eyebrow">Pre-publish</p>
            <h2 className="landing-section-title">
              See the full picture
              <br />
              before your team
              <br />
              sees the rota.
            </h2>
          </div>
          <p className="max-w-xl text-pretty text-[17px] leading-7 text-[#3f4744]">
            A pre-publish layer that quietly catches the things spreadsheets and group chats let
            slip — so you publish a rota your team can stand behind.
          </p>
        </div>

        <div className="grid border-y border-[#0c1412]/15 md:grid-cols-5">
          {checks.map((check) => (
            <article
              key={check.title}
              className="min-h-[200px] border-b border-dashed border-[#0c1412]/10 p-6 md:border-b-0 md:border-r last:md:border-r-0"
            >
              <div className="flex items-center justify-between">
                <span className={`grid size-9 place-items-center rounded-full ${check.tone}`}>
                  <check.Icon className="size-4" aria-hidden="true" />
                </span>
                <CheckCircle2
                  className="size-4 text-[var(--landing-teal-deep)]/60"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-6 font-serif text-[21px] font-medium tracking-[-0.015em]">
                {check.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#5c645f]">{check.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
