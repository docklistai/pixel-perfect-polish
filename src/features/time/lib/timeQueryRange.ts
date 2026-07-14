import type { ReviewPeriod } from "./reviewPeriod";

export const TIME_BOUNDARY_BUFFER_DAYS = 1;
export const TIME_QUERY_FILTER_AUTHORITY = "work-date-period+client-department-v1";
export const TIME_OPERATIONAL_LOOKBACK_DAYS = 35;
export const TIME_STAFF_LOOKBACK_DAYS = 120;

export interface TimeDateRange {
  startDate: string;
  endDate: string;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftIsoDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
}

export function bufferedTimeRange(range: TimeDateRange): TimeDateRange {
  return {
    startDate: shiftIsoDate(range.startDate, -TIME_BOUNDARY_BUFFER_DAYS),
    endDate: shiftIsoDate(range.endDate, TIME_BOUNDARY_BUFFER_DAYS),
  };
}

export function periodTimeRange(period: ReviewPeriod): TimeDateRange {
  return { startDate: period.startIso, endDate: period.endIso };
}

export function rollingTimeRange(now: Date, lookbackDays: number): TimeDateRange {
  const endDate = isoDay(now);
  return { startDate: shiftIsoDate(endDate, -lookbackDays), endDate };
}

export const timeQueryKeys = {
  root: ["time"] as const,
  workspace: (workspaceId: string | null) => ["time", "workspace", workspaceId] as const,
  period: (workspaceId: string | null, range: TimeDateRange) =>
    [
      "time",
      "workspace",
      workspaceId,
      {
        startDate: range.startDate,
        endDate: range.endDate,
        boundaryDays: TIME_BOUNDARY_BUFFER_DAYS,
        filterAuthority: TIME_QUERY_FILTER_AUTHORITY,
      },
    ] as const,
  pendingPreview: (workspaceId: string | null, limit: number) =>
    [
      "time",
      "pending-preview",
      workspaceId,
      { limit, authority: "all-actionable-limit-v1" },
    ] as const,
  operationalCounts: (workspaceId: string | null, range: TimeDateRange) =>
    ["time", "operational-counts", workspaceId, { ...range, authority: "head-count-v1" }] as const,
  staff: (workspaceId: string | null, staffMemberId: string, range: TimeDateRange) =>
    [
      "time",
      "staff",
      workspaceId,
      staffMemberId,
      { ...range, authority: "staff-window-v1" },
    ] as const,
  review: (workspaceId: string | null, timeEntryId: string | null) =>
    ["time", "entry-review", workspaceId, timeEntryId] as const,
};
