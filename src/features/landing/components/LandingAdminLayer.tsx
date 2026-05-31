import {
  ClipboardCheck,
  ClipboardList,
  Clock3,
  MessageSquare,
  PalmtreeIcon as Palmtree,
  Users,
} from "lucide-react";

const surfaces = [
  {
    title: "Staff records",
    body: "Roles, contracts and availability in one place.",
    tag: "People",
    Icon: Users,
    tone: "bg-[var(--landing-teal)]/15 text-[var(--landing-teal-deep)]",
  },
  {
    title: "Leave & absence",
    body: "Time off planned against the week it lands on.",
    tag: "Time off",
    Icon: Palmtree,
    tone: "bg-[#9b8acc]/15 text-[#6c5ca8]",
  },
  {
    title: "Approved hours",
    body: "Review and export — a planning estimate, not payroll.",
    tag: "Hours",
    Icon: Clock3,
    tone: "bg-[#c99a5b]/18 text-[#8e6629]",
  },
  {
    title: "Reminders",
    body: "Manager reminders for documents and training.",
    tag: "Checks",
    Icon: ClipboardCheck,
    tone: "bg-[#5b8acc]/15 text-[#3f6aa6]",
  },
  {
    title: "Team updates",
    body: "Staff-facing notes, prepared and shared after publishing.",
    tag: "Comms",
    Icon: MessageSquare,
    tone: "bg-[#7fb89c]/18 text-[#3f7256]",
  },
  {
    title: "Ops handover",
    body: "The shift's context carried into the next service.",
    tag: "Service",
    Icon: ClipboardList,
    tone: "bg-[#a8a298]/20 text-[#5a5447]",
  },
] as const;

export function LandingAdminLayer() {
  return (
    <section className="relative bg-[var(--landing-ink)] py-24 text-[var(--landing-cream)] sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-3xl">
          <p className="landing-section-eyebrow text-[var(--landing-teal)]">The full workspace</p>
          <h2 className="landing-section-title text-[var(--landing-cream)]">
            The rota is never{" "}
            <span className="italic text-[var(--landing-teal)]">just a rota.</span>
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-[17px] leading-7 text-[var(--landing-cream)]/65">
            It&apos;s the people, the leave, the hours and the handover around it. DocklistAI keeps
            that admin light and close to the schedule — not buried in a separate HR system.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#0c1412]/10 bg-[var(--landing-paper)] text-[var(--landing-ink)] shadow-[0_50px_120px_-50px_rgba(0,0,0,0.55)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[#0c1412]/12 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--landing-ink)] px-3 py-1.5 text-[11px] font-medium text-[var(--landing-cream)]">
                <span className="grid size-4 place-items-center rounded-sm bg-[var(--landing-teal)] text-[10px] font-bold text-[var(--landing-ink)]">
                  D
                </span>
                The admin layer
              </span>
              <span className="landing-mono hidden text-[10px] uppercase tracking-[0.18em] text-[#5c645f] sm:inline">
                Light · close to the rota · manager-led
              </span>
            </div>
            <span className="landing-mono text-[10px] uppercase tracking-[0.16em] text-[#5c645f]">
              6 surfaces · 1 workspace
            </span>
          </header>

          <div className="grid sm:grid-cols-2">
            {surfaces.map((s, i) => (
              <article
                key={s.title}
                className={`flex flex-col gap-3 border-dashed border-[#0c1412]/12 p-7 sm:p-8 ${
                  i % 2 === 0 ? "sm:border-r" : ""
                } ${i < surfaces.length - 2 ? "border-b" : "border-b sm:border-b-0"}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`grid size-10 place-items-center rounded-lg ${s.tone}`}>
                    <s.Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="landing-mono text-[9.5px] uppercase tracking-[0.2em] text-[#8c8273]">
                    {s.tag}
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-[22px] font-medium tracking-[-0.012em] text-[var(--landing-ink)]">
                  {s.title}
                </h3>
                <p className="text-[14.5px] leading-6 text-[#4f564f]">{s.body}</p>
              </article>
            ))}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#0c1412]/12 px-6 py-5 sm:px-8">
            <p className="flex items-center gap-2 text-[14px] leading-6 text-[#3f4744]">
              <span className="size-1.5 rounded-full bg-[var(--landing-teal-deep)]" />
              All six surfaces sit{" "}
              <span className="font-semibold">around the rota</span> — none of them away from it.
            </p>
            <span className="landing-mono text-[10px] uppercase tracking-[0.18em] text-[#8c8273]">
              One workspace · no per-seat anxiety
            </span>
          </footer>
        </div>
      </div>
    </section>
  );
}
