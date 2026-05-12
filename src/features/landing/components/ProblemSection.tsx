import { FileSpreadsheet, AlertTriangle, EyeOff, UserRound } from "lucide-react";

const painPoints = [
  {
    icon: FileSpreadsheet,
    title: "Spreadsheets don't scale",
    description: "Endless copies, old versions, and too much manual checking.",
  },
  {
    icon: AlertTriangle,
    title: "Last-minute fire drills",
    description: "Availability changes, sickness, and shift gaps hit at the worst time.",
  },
  {
    icon: EyeOff,
    title: "Staff stay in the dark",
    description: "People chase updates because the rota is not easy to trust.",
  },
  {
    icon: UserRound,
    title: "Managers carry too much",
    description: "The whole week lives in one person's head until something breaks.",
  },
];

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative bg-card py-28 md:py-36 lg:py-44">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="mb-16 max-w-2xl md:mb-24">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-brand">
              The problem
            </p>
            <h2 className="text-balance text-[2.25rem] font-extralight leading-[1.08] tracking-tight text-foreground md:text-[3rem] lg:text-[3.75rem]">
              Why rota weeks{" "}
              <span className="font-semibold text-brand">get messy</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            {painPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-2xl border border-border/40 bg-background/60 p-8 transition-colors duration-300 hover:border-brand/15 hover:bg-background/80"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <point.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="mb-3 text-[0.9375rem] font-semibold tracking-tight text-foreground">
                  {point.title}
                </h3>
                <p className="text-[0.875rem] leading-[1.75] text-muted-foreground">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
