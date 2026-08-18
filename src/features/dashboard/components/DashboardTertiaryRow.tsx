import { DashboardTimePulse } from "./DashboardTimePulse";
import { DashboardTimesheets } from "./DashboardTimesheets";
import { DashboardAnnouncements } from "./DashboardAnnouncements";
import { DashboardQuickActions } from "./DashboardQuickActions";
import type { useTimePulse } from "../hooks/useTimePulse";
import type { AnnouncementItem, QuickActionItem, TimesheetItem } from "../types";

/**
 * Home's tertiary card row.
 *
 * Extracted from the route so this row's *composition* is a rendered contract
 * rather than a claim about JSX buried in a 340-line route: which cards a demo
 * workspace sees, which a live one sees, and what turning the Time Pulse
 * experiment on adds. The route keeps orchestration; this file owns the row.
 *
 * The column count is deliberately different per surface:
 *
 *   * Live keeps `xl:grid-cols-4`, unchanged from before Time Pulse existed, so
 *     enabling or disabling the experiment never reflows the live dashboard.
 *   * Demo uses `xl:grid-cols-3` because it renders exactly three cards. It used
 *     to render a fourth — a placeholder that hardcoded "0" and an empty state
 *     while ignoring the data it was handed — which has been deliberately
 *     retired. Leaving the 4-column track would have left a visible gap where
 *     that placeholder used to be, so the row is rebalanced rather than padded
 *     with an invented replacement card.
 *
 * Both class strings are written out in full so Tailwind's scanner sees them.
 */
export function DashboardTertiaryRow({
  isLive,
  timePulse,
  timesheetItems,
  announcementItems,
  quickActionItems,
}: {
  isLive: boolean;
  timePulse: ReturnType<typeof useTimePulse>;
  timesheetItems: TimesheetItem[];
  announcementItems: AnnouncementItem[];
  quickActionItems: QuickActionItem[];
}) {
  return (
    <div
      className={`mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 ${
        isLive ? "xl:grid-cols-4" : "xl:grid-cols-3"
      }`}
    >
      {timePulse.enabled && (
        <DashboardTimePulse
          rows={timePulse.data?.rows ?? []}
          locationCount={timePulse.data?.locationCount ?? 0}
          generatedAt={timePulse.data?.generatedAt ?? null}
          workspaceTimezone={timePulse.data?.workspaceTimezone ?? null}
          isLoading={timePulse.isLoading}
          isError={timePulse.isError}
          isRefreshing={timePulse.isRefreshing}
          onRefresh={timePulse.refresh}
        />
      )}
      <DashboardTimesheets items={timesheetItems} />
      {!isLive && <DashboardAnnouncements items={announcementItems} />}
      <DashboardQuickActions items={quickActionItems} />
    </div>
  );
}
