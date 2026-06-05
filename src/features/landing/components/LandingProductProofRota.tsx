import React from "react";

const rotaRows = [
  {
    initials: "SC",
    color: "linear-gradient(135deg,#2BB8B5,#0E9591)",
    name: "Sophie C.",
    role: "FOH",
    days: [
      { cls: "s-foh", time: "08–16", sub: "Front of House" },
      { cls: "s-foh", time: "09–17", sub: "Front of House" },
      { cls: "s-foh", time: "08–16", sub: "Front of House" },
      { cls: "s-off", label: "Day off" },
    ],
  },
  {
    initials: "DM",
    color: "linear-gradient(135deg,#E8A33D,#D08A1A)",
    name: "Daniel M.",
    role: "Chef",
    days: [
      { cls: "s-kit", time: "09–17", sub: "Kitchen" },
      { cls: "s-kit", time: "13–21", sub: "Kitchen" },
      { cls: "s-open", label: "— OPEN —", sub: "6h · Prep" },
      { cls: "s-kit", time: "13–21", sub: "Kitchen" },
    ],
  },
  {
    initials: "PP",
    color: "linear-gradient(135deg,#8B72E0,#6E55C9)",
    name: "Priya P.",
    role: "Housekeeping",
    days: [
      { cls: "s-hk", time: "06–14", sub: "Housekeeping" },
      { cls: "s-hk", time: "06–14", sub: "Housekeeping" },
      { cls: "s-leave", label: "Annual leave" },
      { cls: "s-leave", label: "Annual leave" },
    ],
  },
  {
    initials: "LO",
    color: "linear-gradient(135deg,#3B82F6,#2563CC)",
    name: "Liam O.",
    role: "Bar",
    days: [
      { cls: "s-bar", time: "16–00", sub: "Bar" },
      { cls: "s-clash", time: "16–00", sub: "Clash · leave" },
      { cls: "s-off", label: "Day off" },
      { cls: "s-bar", time: "16–00", sub: "Bar" },
    ],
  },
] as const;

const days = ["Tue 13", "Wed 14", "Thu 15", "Fri 16"];

export function LandingProductProofRota() {
  return (
    <div
      className="landing-product-rota relative z-[1] hidden sm:flex flex-col overflow-hidden rounded-xl border border-white/10"
      style={{
        background: "linear-gradient(180deg,#111a17,#0c1210)",
        color: "var(--landing-cream)",
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Rota Header bar inside mockup */}
      <div
        className="flex flex-wrap items-center gap-[10px] border-b px-3.5 py-3"
        style={{ borderColor: "rgba(255,255,255,.08)" }}
      >
        <span
          className="grid size-6 shrink-0 place-items-center rounded-[7px] text-[11px] font-extrabold"
          style={{
            background: "linear-gradient(135deg,var(--landing-teal-400),var(--landing-teal))",
            color: "#08222A",
          }}
        >
          D
        </span>
        <div>
          <span className="text-[13px] font-semibold text-[var(--landing-cream)]">
            Rota · Week 21
          </span>
          <p className="landing-mono text-[9px] uppercase text-[var(--landing-ink-400)]">
            Friday night service
          </p>
        </div>
        <span
          className="landing-mono ml-auto inline-flex items-center gap-[6px] rounded-full border px-[9px] py-1 text-[10px] font-semibold"
          style={{
            background: "var(--landing-amber-50)",
            color: "var(--landing-amber-700)",
            borderColor: "var(--landing-amber-100)",
          }}
        >
          <span className="size-[6px] rounded-full bg-[var(--landing-amber)] motion-safe:animate-pulse" />
          Draft changes private
        </span>
      </div>

      <div className="grid grid-cols-3 border-b border-white/10 text-center">
        {[
          ["22 / 24", "assigned"],
          ["94%", "coverage"],
          ["2", "open shifts"],
        ].map(([value, label]) => (
          <div key={label} className="border-r border-white/10 px-3 py-2 last:border-r-0">
            <p className="landing-mono text-[12px] font-bold text-[var(--landing-cream)]">
              {value}
            </p>
            <p className="landing-mono mt-0.5 text-[8px] uppercase text-white/38">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-x-auto p-3">
        <div className="min-w-0 rounded-lg border" style={{ borderColor: "rgba(255,255,255,.1)" }}>
          <div
            className="grid"
            style={{ gridTemplateColumns: "minmax(78px, 124px) repeat(4, minmax(52px, 1fr))" }}
          >
            <div className="mrh font-semibold">Staff</div>
            {days.map((d) => (
              <div key={d} className="mrh text-center font-semibold">
                {d}
              </div>
            ))}

            {rotaRows.map((row) => (
              <React.Fragment key={row.name}>
                <div className="mrn">
                  <span
                    className="grid size-[24px] shrink-0 place-items-center rounded-full text-[10px] font-bold text-white shadow-sm"
                    style={{ background: row.color }}
                  >
                    {row.initials}
                  </span>
                  <div className="truncate">
                    <span className="block text-[11px] font-semibold text-[var(--landing-ink-900)]">
                      {row.name}
                    </span>
                    <span className="landing-mono block text-[8px] uppercase tracking-wider text-[var(--landing-ink-400)]">
                      {row.role}
                    </span>
                  </div>
                </div>

                {row.days.map((day, di) => (
                  <div key={row.name + "-day-" + di} className="mrc">
                    <div className={`mshift ${day.cls}`}>
                      {"label" in day ? (
                        <span className="flex flex-1 items-center justify-center text-center font-medium">
                          {day.label}
                        </span>
                      ) : (
                        <>
                          <span className="font-semibold">{day.time}</span>
                          <span className="mt truncate">{day.sub}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
            <div className="mrn">
              <span className="grid size-[24px] shrink-0 place-items-center rounded-full border border-dashed border-[#d9ad70]/80 bg-[#d9ad70]/10 text-[10px] font-bold text-[#d9ad70]">
                +
              </span>
              <div className="truncate">
                <span className="block text-[11px] font-semibold text-[var(--landing-cream)]">
                  Open
                </span>
                <span className="landing-mono block text-[8px] uppercase text-white/42">
                  Needs cover
                </span>
              </div>
            </div>
            {["", "", "Prep", "Porter"].map((label, index) => (
              <div key={`open-${index}`} className="mrc">
                {label ? (
                  <div className="mshift s-open">{label}</div>
                ) : (
                  <div className="s-off">—</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
