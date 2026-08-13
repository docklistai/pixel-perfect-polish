import { Card } from "@/components/dl";
import { formatMinutes } from "../lib/reportsPresentation";
import { shortWeekLabel } from "../lib/reportsPeriod";
import type { ReportsWeek } from "../types";

export function TimeApprovalTrend({ weeks }: { weeks: ReportsWeek[] }) {
  const maxMinutes = Math.max(1, ...weeks.map((week) => week.approvedWorkedMinutes));
  return (
    <Card className="col-span-12 p-4 lg:col-span-4 lg:p-5">
      <div className="mb-3">
        <div className="text-sm font-semibold">Time review</div>
        <div className="text-xs text-muted-foreground">
          Approved hours and entries awaiting review
        </div>
      </div>
      <div className="space-y-3">
        {weeks.map((week) => {
          const width = (week.approvedWorkedMinutes / maxMinutes) * 100;
          return (
            <div key={week.weekStart}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold">{shortWeekLabel(week.weekStart)}</span>
                <span className="text-muted-foreground">
                  {formatMinutes(week.approvedWorkedMinutes)} approved ·{" "}
                  {week.awaitingReviewEntries} awaiting
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                aria-label={`${formatMinutes(week.approvedWorkedMinutes)} approved worked hours`}
              >
                <div className="h-full rounded-full bg-info" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        This is deterministic review status, not an attendance percentage. Manage individual entries
        in Time.
      </p>
    </Card>
  );
}
