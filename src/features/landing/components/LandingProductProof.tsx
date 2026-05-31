import { Sparkles } from "lucide-react";

type ShiftTone = "foh" | "kitchen" | "house" | "bar" | "lunch" | "open" | "clash" | "off" | "leave";

type Cell =
  | { kind: "shift"; tone: ShiftTone; time: string; sub: string }
  | { kind: "label"; tone: ShiftTone; text: string };

type StaffRow = {
  initials: string;
  name: string;
  role: string;
  avatar: string;
  cells: readonly Cell[];
};

const days = [
  { label: "Mon", date: "12" },
  { label: "Tue", date: "13" },
  { label: "Wed", date: "14" },
  { label: "Thu", date: "15" },
  { label: "Fri", date: "16" },
];

const rows: readonly StaffRow[] = [
  {
    initials: "SC",
    name: "Sophie C.",
    role: "FOH",
    avatar: "bg-[var(--landing-teal-deep)]",
    cells: [
      { kind: "shift", tone: "foh", time: "08–16", sub: "Front of House" },
      { kind: "shift", tone: "foh", time: "08–16", sub: "Front of House" },
      { kind: "shift", tone: "foh", time: "09–17", sub: "Front of House" },
      { kind: "shift", tone: "foh", time: "08–16", sub: "Front of House" },
      { kind: "label", tone: "off", text: "Day off" },
    ],
  },
  {
    initials: "DM",
    name: "Daniel M.",
    role: "Chef",
    avatar: "bg-[#c99a5b]",
    cells: [
      { kind: "shift", tone: "kitchen", time: "09–17", sub: "Kitchen" },
      { kind: "shift", tone: "kitchen", time: "09–17", sub: "Kitchen" },
      { kind: "label", tone: "off", text: "Day off" },
      { kind: "shift", tone: "kitchen", time: "13–21", sub: "Kitchen" },
      { kind: "shift", tone: "kitchen", time: "13–21", sub: "Kitchen" },
    ],
  },
  {
    initials: "PP",
    name: "Priya P.",
    role: "Housekeeping",
    avatar: "bg-[#9b8acc]",
    cells: [
      { kind: "shift", tone: "house", time: "06–14", sub: "Housekeeping" },
      { kind: "shift", tone: "house", time: "06–14", sub: "Housekeeping" },
      { kind: "shift", tone: "house", time: "06–14", sub: "Housekeeping" },
      { kind: "label", tone: "leave", text: "Annual leave" },
      { kind: "label", tone: "leave", text: "Annual leave" },
    ],
  },
  {
    initials: "LO",
    name: "Liam O.",
    role: "Bar",
    avatar: "bg-[#5b8acc]",
    cells: [
      { kind: "shift", tone: "bar", time: "16–00", sub: "Bar" },
      { kind: "shift", tone: "bar", time: "16–00", sub: "Bar" },
      { kind: "shift", tone: "clash", time: "16–00", sub: "Clash · leave" },
      { kind: "label", tone: "off", text: "Day off" },
      { kind: "shift", tone: "bar", time: "16–00", sub: "Bar" },
    ],
  },
  {
    initials: "EV",
    name: "Elena V.",
    role: "Server",
    avatar: "bg-[#3f7256]",
    cells: [
      { kind: "shift", tone: "lunch", time: "12–17", sub: "Lunch" },
      { kind: "label", tone: "off", text: "Day off" },
      { kind: "shift", tone: "open", time: "— Open —", sub: "5h · Lunch" },
      { kind: "shift", tone: "lunch", time: "12–17", sub: "Lunch" },
      { kind: "shift", tone: "open", time: "— Open —", sub: "6h · Service" },
    ],
  },
];

const toneClass: Record<ShiftTone, string> = {
  foh: "border-[var(--landing-teal)]/35 bg-[var(--landing-teal)]/12 text-[#cdeae5]",
  kitchen: "border-[#c99a5b]/45 bg-[#c99a5b]/12 text-[#e8c590]",
  house: "border-[#9b8acc]/45 bg-[#9b8acc]/12 text-[#c9bce8]",
  bar: "border-[#5b8acc]/45 bg-[#5b8acc]/12 text-[#b8ccea]",
  lunch: "border-[#7fb89c]/40 bg-[#7fb89c]/12 text-[#c2e0cf]",
  open: "border-dashed border-[#d9a968]/55 bg-[#d9a968]/8 text-[#e8c08c]",
  clash: "border-[#b8674a]/55 bg-[#b8674a]/15 text-[#e89880]",
  off: "border-dashed border-white/10 bg-transparent text-white/30",
  leave: "border-[#9b8acc]/30 bg-[#9b8acc]/8 text-[#c9bce8]",
};

const statusChips = [
  { label: "2 conflicts", dot: "bg-[#e87864]" },
  { label: "3 open", dot: "bg-[var(--landing-teal)]" },
  { label: "1 leave clash", dot: "bg-[#a896d6]" },
  { label: "98% coverage", dot: "bg-[#7fb89c]" },
] as const;

const thingsToCheck = [
  {
    dot: "bg-[#e87864]",
    text: (
      <>
        <span className="font-semibold text-[var(--landing-cream)]">Liam O. · Wed</span> bar shift
        clashes with approved leave.
      </>
    ),
  },
  {
    dot: "bg-[#d9a968]",
    text: (
      <>
        <span className="font-semibold text-[var(--landing-cream)]">2 open lunch shifts</span>{" "}
        unfilled mid-week — coverage dips below target.
      </>
    ),
  },
  {
    dot: "bg-[var(--landing-teal)]",
    text: (
      <>
        <span className="font-semibold text-[var(--landing-cream)]">Kitchen hours</span> running
        under contract for Daniel M.
      </>
    ),
  },
];

const stats = [
  { label: "Shifts assigned", value: "24 / 27", tone: "ok" as const, sub: "Draft" },
  { label: "Coverage target", value: "98%", tone: "ok" as const, sub: "" },
  { label: "Leave clashes", value: "1", tone: "warn" as const, sub: "Wed · bar" },
  { label: "Labour estimate", value: "802h", tone: "ok" as const, sub: "of 820h budget" },
];

export function LandingProductProof() {
  return (
    <section
      className="relative overflow-hidden bg-[var(--landing-ink)] py-24 text-[var(--landing-cream)] sm:py-32"
      aria-labelledby="landing-product-proof-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(91,162,156,0.08),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="landing-section-eyebrow text-[var(--landing-teal)]">The week, in view</p>
            <h2
              id="landing-product-proof-title"
              className="landing-section-title text-[var(--landing-cream)]"
            >
              A working view of the{" "}
              <span className="italic text-[var(--landing-teal)]">week ahead.</span>
            </h2>
          </div>
          <p className="max-w-xl text-pretty text-[17px] leading-7 text-[var(--landing-cream)]/65">
            Coverage, clashes, open shifts and publish readiness — held together in one calm,
            considered view. Manager confirms every change before it reaches the floor.
          </p>
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--landing-paper)] text-[var(--landing-ink)] shadow-[0_60px_140px_-40px_rgba(0,0,0,0.7)]"
          aria-hidden="true"
        >
          {/* Top bar */}
          <header className="flex flex-wrap items-center gap-3 border-b border-[#0c1412]/10 px-5 py-3.5 sm:px-6">
            <span className="inline-flex items-center gap-2 rounded-md bg-[var(--landing-ink)] px-2.5 py-1 text-[12px] font-medium text-[var(--landing-cream)]">
              <span className="grid size-4 place-items-center rounded-sm bg-[var(--landing-teal)] text-[9px] font-bold text-[var(--landing-ink)]">
                D
              </span>
              Rota · Week 21
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9a968]/15 px-2.5 py-1 text-[11px] font-medium text-[#8e6629]">
              <span className="size-1.5 rounded-full bg-[#d9a968]" />
              Draft · not shared
            </span>
            <div className="ml-auto hidden flex-wrap gap-1.5 sm:flex">
              {statusChips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0c1412]/[0.04] px-2.5 py-1 text-[11px] text-[#3f4744]"
                >
                  <span className={`size-1.5 rounded-full ${c.dot}`} />
                  {c.label}
                </span>
              ))}
            </div>
          </header>

          {/* Mobile chips */}
          <div className="flex flex-wrap gap-1.5 border-b border-[#0c1412]/10 px-5 py-3 sm:hidden">
            {statusChips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0c1412]/[0.04] px-2.5 py-1 text-[11px] text-[#3f4744]"
              >
                <span className={`size-1.5 rounded-full ${c.dot}`} />
                {c.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="relative overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[180px_repeat(5,1fr)] border-b border-[#0c1412]/10 bg-[#fbf8f1]/60 px-2 py-3 landing-mono text-[10px] uppercase tracking-[0.14em] text-[#8c8273]">
                <span className="pl-3">Staff · 24</span>
                {days.map((d) => (
                  <span key={d.label} className="px-2">
                    {d.label} {d.date}
                  </span>
                ))}
              </div>
              {rows.map((row, ri) => (
                <div
                  key={row.name}
                  className={`grid grid-cols-[180px_repeat(5,1fr)] items-stretch px-2 py-2 ${
                    ri < rows.length - 1 ? "border-b border-dashed border-[#0c1412]/8" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 pl-3">
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-medium text-[var(--landing-cream)] ${row.avatar}`}
                    >
                      {row.initials}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[13.5px] font-medium text-[var(--landing-ink)]">
                        {row.name}
                      </span>
                      <span className="landing-mono mt-0.5 truncate text-[9.5px] uppercase tracking-[0.12em] text-[#8c8273]">
                        {row.role}
                      </span>
                    </div>
                  </div>
                  {row.cells.map((cell, ci) => (
                    <div key={ci} className="px-1.5 py-1">
                      <ShiftCell cell={cell} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid border-t border-[#0c1412]/10 bg-[#fbf8f1] sm:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`p-5 ${i < stats.length - 1 ? "border-b border-r border-dashed border-[#0c1412]/10 sm:border-b-0" : ""}`}
              >
                <div className="landing-mono mb-1.5 text-[9.5px] uppercase tracking-[0.16em] text-[#8c8273]">
                  {s.label}
                </div>
                <div
                  className={`font-serif text-[26px] font-medium leading-none tracking-[-0.02em] ${
                    s.tone === "ok" ? "text-[var(--landing-ink)]" : "text-[#a8651f]"
                  }`}
                >
                  {s.value}
                </div>
                {s.sub && (
                  <div className="landing-mono mt-1.5 text-[9.5px] uppercase tracking-[0.14em] text-[#8c8273]">
                    {s.sub}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 landing-mono text-[9.5px] uppercase tracking-[0.16em] text-white/35 sm:hidden">
          ← Scroll to see the full week →
        </p>

        {/* Things to check panel */}
        <div
          className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#10201d] to-[#0b1614]"
          aria-hidden="true"
        >
          <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg border border-[var(--landing-teal)]/30 bg-[var(--landing-teal)]/10 text-[var(--landing-teal)]">
                <Sparkles className="size-4" />
              </span>
              <span className="text-[15px] font-medium text-[var(--landing-cream)]">
                Things to check
              </span>
            </div>
            <span className="landing-mono text-[10px] uppercase tracking-[0.18em] text-[var(--landing-cream)]/45">
              AI
            </span>
          </header>

          <ul className="divide-y divide-white/8 px-6">
            {thingsToCheck.map((t, i) => (
              <li key={i} className="flex items-start gap-3 py-4 text-[14.5px] leading-6 text-[var(--landing-cream)]/72">
                <span className={`mt-2 size-2 shrink-0 rounded-full ${t.dot}`} />
                <span>{t.text}</span>
              </li>
            ))}
          </ul>

          <div className="m-6 mt-2 rounded-xl border border-[var(--landing-teal)]/25 bg-[var(--landing-teal)]/[0.06] p-5">
            <p className="landing-mono text-[10px] uppercase tracking-[0.18em] text-[var(--landing-teal)]">
              Ask · summarise leave impact
            </p>
            <p className="mt-3 text-[14.5px] leading-7 text-[var(--landing-cream)]/85">
              Priya&apos;s two days off drop housekeeping coverage by{" "}
              <span className="font-semibold text-[var(--landing-teal)]">4%</span> and create{" "}
              <span className="font-semibold text-[var(--landing-teal)]">2 open shifts</span>.
              Draft a staff update to review?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-[var(--landing-teal)] px-3 py-1.5 text-[12px] font-semibold text-[var(--landing-ink)]">
                Draft update
              </span>
              <span className="inline-flex items-center rounded-md border border-white/15 px-3 py-1.5 text-[12px] font-medium text-[var(--landing-cream)]/80">
                Not now
              </span>
            </div>
          </div>

          <footer className="border-t border-white/10 px-6 py-3 landing-mono text-[10px] uppercase tracking-[0.18em] text-[var(--landing-cream)]/50">
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--landing-teal)]" />
              AI suggests · you confirm before any change
            </span>
          </footer>
        </div>
      </div>
    </section>
  );
}

function ShiftCell({ cell }: { cell: Cell }) {
  if (cell.kind === "label") {
    return (
      <div
        className={`grid h-full place-items-center rounded-md border px-2 py-3 text-center landing-mono text-[10px] uppercase tracking-[0.14em] ${
          cell.tone === "leave"
            ? "border-[#9b8acc]/30 bg-[#9b8acc]/10 text-[#6c5ca8]"
            : "border-dashed border-[#0c1412]/15 bg-transparent text-[#8c8273]"
        }`}
      >
        {cell.text}
      </div>
    );
  }
  const cls = toneClass[cell.tone];
  return (
    <div
      className={`flex h-full flex-col justify-between gap-1 rounded-md border px-2.5 py-2 text-left ${cls.replace("text-[#cdeae5]", "text-[#2f6e68]").replace("text-[#e8c590]", "text-[#8e6629]").replace("text-[#c9bce8]", "text-[#6c5ca8]").replace("text-[#b8ccea]", "text-[#3f6aa6]").replace("text-[#c2e0cf]", "text-[#3f7256]").replace("text-[#e8c08c]", "text-[#8e6629]").replace("text-[#e89880]", "text-[#a8451f]")}`}
    >
      <span className="landing-mono text-[11px] font-medium tracking-[0.02em]">{cell.time}</span>
      <span className="landing-mono text-[9.5px] uppercase tracking-[0.1em] opacity-80">
        {cell.sub}
      </span>
    </div>
  );
}
