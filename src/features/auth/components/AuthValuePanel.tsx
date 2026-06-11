import { CalendarRange, ShieldCheck, Users } from "lucide-react";

const valuePillars = [
  {
    icon: CalendarRange,
    title: "Schedule clarity",
    description: "See who's working, where, and when.",
  },
  {
    icon: ShieldCheck,
    title: "Secure workspace access",
    description: "Role-based access for managers and staff.",
  },
  {
    icon: Users,
    title: "Team onboarding",
    description: "Bring your team in without messy setup.",
  },
];

const trustBadges = ["Role-based permissions", "Staff access codes", "Approved-hours exports"];

export function AuthValuePanel() {
  return (
    <div className="space-y-5 lg:space-y-7">
      <span className="inline-flex w-fit items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
        Built for hospitality teams
      </span>

      <div className="max-w-2xl space-y-4">
        <h2 className="text-balance text-3xl font-extralight tracking-tight text-foreground md:text-5xl">
          Bring your rota, team, and time back under control.
        </h2>
        <p className="max-w-xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">
          Docklist keeps shift planning fast and clear, with the visibility your team needs.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {valuePillars.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-[0_10px_30px_color-mix(in_oklch,var(--foreground)_5%,transparent)] backdrop-blur"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {trustBadges.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 backdrop-blur"
          >
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}
