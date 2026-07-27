import type { DraftShift, DraftShiftInput, ShiftId, StaffMember } from "../types";
import { getShiftCopyBlockedReason } from "./assignableStaff";
import { getShiftDuplicateBlockedReason } from "./duplicateShiftRules";
import { executeRepeatShiftPlan, planRepeatShift, type RepeatShiftResult } from "./repeatShift";

type DuplicateShiftCopyResult =
  | { status: "blocked"; reason: string }
  | { status: "completed"; shiftId: ShiftId | null };

type RepeatShiftCopyResult =
  | { status: "blocked"; reason: string }
  | { status: "completed"; result: RepeatShiftResult };

export async function executeDuplicateShiftCopy(
  source: DraftShift | undefined,
  assignableStaff: StaffMember[],
  duplicate: (shiftId: ShiftId) => ShiftId | null | Promise<ShiftId | null>,
): Promise<DuplicateShiftCopyResult> {
  // The single gate for both the draft store and the live rota, so neither can
  // duplicate a final-day shift onto itself and report it as the next day.
  const blockedReason = getShiftDuplicateBlockedReason(source, assignableStaff);
  if (blockedReason) return { status: "blocked", reason: blockedReason };
  return { status: "completed", shiftId: await duplicate(source!.id) };
}

export async function executeRepeatShiftCopy({
  source,
  dayIndexes,
  shifts,
  assignableStaff,
  addShift,
}: {
  source: DraftShift | undefined;
  dayIndexes: number[];
  shifts: DraftShift[];
  assignableStaff: StaffMember[];
  addShift: (input: DraftShiftInput) => void | Promise<void>;
}): Promise<RepeatShiftCopyResult> {
  const blockedReason = getShiftCopyBlockedReason(source, assignableStaff);
  if (blockedReason) return { status: "blocked", reason: blockedReason };

  const plan = planRepeatShift(source!, dayIndexes, shifts);
  return { status: "completed", result: await executeRepeatShiftPlan(plan, addShift) };
}
