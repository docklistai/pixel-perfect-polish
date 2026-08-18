import { Activity, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card, StatusBadge } from "@/components/dl";
import { formatClockTime } from "@/features/time/lib/timePulseFormat";
import type { TimePulseRow, TimePulseState } from "@/features/time/lib/timePulseTypes";

/**
 * Time Pulse — read-only live attendance.
 *
 * Every line is a fact the workspace already holds: a published shift time, a
 * clock event, or the absence of one. There is deliberately no score, ranking,
 * streak, or "no-show" language, and nothing shown here is written back.
 */

const STATE_TONE: Record<TimePulseState, "success" | "warning" | "info" | "muted"> = {
  on_site: "success",
  on_break: "info",
  checked_out: "muted",
  not_clocked_in: "warning",
  scheduled_upcoming: "muted",
};

function scheduleLabel(row: TimePulseRow): string | null {
  if (!row.scheduledStartAt || !row.scheduledEndAt) return null;
  return `${formatClockTime(row.scheduledStartAt, row.timezone)}–${formatClockTime(row.scheduledEndAt, row.timezone)}`;
}

function PulseRow({ row, showLocation }: { row: TimePulseRow; showLocation: boolean }) {
  const schedule = scheduleLabel(row);
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-3 last:border-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{row.staffName}</div>
        <div className="truncate text-xs text-muted-foreground">
          {[schedule, row.roleName, showLocation ? row.locationName : null]
            .filter(Boolean)
            .join(" · ") || "No published shift"}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge tone={STATE_TONE[row.state]}>{row.label}</StatusBadge>
        <div className="flex flex-wrap justify-end gap-1">
          {row.isLateClockIn && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
              Late clock-in
            </span>
          )}
          {row.isUnscheduled && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Unscheduled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardTimePulse({
  rows,
  locationCount,
  generatedAt,
  workspaceTimezone,
  isLoading,
  isError,
  isRefreshing,
  onRefresh,
}: {
  rows: TimePulseRow[];
  locationCount: number;
  /** When the shown data was read, or null before the first successful read. */
  generatedAt: string | null;
  workspaceTimezone: string | null;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const onSite = rows.filter((row) => row.state === "on_site" || row.state === "on_break").length;
  const showLocation = locationCount > 1;
  // The board does not poll, so it must say when it was read rather than let a
  // stale screen imply it is live.
  const asAt =
    generatedAt && workspaceTimezone ? formatClockTime(generatedAt, workspaceTimezone) : null;

  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-brand" aria-hidden />
            <div className="dock-section-eyebrow">Time Pulse</div>
          </div>
          {!isLoading && !isError && <StatusBadge tone="muted">{onSite} on site</StatusBadge>}
        </div>
        {!isLoading && !isError && (
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground" aria-live="polite">
              {isRefreshing ? "Refreshing…" : asAt ? `As at ${asAt}` : "Not read yet"}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 rounded px-1 text-[11px] font-semibold text-brand transition hover:text-brand/80 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Checking today&apos;s attendance…
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
          <div className="text-sm font-medium">We couldn&apos;t read attendance</div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded px-1 text-xs font-semibold text-brand transition hover:text-brand/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <RefreshCw className="h-3 w-3" aria-hidden /> Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          Nobody is scheduled and nobody has clocked in today.
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto">
          {rows.map((row) => (
            <PulseRow key={row.key} row={row} showLocation={showLocation} />
          ))}
        </div>
      )}
    </Card>
  );
}
