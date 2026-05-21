import { Card } from "@/components/dl";
import { cal, CAL_DAYS, CAL_DATES } from "../data/leaveDemoData";

export function LeaveCalendarPanel() {
  return (
    <Card className="col-span-12 lg:col-span-6 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
          MAY 2026
        </div>
        <div
          className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          <span className="px-3 py-1 rounded-md">Week</span>
          <span className="px-3 py-1 rounded-md bg-muted">2 Weeks</span>
        </div>
      </div>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Leave calendar, scroll horizontally to see full 14-day view"
      >
        <div className="min-w-[1040px]">
          <div className="grid grid-cols-[140px_repeat(14,1fr)] text-[10px] text-muted-foreground border-b border-border pb-1">
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              STAFF MEMBER
            </div>
            {CAL_DAYS.map((d, i) => (
              <div key={i} className="text-center">
                <div>{d}</div>
                <div className="text-foreground font-medium">{CAL_DATES[i]}</div>
              </div>
            ))}
          </div>
          {cal.map((c) => (
            <div
              key={c.n}
              className="grid grid-cols-[140px_repeat(14,1fr)] items-center py-2 border-b last:border-b-0 border-border/60"
            >
              <div className="flex items-center gap-2 pr-2">
                <img
                  src={`https://i.pravatar.cc/64?img=${c.img}`}
                  className="h-7 w-7 rounded-full object-cover"
                  alt=""
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{c.n}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{c.dept}</div>
                </div>
              </div>
              <div className="col-span-14 grid grid-cols-14 relative h-7">
                <div
                  className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md text-[10px] flex items-center px-2 ${
                    c.type === "annual"
                      ? "bg-success-soft text-success border border-success/30"
                      : c.type === "pending"
                        ? "bg-warning-soft text-warning border border-warning/30"
                        : "bg-muted text-muted-foreground border border-border"
                  }`}
                  style={{
                    left: `${(c.range[0] / 14) * 100}%`,
                    width: `${((c.range[1] - c.range[0] + 1) / 14) * 100}%`,
                    backgroundImage:
                      c.type === "unavail"
                        ? "repeating-linear-gradient(45deg, transparent, transparent 4px, oklch(0.92 0.01 240) 4px, oklch(0.92 0.01 240) 8px)"
                        : undefined,
                  }}
                >
                  {c.type === "annual"
                    ? "Approved leave"
                    : c.type === "pending"
                      ? "Pending request"
                      : "Unavailable"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-success-soft border border-success/30" /> Approved
          leave
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-6 rounded border border-border"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 4px, oklch(0.92 0.01 240) 4px, oklch(0.92 0.01 240) 8px)",
            }}
          />{" "}
          Unavailable
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-warning-soft border border-warning/30" /> Pending
        </span>
      </div>
    </Card>
  );
}
