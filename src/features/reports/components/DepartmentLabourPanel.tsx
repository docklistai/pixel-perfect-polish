import { Card } from "@/components/dl";

export function DepartmentLabourPanel() {
  return (
    <Card className="col-span-12 lg:col-span-4 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
          LABOUR % BY DEPARTMENT
        </div>
        <span className="text-[11px] text-muted-foreground">vs target (pp)</span>
      </div>
      {[
        ["Front of House", 80, "+0.9pp", "success", "On target"],
        ["Kitchen", 92, "+2.6pp", "danger", "Above target"],
        ["Housekeeping", 65, "-1.4pp", "success", "On target"],
        ["Bar", 88, "+1.2pp", "danger", "Above target"],
      ].map(([n, w, d, tone, label]) => (
        <div key={n as string} className="py-2.5">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{n}</span>
            <span className="font-semibold">{((w as number) / 3 + 5).toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div style={{ width: `${(w as number) - 10}%`, background: "var(--brand)" }} />
            <div style={{ width: "10%", background: "var(--brand)", opacity: 0.4 }} />
          </div>
          <div
            className={`text-[11px] mt-1 flex items-center justify-between ${tone === "danger" ? "text-danger" : "text-success"}`}
          >
            <span>{label as string}</span>
            <span>{d}</span>
          </div>
        </div>
      ))}
      <div className="text-xs text-muted-foreground mt-2">
        Kitchen and Bar are driving labour % over target.
      </div>
    </Card>
  );
}
