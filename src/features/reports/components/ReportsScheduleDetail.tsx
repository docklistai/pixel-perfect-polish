import { formatMinutes, weekPublicationLabel } from "../lib/reportsPresentation";
import { shortWeekLabel } from "../lib/reportsPeriod";
import type { ReportsCoverageRow, ReportsWeek } from "../types";

function EmptyDetail({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">{children}</p>;
}

export function PublishedScheduleDetail({ weeks }: { weeks: ReportsWeek[] }) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Each row is one calendar rota week. Published figures use only that week&apos;s latest
        immutable snapshot.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="tbl min-w-[600px] w-full text-xs">
          <thead>
            <tr>
              <th>Rota week</th>
              <th>Status</th>
              <th className="text-right">Assigned</th>
              <th className="text-right">Open</th>
              <th className="text-right">Net hours</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.weekStart}>
                <td className="font-semibold">
                  {shortWeekLabel(week.weekStart)} – {shortWeekLabel(week.weekEnd)}
                </td>
                <td>{weekPublicationLabel(week.publicationStatus)}</td>
                <td className="text-right tabular-nums">{week.assignedShifts}</td>
                <td className="text-right tabular-nums">{week.openShifts}</td>
                <td className="text-right font-mono tabular-nums">
                  {formatMinutes(week.scheduledMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CoverageScheduleDetail({ rows }: { rows: ReportsCoverageRow[] }) {
  if (rows.length === 0)
    return <EmptyDetail>No published schedule coverage rows match these filters.</EmptyDetail>;
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        One row per date, location and department. Hours deduct recorded shift breaks.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="tbl min-w-[760px] w-full text-xs">
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Department</th>
              <th className="text-right">Assigned</th>
              <th className="text-right">Open</th>
              <th className="text-right">Scheduled</th>
              <th className="text-right">Open hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.date}:${row.location}:${row.department}`}>
                <td className="font-semibold">{shortWeekLabel(row.date)}</td>
                <td>{row.location}</td>
                <td>{row.department}</td>
                <td className="text-right tabular-nums">{row.assignedShifts}</td>
                <td className="text-right tabular-nums">{row.openShifts}</td>
                <td className="text-right font-mono tabular-nums">
                  {formatMinutes(row.scheduledMinutes)}
                </td>
                <td className="text-right font-mono tabular-nums">
                  {formatMinutes(row.openMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
