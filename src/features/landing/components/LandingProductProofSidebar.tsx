import React from "react";

const readiness = [
  {
    label: "Shifts assigned",
    value: "22 / 24",
    ok: false,
  },
  {
    label: "Coverage target",
    value: "94%",
    ok: true,
  },
  {
    label: "Leave clashes",
    value: "1",
    ok: false,
  },
] as const;

const things = [
  {
    color: "var(--landing-amber)",
    lead: "Liam O. · Wed",
    body: "bar shift overlaps approved leave.",
  },
  {
    color: "var(--landing-amber)",
    lead: "2 open shifts",
    body: "prep and Friday service need manager cover.",
  },
  {
    color: "var(--landing-teal-400)",
    lead: "Kitchen hours",
    body: "Daniel M. may need one more confirmed shift.",
  },
] as const;

export function LandingProductProofSidebar() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-col">
      {/* Publish readiness panel */}
      <div className="landing-surface-dark landing-surface-dark-brass p-4">
        <div
          className="flex items-center gap-2 border-b pb-3"
          style={{ borderColor: "rgba(255,255,255,.08)" }}
        >
          <span className="text-[13.5px] font-bold text-white">Publish readiness</span>
          <span className="landing-mono ml-auto inline-flex items-center gap-[6px] rounded-full border border-[var(--landing-amber-100)]/20 bg-amber-500/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#d9ad70]">
            2 checks left
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          {readiness.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between text-[13px] text-white/70"
            >
              <span>{item.label}</span>
              <span
                className="landing-mono font-bold"
                style={{ color: item.ok ? "var(--landing-teal-400)" : "#d9ad70" }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Action Button: Publish (simulated) */}
        <button
          disabled
          className="mt-4 w-full cursor-not-allowed rounded-lg border border-[#c9954d]/40 bg-[#c9954d]/20 py-2.5 text-[12.5px] font-semibold text-[#d9ad70] opacity-80"
        >
          Manager review required
        </button>
      </div>

      {/* AI Things to check panel */}
      <div
        className="rounded-xl border border-white/10 p-4"
        style={{
          background: "var(--landing-ink-raised)",
          boxShadow: "0 30px 60px -15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="flex items-center gap-2 border-b pb-3"
          style={{ borderColor: "rgba(255,255,255,.08)" }}
        >
          <span className="text-[13.5px] font-bold text-white">AI things to check</span>
          <span className="landing-mono ml-auto text-[9.5px] uppercase tracking-wider text-white/45">
            support layer
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {things.map((t) => (
            <div
              key={t.lead}
              className="flex items-start gap-2.5 text-[12.5px] leading-[1.45] text-white/70"
            >
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full"
                style={{ background: t.color }}
              />
              <span className="min-w-0 text-pretty">
                <span className="font-semibold text-white">{t.lead}</span> {t.body}
              </span>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <div
          className="landing-mono mt-4 flex items-center gap-2 border-t pt-3 text-[9.5px] uppercase tracking-wider text-white/40"
          style={{ borderColor: "rgba(255,255,255,.08)" }}
        >
          <span className="size-1.5 rounded-full bg-[var(--landing-teal-400)]" />
          <span>AI suggests · manager confirms</span>
        </div>
      </div>
    </div>
  );
}
