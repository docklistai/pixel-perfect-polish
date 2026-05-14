import type {
  DraftShift,
  DraftShiftInput,
  DraftShiftStatus,
  RotaDayIndex,
  RotaGridCell,
  RotaGridOpenRow,
  RotaGridStaffRow,
  ShiftId,
  ShiftTone,
  StaffId,
  StaffMember,
} from "../types";
import type { SeedShift } from "../data/mockData";

export const DAY_COUNT = 7;
const MAX_SHIFT_DURATION_MINUTES = 16 * 60;

let shiftCounter = 0;
export function makeShiftId(): ShiftId {
  shiftCounter += 1;
  return `dft-${Date.now().toString(36)}-${shiftCounter.toString(36)}`;
}

export function isRotaDayIndex(value: number): value is RotaDayIndex {
  return Number.isInteger(value) && value >= 0 && value < DAY_COUNT;
}

export function createInitialDraftShifts(seeds: SeedShift[]): DraftShift[] {
  return seeds.map((seed) => ({ ...seed, id: makeShiftId() }));
}

export function makeDraftShift(input: DraftShiftInput): DraftShift {
  const status: DraftShiftStatus = input.status ?? (input.staffId === null ? "open" : "scheduled");
  const tone: ShiftTone = input.tone ?? (status === "open" ? "open" : "info");
  return {
    id: makeShiftId(),
    dayIndex: input.dayIndex,
    staffId: input.staffId,
    role: input.role,
    start: input.start,
    end: input.end,
    tone,
    status,
  };
}

export function applyShiftPatch(shift: DraftShift, patch: Partial<DraftShift>): DraftShift {
  const next: DraftShift = { ...shift, ...patch };
  if (next.staffId === null && next.status === "scheduled") {
    next.status = "open";
    next.tone = "open";
  }
  if (next.staffId !== null && next.status === "open") {
    next.status = "scheduled";
    if (next.tone === "open") next.tone = "info";
  }
  return next;
}

function emptyCells(): RotaGridCell[] {
  return Array.from({ length: DAY_COUNT }, () => ({ shifts: [] }));
}

function partitionByStaffAndDay(shifts: DraftShift[]): {
  byStaff: Map<StaffId, RotaGridCell[]>;
  open: RotaGridCell[];
} {
  const byStaff = new Map<StaffId, RotaGridCell[]>();
  const open = emptyCells();
  for (const shift of shifts) {
    if (shift.staffId === null) {
      open[shift.dayIndex]?.shifts.push(shift);
      continue;
    }
    let cells = byStaff.get(shift.staffId);
    if (!cells) {
      cells = emptyCells();
      byStaff.set(shift.staffId, cells);
    }
    cells[shift.dayIndex]?.shifts.push(shift);
  }
  return { byStaff, open };
}

export function buildStaffRows(
  staff: StaffMember[],
  draftShifts: DraftShift[],
): RotaGridStaffRow[] {
  const { byStaff } = partitionByStaffAndDay(draftShifts);
  return staff.map((member) => ({
    kind: "staff",
    staff: member,
    cells: byStaff.get(member.id) ?? emptyCells(),
  }));
}

export function buildOpenRow(draftShifts: DraftShift[]): RotaGridOpenRow {
  const { open } = partitionByStaffAndDay(draftShifts);
  return { kind: "open", cells: open };
}

export function parseHHMMToMinutes(value: string): number | null {
  const [hStr, mStr] = value.split(":");
  if (!hStr) return null;
  const hour = Number(hStr);
  const minute = mStr === undefined ? 0 : Number(mStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function getShiftDurationMinutes(start: string, end: string): number | null {
  const startMin = parseHHMMToMinutes(start);
  const endMin = parseHHMMToMinutes(end);
  if (startMin === null || endMin === null) return null;

  let duration = endMin - startMin;
  if (duration < 0) duration += 24 * 60;
  if (duration === 0) return null;

  return duration;
}

export function isValidShiftTimeRange(start: string, end: string): boolean {
  const duration = getShiftDurationMinutes(start, end);
  return duration !== null && duration <= MAX_SHIFT_DURATION_MINUTES;
}

export function shiftHours(start: string, end: string): number {
  const duration = getShiftDurationMinutes(start, end);
  if (duration === null || duration > MAX_SHIFT_DURATION_MINUTES) return 0;
  return duration / 60;
}

export function formatShiftTime(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function formatTime(hhmm: string): string {
  const minutes = parseHHMMToMinutes(hhmm);
  if (minutes === null) return hhmm;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour >= 12 ? "pm" : "am";
  const display = ((hour + 11) % 12) + 1;
  return minute === 0
    ? `${display}${period}`
    : `${display}:${String(minute).padStart(2, "0")}${period}`;
}

export function isStartBeforeEnd(start: string, end: string): boolean {
  return isValidShiftTimeRange(start, end);
}
