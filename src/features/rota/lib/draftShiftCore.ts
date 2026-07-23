import type {
  DraftShift,
  DraftShiftInput,
  DraftShiftStatus,
  RotaDayIndex,
  ShiftId,
  ShiftTone,
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
  return seeds.map((seed) => ({ ...seed, id: makeShiftId(), breakMinutes: 30 }));
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
    breakMinutes: input.breakMinutes ?? 30,
    tone,
    status,
    departmentId: input.departmentId,
    deptOverride: input.deptOverride,
    colourOverride: input.colourOverride,
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

export { MAX_SHIFT_DURATION_MINUTES };
