import type { RotaDayIndex } from "../types";
import {
  buildShiftDateTimeRange,
  dayIndexFromDates,
  formatTimeInTimezone,
  liveWeekLabel,
} from "../lib/liveRotaDates";
import { reportServerError, toSafeBusinessMessage } from "@/lib/safe-errors";

export type LiveCopySourceShiftRow = {
  location_id: string;
  department_id: string;
  staff_member_id: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role_name: string;
  assignment_status: "scheduled" | "open";
};

export type LiveCopyInsertShiftRow = LiveCopySourceShiftRow & {
  id?: string;
  workspace_id: string;
  rota_week_id: string;
};

export type LiveCopyPreviousWeekPreview = {
  previousWeekStart: string;
  previousWeekLabel: string;
  targetWeekStart: string;
  targetWeekLabel: string;
  sourceShiftCount: number;
  currentShiftCount: number;
  assignedShiftCount: number;
  openShiftCount: number;
};

export function buildLiveCopyRows({
  sourceRows,
  workspaceId,
  targetWeekId,
  targetLocationId,
  previousWeekStart,
  targetWeekStart,
  timezone,
}: {
  sourceRows: LiveCopySourceShiftRow[];
  workspaceId: string;
  targetWeekId: string;
  targetLocationId: string;
  previousWeekStart: string;
  targetWeekStart: string;
  timezone: string;
}): LiveCopyInsertShiftRow[] {
  if (sourceRows.length === 0) throw new Error("Previous week has no shifts to copy.");

  return sourceRows.map((source) => {
    const dayIndex = dayIndexFromDates(previousWeekStart, source.shift_date) as RotaDayIndex;
    const range = buildShiftDateTimeRange({
      weekStart: targetWeekStart,
      dayIndex,
      start: formatTimeInTimezone(source.starts_at, timezone),
      end: formatTimeInTimezone(source.ends_at, timezone),
      timezone,
    });
    return {
      workspace_id: workspaceId,
      rota_week_id: targetWeekId,
      location_id: targetLocationId,
      department_id: source.department_id,
      staff_member_id: source.staff_member_id,
      shift_date: range.shiftDate,
      starts_at: range.startsAt,
      ends_at: range.endsAt,
      break_minutes: source.break_minutes,
      role_name: source.role_name,
      assignment_status: source.assignment_status,
    };
  });
}

export function buildLiveCopyPreview({
  sourceRows,
  currentShiftCount,
  previousWeekStart,
  targetWeekStart,
}: {
  sourceRows: LiveCopySourceShiftRow[];
  currentShiftCount: number;
  previousWeekStart: string;
  targetWeekStart: string;
}): LiveCopyPreviousWeekPreview {
  if (sourceRows.length === 0) throw new Error("Previous week has no shifts to copy.");
  return {
    previousWeekStart,
    previousWeekLabel: liveWeekLabel(previousWeekStart),
    targetWeekStart,
    targetWeekLabel: liveWeekLabel(targetWeekStart),
    sourceShiftCount: sourceRows.length,
    currentShiftCount,
    assignedShiftCount: sourceRows.filter((row) => row.staff_member_id).length,
    openShiftCount: sourceRows.filter((row) => row.assignment_status === "open").length,
  };
}

// This module only ever runs inside a server-function handler
// (copyPreviousLiveRotaWeekServer.ts), so reportServerError's console.error
// lands in a real server log, never the browser.
function messageOf(error: unknown, operation: string): string {
  const businessMessage = toSafeBusinessMessage(error, "");
  if (businessMessage) return businessMessage;
  const failure = reportServerError(error, {
    operation,
    fallbackMessage: "an unexpected database error",
  });
  return `${failure.message} (Reference: ${failure.referenceId})`;
}

export async function applyLiveCopyRows({
  nextRows,
  currentRows,
  deleteCurrentRows,
  insertRows,
  restoreRows,
}: {
  nextRows: LiveCopyInsertShiftRow[];
  currentRows: LiveCopyInsertShiftRow[];
  deleteCurrentRows: () => Promise<void>;
  insertRows: (rows: LiveCopyInsertShiftRow[]) => Promise<void>;
  restoreRows: (rows: LiveCopyInsertShiftRow[]) => Promise<void>;
}): Promise<void> {
  if (nextRows.length === 0) throw new Error("Previous week has no shifts to copy.");

  await deleteCurrentRows();
  try {
    await insertRows(nextRows);
  } catch (insertError) {
    if (currentRows.length > 0) {
      try {
        await restoreRows(currentRows);
      } catch (restoreError) {
        throw new Error(
          `Previous week was not copied, and the original draft could not be restored. Refresh this rota before editing again. Insert failed: ${messageOf(insertError, "rota.copy_previous_week.insert")}. Restore failed: ${messageOf(restoreError, "rota.copy_previous_week.restore")}.`,
        );
      }
      throw new Error(
        `Previous week was not copied. The original draft was restored. Insert failed: ${messageOf(insertError, "rota.copy_previous_week.insert")}.`,
      );
    }
    throw new Error(
      `Previous week was not copied. This week had no draft shifts to restore. Insert failed: ${messageOf(insertError, "rota.copy_previous_week.insert")}.`,
    );
  }
}
