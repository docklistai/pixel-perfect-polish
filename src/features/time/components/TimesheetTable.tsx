import { Card } from "@/components/dl";
import type { TimesheetRow } from "../types";

const stTones: Record<string, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-danger-soft text-danger",
};

const noteTones: Record<string, string> = { warning: "text-warning", danger: "text-danger" };

interface Props {
  rows: TimesheetRow[];
  approved: Set<string>;
  declined: Set<string>;
  onReview: (row: TimesheetRow) => void;
}

export function TimesheetTable({ rows, approved, declined, onReview }: Props) {
  return (
    <Card className="rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-semibold">Weekly Timesheet</span>{" "}
          <span className="text-xs text-muted-foreground ml-1">{rows.length} staff</span>
        </div>
        <div className="text-xs text-muted-foreground">18 – 24 May 2026</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-sm">
          <thead>
            <tr className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground border-y border-border">
              <th className="py-2 text-left">Staff</th>
              <th className="py-2 text-left">
                Scheduled
                <div className="font-normal normal-case tracking-normal text-[10px]">
                  Start − End
                </div>
              </th>
              <th className="py-2 text-left">
                Clock In
                <div className="font-normal normal-case tracking-normal text-[10px]">Actual</div>
              </th>
              <th className="py-2 text-left">
                Clock Out
                <div className="font-normal normal-case tracking-normal text-[10px]">Actual</div>
              </th>
              <th className="py-2 text-left">
                Breaks
                <div className="font-normal normal-case tracking-normal text-[10px]">Unpaid</div>
              </th>
              <th className="py-2 text-left">Paid Hours</th>
              <th className="py-2 text-left">Exceptions</th>
              <th className="py-2 text-left">Approval</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isApproved = approved.has(r.id);
              const isDeclined = declined.has(r.id);
              const stLabel = isApproved ? "Approved" : isDeclined ? "Declined" : r.st;
              const stTone = isApproved
                ? ("success" as const)
                : isDeclined
                  ? ("muted" as const)
                  : r.stTone;
              return (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://i.pravatar.cc/64?img=${r.img}`}
                        className="h-7 w-7 rounded-full object-cover"
                        alt=""
                      />
                      <div>
                        <div className="font-medium">{r.n}</div>
                        <div className="text-[11px] text-muted-foreground">{r.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">{r.sched}</td>
                  <td className="py-3">
                    <div>{r.in}</div>
                    <div
                      className={`text-[11px] ${r.inTone ? noteTones[r.inTone] : "text-muted-foreground"}`}
                    >
                      {r.inN}
                    </div>
                  </td>
                  <td className="py-3">
                    <div>{r.out}</div>
                    <div
                      className={`text-[11px] ${r.outTone ? noteTones[r.outTone] : "text-muted-foreground"}`}
                    >
                      {r.outN}
                    </div>
                  </td>
                  <td className="py-3">{r.brk}</td>
                  <td className="py-3">{r.paid}</td>
                  <td className="py-3">
                    {r.exc === "—" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={`rounded-md px-2 py-0.5 text-[11px] ${stTones.danger}`}>
                        {r.exc}
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${stTones[stTone]}`}
                    >
                      {stLabel}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {!isApproved && !isDeclined && (
                      <button
                        type="button"
                        className="text-[11px] text-brand font-semibold"
                        onClick={() => onReview(r)}
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pt-3 text-xs text-muted-foreground">
        Showing {rows.length} staff for this week
      </div>
    </Card>
  );
}
