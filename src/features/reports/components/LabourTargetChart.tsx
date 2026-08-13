import { Card } from "@/components/dl";
import { buildTrendPoints, weekPublicationLabel } from "../lib/reportsPresentation";
import type { ReportsPageData } from "../types";

export function LabourTargetChart({ data }: { data: ReportsPageData }) {
  const points = buildTrendPoints(data);
  const maxHours = Math.max(1, ...points.map((point) => point.scheduledHours + point.openHours));
  const summary = points
    .map(
      (point) =>
        `${point.label}: ${point.scheduledHours} scheduled hours, ${point.openHours} open hours, ${weekPublicationLabel(point.status)}`,
    )
    .join(". ");

  return (
    <Card className="col-span-12 p-4 lg:col-span-8 lg:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div id="reports-chart-title" className="text-sm font-semibold">
            Published scheduling trend
          </div>
          <div className="text-xs text-muted-foreground">
            Net hours after breaks · latest published snapshot per rota week
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="dot bg-brand" /> Scheduled
          </span>
          <span className="flex items-center gap-2">
            <span className="dot bg-warning" /> Open work
          </span>
        </div>
      </div>
      <p id="reports-chart-summary" className="sr-only">
        {summary}
      </p>
      <div
        role="img"
        aria-labelledby="reports-chart-title"
        aria-describedby="reports-chart-summary"
        className="grid min-h-64 grid-cols-4 items-end gap-3 border-b border-border/70 px-2 pt-4"
      >
        {points.map((point) => {
          const scheduledHeight = (point.scheduledHours / maxHours) * 190;
          const openHeight = (point.openHours / maxHours) * 190;
          return (
            <div key={point.weekStart} className="flex min-w-0 flex-col items-center">
              <div className="mb-2 text-center text-[10px] font-medium text-muted-foreground">
                {point.status === "not_published"
                  ? "Not published"
                  : `${point.scheduledHours.toFixed(1)}h`}
              </div>
              <div className="flex h-[190px] w-full max-w-24 flex-col justify-end overflow-hidden rounded-t-lg bg-muted/40">
                <div
                  className="bg-warning/85"
                  style={{ height: openHeight }}
                  title={`${point.openHours.toFixed(1)} open hours`}
                />
                <div
                  className="bg-brand"
                  style={{ height: scheduledHeight }}
                  title={`${point.scheduledHours.toFixed(1)} scheduled hours`}
                />
              </div>
              <div className="mt-2 text-xs font-semibold">{point.label}</div>
              <div className="min-h-4 text-center text-[10px] text-muted-foreground">
                {weekPublicationLabel(point.status)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
