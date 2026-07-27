import { describe, expect, it } from "vitest";
import {
  getShiftDuplicateBlockedReason,
  isLastRotaWeekDay,
  LAST_ROTA_DAY_INDEX,
  LAST_DAY_DUPLICATE_BLOCKED_REASON,
} from "./duplicateShiftRules";
import { COPY_ASSIGNMENT_BLOCKED_REASON } from "./assignableStaff";
import type { DraftShift, RotaDayIndex, StaffMember } from "../types";

const assignable: StaffMember[] = [
  { id: "staff-1", n: "Ada", role: "Waiter" } as unknown as StaffMember,
];

const shift = (
  dayIndex: number,
  staffId: string | null,
): Pick<DraftShift, "dayIndex" | "staffId"> => ({ dayIndex: dayIndex as RotaDayIndex, staffId });

describe("duplicate-to-next-day rules", () => {
  it("treats the seventh day as the last, whatever weekday it falls on", () => {
    expect(LAST_ROTA_DAY_INDEX).toBe(6);
    expect(isLastRotaWeekDay(6)).toBe(true);
    expect(isLastRotaWeekDay(5)).toBe(false);
  });

  it("blocks a final-day shift with the shared reason", () => {
    expect(getShiftDuplicateBlockedReason(shift(6, "staff-1"), assignable)).toBe(
      LAST_DAY_DUPLICATE_BLOCKED_REASON,
    );
    expect(getShiftDuplicateBlockedReason(shift(6, null), assignable)).toBe(
      LAST_DAY_DUPLICATE_BLOCKED_REASON,
    );
  });

  it("allows every other day", () => {
    for (const dayIndex of [0, 1, 2, 3, 4, 5]) {
      expect(getShiftDuplicateBlockedReason(shift(dayIndex, "staff-1"), assignable)).toBeNull();
      expect(getShiftDuplicateBlockedReason(shift(dayIndex, null), assignable)).toBeNull();
    }
  });

  it("reports an unassignable assignee ahead of the last-day rule", () => {
    expect(getShiftDuplicateBlockedReason(shift(6, "left-staff"), assignable)).toBe(
      COPY_ASSIGNMENT_BLOCKED_REASON,
    );
  });

  it("reports a missing source shift", () => {
    expect(getShiftDuplicateBlockedReason(undefined, assignable)).toBeTruthy();
  });

  /**
   * `workspaces.rota_start_weekday` lets a venue start its week on any day, so
   * the final day is Sunday only for the Monday-start default. Naming a weekday
   * here told a Sunday-start workspace the wrong thing.
   */
  it("names no weekday, so the reason is true for every rota start day", () => {
    expect(LAST_DAY_DUPLICATE_BLOCKED_REASON).toBe(
      "This is the last day of this rota week. Open next week and add the shift there.",
    );
    for (const weekday of [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]) {
      expect(LAST_DAY_DUPLICATE_BLOCKED_REASON).not.toContain(weekday);
    }
  });

  it("still points the manager at next week rather than failing silently", () => {
    expect(LAST_DAY_DUPLICATE_BLOCKED_REASON).toMatch(/open next week/i);
  });
});
