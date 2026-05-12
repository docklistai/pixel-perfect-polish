import {
  CalendarRange,
  Users2,
  Clock4,
  CalendarOff,
  MessageSquare,
  ClipboardList,
  BarChart3,
  Settings,
  CheckCircle2,
} from "lucide-react";

const modules = [
  {
    icon: CalendarRange,
    title: "Rota Builder",
    description: "Draft, copy, and publish the weekly schedule.",
  },
  {
    icon: Users2,
    title: "Staff",
    description: "Profiles, availability, and contract details in one place.",
  },
  {
    icon: Clock4,
    title: "Time",
    description: "Clock in/out, break tracking, and payroll-ready entries.",
  },
  {
    icon: CalendarOff,
    title: "Leave",
    description: "Absence tracking and leave balance visibility.",
  },
  {
    icon: MessageSquare,
    title: "Team Comms",
    description: "Shift swaps, announcements, and approvals.",
  },
  {
    icon: ClipboardList,
    title: "Operations Log",
    description: "Daily notes, incidents, and follow-up tasks.",
  },
  {
    icon: BarChart3,
    title: "Reports",
    description: "Labour cost, coverage, and overtime summaries.",
  },
  {
    icon: Settings,
    title: "Settings",
    description: "Workspace setup, roles, and access control.",
  },
];

const smartChecks = [
  "Check uncovered shifts",
  "Flag availability conflicts",
  "Highlight labour pressure",
  "Review changes before publishing",
];

export function PlatformOverview() {
  return (
    <section className="relative overflow-hidden py-28 md:py-36 lg:py-44">
      <div
        className="absolute inset-0 bg-gradient-to-b from-card/10 via-background to-background"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center md:mb-20">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-brand">
            The platform
          </p>
          <h2 className="mx-auto max-w-3xl text-balance text-[2.25rem] font-extralight leading-[1.08] tracking-tight text-foreground md:text-[3rem] lg:text-[3.75rem]">
            Everything you need to{" "}
            <span className="font-semibold text-brand">run the rota week</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            Docklist connects planning, team workflows, and operational controls so managers can
            move from draft to published rota without switching tools.
          </p>
        </div>

        {/* Module grid */}
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border/40 bg-border/10 md:grid-cols-2 lg:grid-cols-4 md:rounded-3xl">
          {modules.map((mod) => (
            <div
              key={mod.title}
              className="group bg-card/30 p-8 transition-colors duration-500 hover:bg-card/55"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-500 group-hover:bg-brand/15">
                <mod.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-[0.9375rem] font-semibold tracking-tight text-foreground">
                {mod.title}
              </h3>
              <p className="text-[0.8125rem] leading-[1.65] text-muted-foreground">
                {mod.description}
              </p>
            </div>
          ))}
        </div>

        {/* Smart checks — smaller, calmer subsection */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border/40 bg-card/30 p-8 md:mt-12 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">
                Before you publish
              </p>
              <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                Smart rota checks before you publish
              </h3>
              <p className="max-w-lg text-[0.875rem] leading-[1.75] text-muted-foreground">
                Docklist helps spot gaps, conflicts, and pressure points before the rota goes live,
                so managers can review the week with more confidence.
              </p>
            </div>
            <ul className="flex flex-col justify-center gap-2.5 md:items-end">
              {smartChecks.map((check) => (
                <li key={check} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand/60" aria-hidden="true" />
                  {check}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
