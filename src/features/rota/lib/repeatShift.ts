import type { DraftShift, DraftShiftInput, RotaDayIndex, StaffMember } from "../types";
import { isShiftCopyAssignable } from "./assignableStaff";
import { intervalConflict } from "./scheduling/calendarInterval";
import { draftShiftTimes } from "./scheduling/draftShiftAdapter";

export interface RepeatShiftPlan {
  inputs: DraftShiftInput[];
  skippedCount: number;
}

export interface RepeatShiftResult {
  successCount: number;
  skippedCount: number;
  failedCount: number;
}

export interface RepeatShiftFeedback {
  tone: "success" | "warning" | "error";
  title: string;
  description?: string;
}

/**
 * Whether repeating `source` onto `dayIndex` would collide.
 *
 * Two different questions, deliberately answered differently:
 *
 * - An **assigned** shift collides when the person would be double-booked. That is
 *   an interval question, so it goes through the shared engine and is therefore
 *   correct across midnight — repeating a 22:00–02:00 shift onto Tuesday now sees
 *   Wednesday's early shift.
 * - An **open** shift collides only when identical demand already exists on that
 *   day. This is not an interval question: identical open demand is legitimate in
 *   general, but repeating a shift onto a day that already has the same one is
 *   what the manager almost certainly did not mean.
 */
function isCollision(
  source: DraftShift,
  dayIndex: number,
  shifts: DraftShift[],
  dayIsoDates?: readonly string[],
): boolean {
  if (source.staffId !== null) {
    const candidate = { ...source, dayIndex: dayIndex as RotaDayIndex };
    return shifts.some(
      (shift) =>
        shift.staffId === source.staffId &&
        shift.id !== source.id &&
        intervalConflict(
          draftShiftTimes(candidate, dayIsoDates),
          draftShiftTimes(shift, dayIsoDates),
        ) !== null,
    );
  }
  return shifts.some(
    (shift) =>
      shift.dayIndex === dayIndex &&
      shift.staffId === null &&
      shift.role === source.role &&
      shift.start === source.start &&
      shift.end === source.end &&
      shift.breakMinutes === source.breakMinutes &&
      shift.deptOverride === source.deptOverride,
  );
}

function repeatInput(source: DraftShift, dayIndex: RotaDayIndex): DraftShiftInput {
  const isOpen = source.staffId === null;
  return {
    dayIndex,
    staffId: source.staffId,
    role: source.role,
    start: source.start,
    end: source.end,
    breakMinutes: source.breakMinutes,
    status: isOpen ? "open" : "scheduled",
    tone: isOpen ? "open" : source.status === "conflict" ? "info" : source.tone,
    // The repeat must land in the same department as the shift it copies, not
    // wherever the staff member's profile would otherwise put it.
    departmentId: source.departmentId ?? null,
    deptOverride: source.deptOverride,
    colourOverride: source.colourOverride,
  };
}

export function planRepeatShift(
  source: DraftShift,
  dayIndexes: number[],
  shifts: DraftShift[],
  dayIsoDates?: readonly string[],
): RepeatShiftPlan {
  const inputs: DraftShiftInput[] = [];
  let skippedCount = 0;

  // Sorted so the plan — and the "N skipped" feedback — is identical whatever
  // order the day checkboxes were ticked in.
  for (const dayIndex of [...new Set(dayIndexes)].sort((a, b) => a - b)) {
    if (dayIndex === source.dayIndex || dayIndex < 0 || dayIndex > 6) continue;
    if (isCollision(source, dayIndex, shifts, dayIsoDates)) {
      skippedCount += 1;
      continue;
    }
    inputs.push(repeatInput(source, dayIndex as RotaDayIndex));
  }

  return { inputs, skippedCount };
}

export function planAssignableRepeatShift(
  source: DraftShift,
  dayIndexes: number[],
  shifts: DraftShift[],
  assignableStaff: StaffMember[],
  dayIsoDates?: readonly string[],
): RepeatShiftPlan | null {
  if (!isShiftCopyAssignable(source, assignableStaff)) return null;
  return planRepeatShift(source, dayIndexes, shifts, dayIsoDates);
}

export async function executeRepeatShiftPlan(
  plan: RepeatShiftPlan,
  addShift: (input: DraftShiftInput) => void | Promise<void>,
): Promise<RepeatShiftResult> {
  let successCount = 0;
  let failedCount = 0;

  for (const input of plan.inputs) {
    try {
      await addShift(input);
      successCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return { successCount, skippedCount: plan.skippedCount, failedCount };
}

function countLabel(count: number, label: string): string {
  return `${count} ${label}`;
}

export function buildRepeatShiftFeedback(result: RepeatShiftResult): RepeatShiftFeedback {
  const { successCount, skippedCount, failedCount } = result;
  const details = [
    skippedCount > 0 ? countLabel(skippedCount, "skipped due to collisions") : null,
    failedCount > 0 ? countLabel(failedCount, "failed to save") : null,
  ].filter(Boolean);

  if (successCount === 0) {
    return {
      tone: failedCount > 0 ? "error" : "warning",
      title: failedCount > 0 ? "Shift repeat failed" : "No shifts repeated",
      description: details.join(" · ") || "Choose at least one available day.",
    };
  }

  return {
    tone: details.length > 0 ? "warning" : "success",
    title: `Shift repeated on ${successCount} day${successCount === 1 ? "" : "s"}`,
    description: details.length > 0 ? details.join(" · ") : undefined,
  };
}
