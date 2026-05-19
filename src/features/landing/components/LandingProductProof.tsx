import {
  proofDays,
  proofLegend,
  proofRows,
  proofStats,
  type ProofShift,
  type ProofShiftTone,
} from "../data/landingProofMock";

const shiftToneClass: Record<ProofShiftTone, string> = {
  am: "border-[#5ba29c]/35 bg-[#5ba29c]/20 text-[#a8dad4]",
  pm: "border-[#2f6e68]/55 bg-[#2f6e68]/30 text-[#c9e8e4]",
  dbl: "border-[#5ba29c]/45 bg-gradient-to-b from-[#5ba29c]/25 to-[#2f6e68]/20 text-[#cdeae5]",
  off: "items-center justify-center border-dashed border-white/10 bg-transparent text-white/25",
  open: "border-dashed border-[#c99a5b]/60 bg-[#c99a5b]/10 text-[#e2b271]",
  clash: "border-[#b8674a]/60 bg-[#b8674a]/20 text-[#e89880]",
  leave: "items-center justify-center border-white/10 bg-white/[0.04] text-white/45",
};

const swatchClass: Record<(typeof proofLegend)[number]["tone"], string> = {
  am: "border-[#5ba29c]/40 bg-[#5ba29c]/25",
  pm: "border-[#2f6e68]/55 bg-[#2f6e68]/35",
  dbl: "border-[#5ba29c]/40 bg-gradient-to-b from-[#5ba29c]/30 to-[#2f6e68]/20",
  open: "border-dashed border-[#c99a5b]/60 bg-[#c99a5b]/10",
  clash: "border-[#b8674a]/60 bg-[#b8674a]/20",
  leave: "border-white/10 bg-white/[0.05]",
};

export function LandingProductProof() {
  return (
    <section
      className="relative overflow-hidden bg-[var(--landing-ink)] py-24 text-[var(--landing-cream)] sm:py-36"
      aria-labelledby="landing-product-proof-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(91,162,156,0.08),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="landing-section-eyebrow text-[var(--landing-teal)]">The week, in view</p>
            <h2
              id="landing-product-proof-title"
              className="landing-section-title text-[var(--landing-cream)]"
            >
              A rota that thinks like the{" "}
              <span className="italic text-[var(--landing-teal)]">floor.</span>
            </h2>
          </div>
          <p className="max-w-xl text-pretty text-[17px] leading-7 text-[var(--landing-cream)]/65">
            Coverage, clashes, open shifts and publish readiness, held together in one calm,
            considered view. Not a dashboard. A working surface for the week ahead.
          </p>
        </div>

        <div
          className="overflow-hidden rounded-xl border border-white/10 bg-[#0f1816] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.65)]"
          aria-label="Static product preview of a hospitality rota week"
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-gradient-to-b from-[#101a18] to-[#0d1614] px-4 py-3 landing-mono text-[11px] tracking-[0.04em] text-white/55 sm:px-5">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-[#3a4644]" />
              <span className="size-2.5 rounded-full bg-[#3a4644]" />
              <span className="size-2.5 rounded-full bg-[#3a4644]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span>docklist · The Harbor Bar &amp; Kitchen</span>
              <span className="rounded-full border border-[var(--landing-teal)]/35 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--landing-teal)]">
                Week 21 · May 19 - May 25
              </span>
            </div>
            <div className="ml-auto hidden gap-3 text-white/40 lg:flex">
              <span>Front of House</span>
              <span>·</span>
              <span>Kitchen</span>
              <span>·</span>
              <span>Bar</span>
            </div>
          </div>

          <div className="relative overflow-x-auto px-4 py-0 sm:px-0">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#0f1816] to-transparent lg:hidden"
              aria-hidden="true"
            />
            <div
              className="relative grid min-w-[760px] grid-cols-[140px_repeat(7,96px)] bg-[#0c1513] sm:min-w-[1040px] sm:grid-cols-[200px_repeat(7,minmax(108px,1fr))]"
              aria-hidden="true"
            >
              <div className="proof-head-cell">Team</div>
              {proofDays.map((day) => (
                <div key={day.label} className="proof-day-cell">
                  {day.label}
                  <span>{day.date}</span>
                </div>
              ))}

              {proofRows.map((row) => (
                <Row key={row.name} row={row} />
              ))}

              <Annotation className="right-[-14px] top-16 hidden lg:flex" tone="teal" />
              <Annotation className="left-[42%] top-[296px] hidden lg:flex" tone="amber" />
              <Annotation className="left-[58%] top-[158px] hidden lg:flex" tone="rust" />
            </div>
          </div>

          <div className="grid border-t border-white/10 bg-[#0a100e] sm:grid-cols-4">
            {proofStats.map((stat) => (
              <div
                key={stat.label}
                className="border-b border-r border-white/10 p-5 sm:border-b-0 last:border-r-0"
              >
                <div className="landing-mono mb-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
                  {stat.label}
                </div>
                <div
                  className={`font-serif text-3xl font-light leading-none tracking-[-0.02em] ${
                    stat.tone === "ok" ? "text-[#a8dad4]" : "text-[#e2b271]"
                  }`}
                >
                  {stat.value}
                  {stat.unit && <span className="ml-1 text-sm text-white/45">{stat.unit}</span>}
                </div>
                <div className="landing-mono mt-1 text-[10px] tracking-[0.04em] text-white/40">
                  {stat.delta}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 landing-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35 lg:hidden">
          ← Scroll to see the full week →
        </p>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 landing-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
          {proofLegend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2">
              <span className={`h-2.5 w-3.5 rounded-sm border ${swatchClass[item.tone]}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({ row }: { row: (typeof proofRows)[number] }) {
  return (
    <>
      <div className="proof-name-cell">
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3a544f] to-[#1f3331] text-[11px] font-medium text-[var(--landing-cream)]">
          {row.initials}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] text-[var(--landing-cream)]">{row.name}</span>
          <span className="landing-mono mt-0.5 truncate text-[10px] uppercase tracking-[0.06em] text-white/40">
            {row.role}
          </span>
        </div>
      </div>
      {row.shifts.map((shift, index) => (
        <div key={`${row.name}-${index}`} className="proof-cell">
          <Shift shift={shift} />
        </div>
      ))}
    </>
  );
}

function Shift({ shift }: { shift: ProofShift }) {
  return (
    <div
      className={`absolute inset-x-2 inset-y-2 flex flex-col justify-between overflow-hidden rounded border px-2.5 py-2 text-[10px] leading-tight ${shiftToneClass[shift.tone]}`}
    >
      {shift.label ? (
        <span className="landing-mono uppercase tracking-[0.12em]">{shift.label}</span>
      ) : (
        <>
          <span className="landing-mono tracking-[0.06em]">{shift.time}</span>
          <span className="landing-mono opacity-70">{shift.sub}</span>
        </>
      )}
    </div>
  );
}

function Annotation({ className, tone }: { className: string; tone: "teal" | "amber" | "rust" }) {
  const content = {
    teal: ["Pre-publish", "Coverage 94% · Ready"],
    amber: ["Open shift · Wed", "Lunch · 5h unfilled"],
    rust: ["Clash detected · Fri", "Jamie R. · approved leave"],
  }[tone];
  const dot = {
    teal: "bg-[var(--landing-teal)] shadow-[0_0_0_4px_rgba(91,162,156,0.18)]",
    amber: "bg-[#d9a968] shadow-[0_0_0_4px_rgba(201,154,91,0.18)]",
    rust: "bg-[#b8674a] shadow-[0_0_0_4px_rgba(184,103,74,0.18)]",
  }[tone];

  return (
    <div
      className={`absolute z-10 items-center gap-2.5 rounded-lg border border-white/20 bg-[#0c1412]/95 px-3.5 py-2.5 shadow-2xl backdrop-blur ${className}`}
    >
      <span className={`size-2 rounded-full ${dot}`} />
      <span>
        <span className="landing-mono block text-[9px] uppercase tracking-[0.16em] text-white/55">
          {content[0]}
        </span>
        <span className="landing-mono text-[11px] text-[var(--landing-cream)]">{content[1]}</span>
      </span>
    </div>
  );
}
