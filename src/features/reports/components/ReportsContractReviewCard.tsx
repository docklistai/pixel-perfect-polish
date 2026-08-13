import { Card } from "@/components/dl";
import { formatMinutes } from "../lib/reportsPresentation";
import type { ReportsContractReview, ReportsPeriodPreset } from "../types";

export function ReportsContractReviewCard({
  rows,
  preset,
  onOpen,
}: {
  rows: ReportsContractReview[];
  preset: ReportsPeriodPreset;
  onOpen: () => void;
}) {
  return (
    <Card className="col-span-12 p-4 lg:col-span-4 lg:p-5">
      <div className="mb-3">
        <div className="text-sm font-semibold">Contracted vs scheduled</div>
        <div className="text-xs text-muted-foreground">
          Current contract values · current rota week only
        </div>
      </div>
      {preset !== "current_week" ? (
        <p className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          Choose Current rota week to compare present contract values. Historical contract trends
          are intentionally not inferred.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-success-soft/40 p-3 text-xs text-muted-foreground">
          No current-week contract comparison is above its recorded weekly minutes.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 4).map((row) => (
            <div key={row.staffMemberId} className="flex items-start justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold">{row.staffName}</div>
                <div className="text-muted-foreground">
                  {formatMinutes(row.contractedMinutes)} current contract
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatMinutes(row.scheduledMinutes)}</div>
                <div className="text-warning">+{formatMinutes(row.differenceMinutes)}</div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={onOpen}
            className="text-xs font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Review current-week comparisons
          </button>
        </div>
      )}
    </Card>
  );
}
