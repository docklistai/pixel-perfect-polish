import React from "react";

const mobileShifts = [
  {
    initials: "SC",
    color: "linear-gradient(135deg,#2BB8B5,#0E9591)",
    name: "Sophie C.",
    role: "Front of House",
    time: "08:00 – 16:00",
    status: "ok",
  },
  {
    initials: "DM",
    color: "linear-gradient(135deg,#E8A33D,#D08A1A)",
    name: "Daniel M.",
    role: "Kitchen",
    time: "13:00 – 21:00",
    status: "ok",
  },
  {
    initials: "LO",
    color: "linear-gradient(135deg,#3B82F6,#2563CC)",
    name: "Liam O.",
    role: "Bar",
    time: "16:00 – 00:00",
    status: "clash",
    label: "Clash · leave",
  },
  {
    initials: "+",
    color: "",
    name: "Open Shift",
    role: "Needs cover",
    time: "16:00 – 00:00",
    status: "open",
    label: "Unassigned",
  },
] as const;

export function LandingProductProofRotaMobile() {
  return (
    <div
      className="landing-product-rota-mobile relative z-[1] flex flex-col overflow-hidden rounded-xl border border-white/10 sm:hidden"
      style={{
        background: "linear-gradient(180deg,#111a17,#0c1210)",
        color: "var(--landing-cream)",
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3.5"
        style={{ borderColor: "rgba(255,255,255,.08)" }}
      >
        <div>
          <span className="block text-[14px] font-semibold text-[var(--landing-cream)]">
            Fri 16 · Night Service
          </span>
          <p className="landing-mono mt-0.5 text-[11px] uppercase text-[var(--landing-ink-400)]">
            Week 21
          </p>
        </div>
        <span
          className="landing-mono inline-flex items-center gap-[6px] rounded-full border px-2.5 py-1.5 text-[10px] font-bold"
          style={{
            background: "var(--landing-amber-50)",
            color: "var(--landing-amber-700)",
            borderColor: "var(--landing-amber-100)",
          }}
        >
          <span className="size-[6px] rounded-full bg-[var(--landing-amber)] motion-safe:animate-pulse" />
          Draft
        </span>
      </div>

      <div className="flex flex-col divide-y divide-white/5">
        {mobileShifts.map((shift, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-white/[0.02]"
          >
            <span
              className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-extrabold shadow-sm ${
                shift.status === "open"
                  ? "border border-dashed border-[#d9ad70]/80 bg-[#d9ad70]/10 text-[#d9ad70]"
                  : "text-white"
              }`}
              style={shift.status !== "open" ? { background: shift.color } : {}}
            >
              {shift.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-[15px] font-bold text-[var(--landing-cream)]">
                  {shift.name}
                </span>
                <span className="text-[13px] font-semibold tracking-wide text-white/90">
                  {shift.time}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="landing-mono truncate text-[12px] uppercase text-[var(--landing-ink-400)]">
                  {shift.role}
                </span>
                {shift.status === "clash" && (
                  <span className="landing-mono text-[10px] font-bold uppercase text-[#d9ad70]">
                    {shift.label}
                  </span>
                )}
                {shift.status === "open" && (
                  <span className="landing-mono text-[10px] font-bold uppercase text-[#d9ad70]">
                    {shift.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
