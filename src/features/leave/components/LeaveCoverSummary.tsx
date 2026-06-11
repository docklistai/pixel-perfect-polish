import { Card } from "@/components/dl";

export function LeaveCoverSummary() {
  return (
    <>
      <Card className="col-span-12 lg:col-span-6 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="dock-section-eyebrow">COVER SUMMARY</div>
          <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
            This month
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Days booked", "15", "4 requests pending"],
            ["Available days", "89", "Across 8 staff"],
            ["Most common type", "Annual Leave", "76% of days"],
            ["Avg. notice given", "10.4 days", "↑ 2.1 vs last month"],
          ].map(([l, v, s]) => (
            <div key={l}>
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="text-xl font-bold mt-1">{v}</div>
              <div className="text-[11px] text-success">{s}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-6 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="dock-section-eyebrow">TEAM COVERAGE</div>
          <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
            Next 14 days
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Good coverage", "85%", "success"],
            ["At risk", "10%", "warning"],
            ["Undercovered", "5%", "danger"],
          ].map(([l, v, tone]) => (
            <div key={l}>
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="text-xl font-bold mt-1" style={{ color: `var(--${tone})` }}>
                {v}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-3 rounded-full overflow-hidden flex">
          <div style={{ width: "85%", background: "var(--success)" }} />
          <div style={{ width: "10%", background: "var(--warning)" }} />
          <div style={{ width: "5%", background: "var(--danger)" }} />
        </div>
      </Card>
    </>
  );
}
