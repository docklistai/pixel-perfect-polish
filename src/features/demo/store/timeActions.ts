import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import type { StoredTimesheetRow, TimeAdjustment, TimesheetStatus } from "@/features/time/types";
import type { WorkspaceStore } from "./createWorkspaceStore";

function audit(title: string, body: string) {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: `Today, ${DEMO_WORLD.nowLabel}`,
    title,
    body,
  };
}

function paidLabel(clockIn: string, clockOut: string, breakTime: string): string {
  const minutes = (value: string) => {
    const [hours, mins] = value.split(":").map(Number);
    return Number.isFinite(hours) && Number.isFinite(mins) ? hours! * 60 + mins! : null;
  };
  const start = minutes(clockIn);
  const end = minutes(clockOut);
  const unpaid = minutes(breakTime);
  if (start === null || end === null || unpaid === null) return "—";
  const worked = (end <= start ? end + 24 * 60 : end) - start - unpaid;
  return `${Math.floor(worked / 60)} h ${String(Math.max(0, worked % 60)).padStart(2, "0")} m`;
}

function patchRows(
  store: WorkspaceStore,
  ids: string[],
  updater: (row: StoredTimesheetRow) => StoredTimesheetRow,
): void {
  const selected = new Set(ids);
  store.setState((state) => ({
    ...state,
    timeRows: state.timeRows.map((row) => (selected.has(row.id) ? updater(row) : row)),
  }));
}

export function setTimesheetStatus(
  store: WorkspaceStore,
  ids: string[],
  status: TimesheetStatus,
  reason: string,
): void {
  patchRows(store, ids, (row) => ({
    ...row,
    status,
    auditTrail: [
      audit(status === "approved" ? "Approved" : "Approval reverted", reason),
      ...row.auditTrail,
    ],
  }));
}

export function setTimesheetFlagged(
  store: WorkspaceStore,
  ids: string[],
  flagged: boolean,
  reason: string,
): void {
  patchRows(store, ids, (row) => ({
    ...row,
    flagged,
    auditTrail: [audit(flagged ? "Flagged for review" : "Flag removed", reason), ...row.auditTrail],
  }));
}

export function adjustTimesheet(
  store: WorkspaceStore,
  id: string,
  adjustment: TimeAdjustment,
): void {
  patchRows(store, [id], (row) => ({
    ...row,
    in: adjustment.clockIn,
    inN: "Adjusted",
    inTone: undefined,
    out: adjustment.clockOut,
    outN: "Adjusted",
    outTone: undefined,
    brk: adjustment.breakTime,
    paid: paidLabel(adjustment.clockIn, adjustment.clockOut, adjustment.breakTime),
    exc: "—",
    excTone: undefined,
    status: "pending",
    auditTrail: [
      audit("Timesheet adjusted", `${adjustment.reason}. ${adjustment.note || "No staff note."}`),
      ...row.auditTrail,
    ],
  }));
}
