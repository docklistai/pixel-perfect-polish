import { formatMinutes } from "../lib/reportsPresentation";
import { shortWeekLabel } from "../lib/reportsPeriod";
import type { ReportsContractReview, ReportsLeaveImpact, ReportsWeek } from "../types";

const LEAVE_LABELS = {
  annual_leave: "Annual leave",
  personal: "Personal",
  sick: "Sick leave",
  unpaid: "Unpaid leave",
  other: "Other leave",
};

function EmptyDetail({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">{children}</p>;
}

export function LeaveImpactDetail({ rows }: { rows: ReportsLeaveImpact[] }) {
  if (rows.length === 0)
    return (
      <EmptyDetail>
        No approved absence overlaps assigned published work in this period.
      </EmptyDetail>
    );
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Approved leave only. Reasons and manager notes are never included.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="tbl min-w-[620px] w-full text-xs">
          <thead>
            <tr>
              <th>Team member</th>
              <th>Approved leave</th>
              <th>Dates</th>
              <th className="text-right">Shifts</th>
              <th className="text-right">Hours affected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.leaveRequestId}>
                <td className="font-semibold">{row.staffName}</td>
                <td>{LEAVE_LABELS[row.leaveType]}</td>
                <td>
                  {shortWeekLabel(row.startDate)} – {shortWeekLabel(row.endDate)}
                </td>
                <td className="text-right tabular-nums">{row.affectedShifts}</td>
                <td className="text-right font-mono tabular-nums">
                  {formatMinutes(row.affectedMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TimeReviewDetail({ weeks }: { weeks: ReportsWeek[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="tbl min-w-[520px] w-full text-xs">
        <thead>
          <tr>
            <th>Rota week</th>
            <th className="text-right">Approved hours</th>
            <th className="text-right">Awaiting manager review</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.weekStart}>
              <td className="font-semibold">
                {shortWeekLabel(week.weekStart)} – {shortWeekLabel(week.weekEnd)}
              </td>
              <td className="text-right font-mono tabular-nums">
                {formatMinutes(week.approvedWorkedMinutes)}
              </td>
              <td className="text-right tabular-nums">{week.awaitingReviewEntries}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContractReviewDetail({ rows }: { rows: ReportsContractReview[] }) {
  if (rows.length === 0)
    return (
      <EmptyDetail>
        Current contract values are only compared when the exact current rota week is selected. No
        historical contract trend is inferred.
      </EmptyDetail>
    );
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Current recorded contract minutes compared with the selected current rota week. This is not
        a legal overtime assessment.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="tbl min-w-[580px] w-full text-xs">
          <thead>
            <tr>
              <th>Team member</th>
              <th className="text-right">Current contract</th>
              <th className="text-right">Scheduled</th>
              <th className="text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.staffMemberId}>
                <td className="font-semibold">{row.staffName}</td>
                <td className="text-right font-mono tabular-nums">
                  {formatMinutes(row.contractedMinutes)}
                </td>
                <td className="text-right font-mono tabular-nums">
                  {formatMinutes(row.scheduledMinutes)}
                </td>
                <td className="text-right font-mono tabular-nums text-warning">
                  +{formatMinutes(row.differenceMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
