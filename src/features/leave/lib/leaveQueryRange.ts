const DAY_MS = 86_400_000;

export const LEAVE_OPERATIONAL_PAST_DAYS = 90;
export const LEAVE_OPERATIONAL_FUTURE_DAYS = 370;

export interface LeaveDateRange {
  startDate: string;
  endDate: string;
}

function shiftIsoDate(isoDate: string, days: number): string {
  const instant = Date.parse(`${isoDate}T12:00:00Z`) + days * DAY_MS;
  return new Date(instant).toISOString().slice(0, 10);
}

export function operationalLeaveRange(now = new Date()): LeaveDateRange {
  const today = now.toISOString().slice(0, 10);
  return {
    startDate: shiftIsoDate(today, -LEAVE_OPERATIONAL_PAST_DAYS),
    endDate: shiftIsoDate(today, LEAVE_OPERATIONAL_FUTURE_DAYS),
  };
}

export function rotaLeaveRange(weekStart: string): LeaveDateRange {
  return { startDate: weekStart, endDate: shiftIsoDate(weekStart, 6) };
}

export const leaveQueryKeys = {
  all: (workspaceId: string | null) => ["leave", workspaceId] as const,
  operational: (workspaceId: string | null, range: LeaveDateRange) =>
    ["leave", workspaceId, "operational-plus-actionable", range.startDate, range.endDate] as const,
  rota: (workspaceId: string | null, range: LeaveDateRange) =>
    ["leave", workspaceId, "rota-overlap", range.startDate, range.endDate] as const,
  staff: (workspaceId: string | null, staffId: string, range: LeaveDateRange) =>
    [
      "leave",
      workspaceId,
      "staff-operational-plus-actionable",
      staffId,
      range.startDate,
      range.endDate,
    ] as const,
  pendingCount: (workspaceId: string | null) => ["leave", workspaceId, "pending-count"] as const,
  pendingPreview: (workspaceId: string | null, limit: number) =>
    ["leave", workspaceId, "pending-preview", limit] as const,
  counts: (workspaceId: string | null, range: LeaveDateRange) =>
    ["leave", workspaceId, "operational-counts", range.startDate, range.endDate] as const,
};
