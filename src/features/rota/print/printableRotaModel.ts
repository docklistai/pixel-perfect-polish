import type { DraftShift, RotaDayIndex, StaffMember } from "../types";
import { buildPrintIdentityLine, disambiguateStaffNames } from "./printableRotaNames";

/**
 * View model for the printed rota.
 *
 * Everything the printed document can possibly show is built here, and this
 * type is the privacy boundary: there is deliberately no field for labour cost,
 * labour percentage, coverage, readiness, conflicts, manager identity or email.
 * The renderer is a dumb consumer of this shape, so manager-only data cannot
 * reach paper by accident — it has nowhere to sit.
 */

export type PrintableShift = {
  start: string;
  end: string;
  role: string;
  /** Draft department label when one is set; null when the workspace has none. */
  department: string | null;
  /** Only surfaced when there is a real break to show. */
  breakMinutes: number | null;
  open: boolean;
};

export type PrintableStaffRow = {
  key: string;
  /** Display name, disambiguated only if another row shares the same name. */
  name: string;
  role: string;
  /** Always length 7; each day holds that day's shifts in start-time order. */
  days: PrintableShift[][];
};

export type PrintableStatus = {
  label: "Draft" | "Published" | "Unpublished changes";
  /** Spelled out so a monochrome print is unambiguous without colour. */
  detail: string;
};

export type PrintableRota = {
  workspaceName: string;
  locationName: string;
  /** Workspace and location for the header, collapsed to one when they match. */
  identityLine: string;
  weekLabel: string;
  printedAt: string;
  status: PrintableStatus;
  /** Always exactly 7 labels, Monday through Sunday. */
  dayLabels: string[];
  staffRows: PrintableStaffRow[];
  /** Unassigned shifts, always length 7. */
  openShiftDays: PrintableShift[][];
  hasAnyShift: boolean;
  /** Honest message when there is nothing to print; null when there is. */
  emptyMessage: string | null;
};

export const PRINT_DAY_COUNT = 7;

const FALLBACK_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EMPTY_MESSAGE = "No shifts scheduled for this week yet.";

function statusOf(published: boolean, hasUnpublishedChanges: boolean): PrintableStatus {
  if (published && hasUnpublishedChanges) {
    return {
      label: "Unpublished changes",
      detail: "Edited since publishing — staff still see the previously published version.",
    };
  }
  if (published) {
    return { label: "Published", detail: "Published — this is what staff can see." };
  }
  return { label: "Draft", detail: "Draft — not published. Staff cannot see this yet." };
}

function toPrintableShift(
  shift: DraftShift,
  departmentNameById?: Map<string, string>,
): PrintableShift {
  const open = shift.staffId === null || shift.status === "open";
  // The shift's real department wins. `deptOverride` is only the legacy
  // free-text label, kept as a fallback so older rows still print something.
  const department =
    (shift.departmentId ? departmentNameById?.get(shift.departmentId) : null) ??
    shift.departmentName ??
    shift.deptOverride ??
    null;
  return {
    start: shift.start,
    end: shift.end,
    role: shift.role,
    department,
    breakMinutes: shift.breakMinutes > 0 ? shift.breakMinutes : null,
    open,
  };
}

/** Split shifts must read in the order they are worked. */
function byStartTime(a: PrintableShift, b: PrintableShift): number {
  return a.start.localeCompare(b.start);
}

function emptyDays(): PrintableShift[][] {
  return Array.from({ length: PRINT_DAY_COUNT }, () => []);
}

function isPrintableDay(dayIndex: number): dayIndex is RotaDayIndex {
  return Number.isInteger(dayIndex) && dayIndex >= 0 && dayIndex < PRINT_DAY_COUNT;
}

/** Buckets a flat shift list into seven day columns, each in start-time order. */
function daysFromShifts(
  shifts: DraftShift[],
  departmentNameById?: Map<string, string>,
): PrintableShift[][] {
  const days = emptyDays();
  for (const shift of shifts) {
    if (!isPrintableDay(shift.dayIndex)) continue;
    days[shift.dayIndex]!.push(toPrintableShift(shift, departmentNameById));
  }
  return days.map((day) => day.sort(byStartTime));
}

export type BuildPrintableRotaInput = {
  workspaceName: string | null;
  locationName: string | null;
  weekLabel: string;
  /** Day labels from the grid. Only the label is taken — never hours or coverage. */
  dayLabels: string[];
  /**
   * The full roster and the full week's shifts — deliberately not the grid's
   * filtered rows, so an active search or filter can never quietly drop someone
   * from a rota that goes on the wall.
   */
  staff: StaffMember[];
  shifts: DraftShift[];
  published: boolean;
  hasUnpublishedChanges: boolean;
  printedAt: Date;
  /** Department id → name, so the sheet shows the shift's real department. */
  departmentNameById?: Map<string, string>;
};

export function buildPrintableRota(input: BuildPrintableRotaInput): PrintableRota {
  const dayLabels = Array.from(
    { length: PRINT_DAY_COUNT },
    (_, index) => input.dayLabels[index] ?? FALLBACK_DAY_LABELS[index]!,
  );

  const names = disambiguateStaffNames(
    input.staff.map((member) => ({ name: member.name, role: member.role })),
  );

  const shiftsByStaff = new Map<string, DraftShift[]>();
  const openShifts: DraftShift[] = [];
  for (const shift of input.shifts) {
    if (shift.staffId === null) {
      openShifts.push(shift);
      continue;
    }
    const key = String(shift.staffId);
    const bucket = shiftsByStaff.get(key);
    if (bucket) bucket.push(shift);
    else shiftsByStaff.set(key, [shift]);
  }

  const staffRows: PrintableStaffRow[] = input.staff.map((member, index) => ({
    key: String(member.id),
    name: names[index] ?? member.name,
    role: member.role,
    days: daysFromShifts(shiftsByStaff.get(String(member.id)) ?? [], input.departmentNameById),
  }));

  const openShiftDays = daysFromShifts(openShifts, input.departmentNameById);

  const hasAnyShift =
    staffRows.some((row) => row.days.some((day) => day.length > 0)) ||
    openShiftDays.some((day) => day.length > 0);

  const workspaceName = input.workspaceName?.trim() || "DocklistAI";
  const locationName = input.locationName?.trim() || "All locations";

  return {
    workspaceName,
    locationName,
    identityLine: buildPrintIdentityLine(workspaceName, locationName),
    weekLabel: input.weekLabel,
    printedAt: formatPrintedAt(input.printedAt),
    status: statusOf(input.published, input.hasUnpublishedChanges),
    dayLabels,
    staffRows,
    openShiftDays,
    hasAnyShift,
    emptyMessage: hasAnyShift ? null : EMPTY_MESSAGE,
  };
}

function formatPrintedAt(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
