import type { DraftShift, DraftShiftInput, RotaDayIndex } from "../types";
import { getShiftDurationMinutes, parseHHMMToMinutes } from "./draftRota";

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

function shiftsOverlap(first: DraftShift, second: DraftShift): boolean {
  const firstStart = parseHHMMToMinutes(first.start);
  const secondStart = parseHHMMToMinutes(second.start);
  const firstDuration = getShiftDurationMinutes(first.start, first.end);
  const secondDuration = getShiftDurationMinutes(second.start, second.end);
  if (
    firstStart === null ||
    secondStart === null ||
    firstDuration === null ||
    secondDuration === null
  ) {
    return true;
  }
  return firstStart < secondStart + secondDuration && secondStart < firstStart + firstDuration;
}

function isCollision(source: DraftShift, dayIndex: number, shifts: DraftShift[]): boolean {
  const sameDay = shifts.filter((shift) => shift.dayIndex === dayIndex);
  if (source.staffId !== null) {
    return sameDay.some(
      (shift) =>
        shift.staffId === source.staffId &&
        shiftsOverlap(source, { ...shift, dayIndex: source.dayIndex }),
    );
  }
  return sameDay.some(
    (shift) =>
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
    deptOverride: source.deptOverride,
    colourOverride: source.colourOverride,
  };
}

export function planRepeatShift(
  source: DraftShift,
  dayIndexes: number[],
  shifts: DraftShift[],
): RepeatShiftPlan {
  const inputs: DraftShiftInput[] = [];
  let skippedCount = 0;

  for (const dayIndex of new Set(dayIndexes)) {
    if (dayIndex === source.dayIndex || dayIndex < 0 || dayIndex > 6) continue;
    if (isCollision(source, dayIndex, shifts)) {
      skippedCount += 1;
      continue;
    }
    inputs.push(repeatInput(source, dayIndex as RotaDayIndex));
  }

  return { inputs, skippedCount };
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
