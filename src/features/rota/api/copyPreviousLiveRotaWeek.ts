import { liveWeekLabel } from "../lib/liveRotaDates";

/**
 * Preview helpers for "copy previous week". The copy itself is one atomic
 * database transaction (`rpc_copy_previous_rota_week`); this module only
 * shapes the read-only preview a manager confirms before running it.
 */

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
