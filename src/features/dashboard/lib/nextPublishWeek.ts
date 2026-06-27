import { getWeekStartIso } from "@/features/rota/lib/weekHelpers";

// The dashboard "Next publish" card targets the upcoming rota week (current week + 1).
const NEXT_PUBLISH_WEEK_OFFSET = 1;

// Formats a week-start ISO date (YYYY-MM-DD) as "15 Jun 2026" without timezone drift.
export function formatPublishWeekLabel(weekStartIso: string): string {
  return new Date(`${weekStartIso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDashboardPublishWeekLabel(weekStartIso: string | null | undefined): string {
  return weekStartIso ? formatPublishWeekLabel(weekStartIso) : "Current rota week";
}

// Derives the week-commencing label for the next rota to publish from the shared
// week helper, so the dashboard never carries a hardcoded stale date.
export function getNextPublishWeekLabel(): string {
  return formatPublishWeekLabel(getWeekStartIso(NEXT_PUBLISH_WEEK_OFFSET));
}
