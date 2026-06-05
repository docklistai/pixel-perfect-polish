import {
  Users,
  CalendarOff,
  Clock,
  FileText,
  MessageSquare,
  ArrowRightLeft,
  CalendarCheck,
} from "lucide-react";

const adminItems = [
  { name: "Staff records", icon: Users, desc: "Lightweight contact and role details." },
  {
    name: "Leave & absence",
    icon: CalendarOff,
    desc: "Track approved time off before scheduling.",
  },
  { name: "Approved hours", icon: Clock, desc: "Export confirmed timesheets." },
  { name: "Reminders & docs", icon: FileText, desc: "Key notes pinned to the week." },
  { name: "Team updates", icon: MessageSquare, desc: "Broadcast messages to the floor." },
  { name: "Handover", icon: ArrowRightLeft, desc: "Shift-to-shift continuity notes." },
] as const;

export function LandingBecause() {
  return (
    <section
      className="relative overflow-hidden border-y py-16 sm:py-24"
      style={{ background: "var(--landing-bg-soft)", borderColor: "var(--landing-border)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(var(--landing-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(38% 42% at 22% 28%, rgba(14,122,120,0.10), transparent 70%), radial-gradient(36% 44% at 80% 76%, rgba(201,149,77,0.14), transparent 72%)",
        }}
      />
      <div className="relative mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="mx-auto mb-16 max-w-[640px] text-center">
          <span className="landing-section-eyebrow">Around the rota</span>
          <h2 className="landing-section-title mt-4">The admin stays close to the week.</h2>
          <p className="mt-4 text-pretty text-[16.5px] leading-[1.62] text-[var(--landing-ink-600)]">
            DocklistAI carries the lightweight workforce context managers need around the rota,
            without turning into a full HR suite.
          </p>
        </div>

        <div className="relative mx-auto max-w-[1040px]">
          {/* Orbit layout for desktop, grid for mobile */}
          <div className="grid items-center gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
            {/* Left Column (Items 0, 1) */}
            <div className="flex flex-col gap-4 lg:mt-0 lg:gap-6">
              {adminItems.slice(0, 2).map((item) => (
                <SupportModule
                  key={item.name}
                  item={item}
                  alignClass="lg:text-right"
                  iconClass="lg:ml-auto lg:mr-0"
                />
              ))}
            </div>

            {/* Central Anchor */}
            <div className="flex w-full flex-col gap-4 lg:w-[280px] lg:gap-6">
              {/* Item 2 */}
              <SupportModule item={adminItems[2]} alignClass="lg:text-center" iconClass="mx-auto" />

              {/* The Rota Core */}
              <div
                className="relative z-10 mx-auto hidden aspect-square w-full flex-col items-center justify-center rounded-[24px] border border-[var(--landing-amber-100)] p-6 transition-transform duration-500 lg:flex motion-safe:hover:scale-105"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
                  boxShadow: "0 24px 50px -20px rgba(201,149,77,0.2), inset 0 0 0 1px white",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[var(--landing-teal-deep)] text-white shadow-xl">
                  <CalendarCheck className="size-6" strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="text-center text-[17px] font-bold text-[var(--landing-ink-900)]">
                  The Rota
                </h3>
                <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-widest text-[var(--landing-amber-700)]">
                  Core Engine
                </p>
              </div>

              {/* Item 3 */}
              <SupportModule item={adminItems[3]} alignClass="lg:text-center" iconClass="mx-auto" />
            </div>

            {/* Right Column (Items 4, 5) */}
            <div className="flex flex-col gap-4 lg:mt-0 lg:gap-6">
              {adminItems.slice(4, 6).map((item) => (
                <SupportModule key={item.name} item={item} alignClass="lg:text-left" iconClass="" />
              ))}
            </div>
          </div>

          <div className="mt-16 flex justify-center">
            <p
              className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border bg-white/70 px-6 py-3 text-center text-[13.5px] font-medium text-[var(--landing-ink-700)] shadow-[0_4px_12px_rgba(17,23,20,0.03)] backdrop-blur-md transition-shadow hover:shadow-[0_8px_20px_rgba(17,23,20,0.06)]"
              style={{ borderColor: "rgba(201,149,77,.3)" }}
            >
              <span className="flex size-2 shrink-0 rounded-full bg-[#c9954d]" aria-hidden="true" />
              <span>
                Approved hours are for review and export.{" "}
                <strong className="font-bold text-[var(--landing-ink-900)]">
                  Payroll integrations remain outside the product.
                </strong>
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportModule({
  item,
  alignClass,
  iconClass,
}: {
  item: (typeof adminItems)[number];
  alignClass: string;
  iconClass: string;
}) {
  const Icon = item.icon;
  return (
    <div
      className={`group relative overflow-hidden rounded-[20px] border border-[var(--landing-border)] bg-white/80 p-5 text-left backdrop-blur-md transition-all duration-300 focus-within:-translate-y-1 focus-within:shadow-xl motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_12px_30px_-15px_rgba(17,23,20,.1)] ${alignClass}`}
    >
      <div
        className={`mb-4 flex size-10 items-center justify-center rounded-xl border border-[var(--landing-border-faint)] bg-[var(--landing-paper)] text-[var(--landing-teal-deep)] transition-colors group-hover:bg-[var(--landing-teal-50)] group-hover:text-[var(--landing-teal)] ${iconClass}`}
      >
        <Icon className="size-4.5" aria-hidden="true" />
      </div>
      <h3 className="text-[15px] font-bold text-[var(--landing-ink-900)]">{item.name}</h3>
      <p className="mt-1.5 text-[13.5px] leading-[1.5] text-[var(--landing-ink-500)]">
        {item.desc}
      </p>
    </div>
  );
}
