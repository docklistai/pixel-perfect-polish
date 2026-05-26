import * as React from "react";
import { Download, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

type TimesheetFilter = "all" | "pending" | "flagged" | "approved";

interface TimesheetRow {
  day: string;
  scheduled: string;
  actual: string;
  hours: number;
  status: "pending" | "flagged" | "approved";
  note: string | null;
}

function StatusPill({ status }: { status: TimesheetRow["status"] }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-success-soft text-success text-[11px] font-semibold px-2 py-0.5">
        <CheckCircle className="h-3 w-3" aria-hidden /> Approved
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center rounded-md bg-warning-soft text-warning text-[11px] font-semibold px-2 py-0.5">
        Pending
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-md bg-danger-soft text-danger text-[11px] font-semibold px-2 py-0.5">
      Flagged
    </span>
  );
}

interface ProfileTimesheetTableProps {
  rows: TimesheetRow[];
  onToast: (msg: string) => void;
}

export function ProfileTimesheetTable({ rows, onToast }: ProfileTimesheetTableProps) {
  const [filter, setFilter] = React.useState<TimesheetFilter>("all");
  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = filtered.filter((r) => r.status !== "approved").length;

  return (
    <div className="dock-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60 flex-wrap">
        <div className="text-sm font-semibold">Recent timesheets</div>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          {(["all", "pending", "flagged", "approved"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                filter === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onToast("timesheets.csv prepared (demo)")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" aria-hidden /> Export
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[600px] w-full text-sm">
          <thead>
            <tr className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-muted-foreground border-b border-border">
              <th className="text-left py-2.5 px-5">Day</th>
              <th className="text-left py-2.5">Scheduled</th>
              <th className="text-left py-2.5">Clocked</th>
              <th className="text-left py-2.5">Hours</th>
              <th className="text-left py-2.5">Status</th>
              <th className="text-right py-2.5 pr-5">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={i}
                className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => onToast(`Adjust timesheet for ${r.day} (demo)`)}
              >
                <td className="py-3 px-5 font-medium text-sm">{r.day}</td>
                <td className="py-3 text-muted-foreground font-mono text-xs">{r.scheduled}</td>
                <td className="py-3 font-mono text-xs">{r.actual}</td>
                <td className="py-3 font-semibold tabular-nums">{r.hours.toFixed(1)}h</td>
                <td className="py-3">
                  <div>
                    <StatusPill status={r.status} />
                    {r.note && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{r.note}</div>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={r.status === "approved"}
                    aria-label={`Approve ${r.day}`}
                    onClick={() => onToast(`${r.day} approved (demo)`)}
                    className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-card px-2.5 text-[11px] font-semibold text-brand hover:bg-muted/50 disabled:text-muted-foreground disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-t border-border/60 text-xs text-muted-foreground">
        <span>
          Showing 1-{filtered.length} of {filtered.length} records
          {pendingCount > 0 ? ` · ${pendingCount} need review` : ""}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          disabled
          aria-label="Previous timesheet page"
          className="size-7 rounded-lg flex items-center justify-center border border-border bg-card opacity-50"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          disabled
          aria-label="Next timesheet page"
          className="size-7 rounded-lg flex items-center justify-center border border-border bg-card opacity-50"
        >
          <ChevronRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
