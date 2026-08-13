import { Card } from "@/components/dl";
import { formatMinutes } from "../lib/reportsPresentation";
import type { ReportsDepartmentHours } from "../types";

const COLORS = ["#3B82F6", "#E8A33D", "#1DA672", "#E94358", "#8B5CF6", "#97A0B3"];

function donutBackground(rows: ReportsDepartmentHours[], total: number) {
  let offset = 0;
  const stops = rows.map((row, index) => {
    const start = offset;
    offset += total ? (row.scheduledMinutes / total) * 100 : 0;
    return `${COLORS[index % COLORS.length]} ${start}% ${offset}%`;
  });
  return total ? `conic-gradient(${stops.join(",")})` : "var(--muted)";
}

export function DepartmentLabourPanel({ rows }: { rows: ReportsDepartmentHours[] }) {
  const total = rows.reduce((sum, row) => sum + row.scheduledMinutes, 0);
  return (
    <Card className="col-span-12 p-4 lg:col-span-4 lg:p-5">
      <div className="mb-3">
        <div className="text-sm font-semibold">Scheduled hours by department</div>
        <div className="text-xs text-muted-foreground">
          Assigned published shifts · breaks deducted
        </div>
      </div>
      <div
        className="relative mx-auto grid size-40 place-items-center rounded-full"
        style={{ background: donutBackground(rows, total) }}
        role="img"
        aria-label={`${formatMinutes(total)} scheduled across ${rows.length} departments`}
      >
        <div className="grid size-24 place-items-center rounded-full bg-card text-center shadow-sm">
          <div>
            <div className="font-display text-xl font-bold">{formatMinutes(total)}</div>
            <div className="text-[10px] text-muted-foreground">Scheduled</div>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No published assigned hours in this period.
          </p>
        ) : (
          rows.map((row, index) => (
            <div key={row.id} className="flex items-center gap-2 text-[13px]">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <span className="min-w-0 grow truncate">
                {row.name}
                {row.status === "inactive" ? " (inactive)" : ""}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {formatMinutes(row.scheduledMinutes)}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
