import { describe, expect, it } from "vitest";
import { findRecurringDayOffClashes, isoWeekday } from "./recurringDayOffClashes";
import type { DraftShift, StaffMember } from "../types";

// 2026-06-08 is a Monday; 2026-06-14 is the Sunday of that week.
const WEEK = [
  "2026-06-08",
  "2026-06-09",
  "2026-06-10",
  "2026-06-11",
  "2026-06-12",
  "2026-06-13",
  "2026-06-14",
];

function shift(partial: Partial<DraftShift> & { id: string; dayIndex: DraftShift["dayIndex"] }): DraftShift {
  return {
    staffId: "olivia",
    role: "Waiter",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...partial,
  };
}

const staffById = new Map<string, StaffMember>([
  ["olivia", { id: "olivia", name: "Olivia Bennett", role: "Waiter", hrs: "", img: 1, tone: "info" }],
]);

describe("isoWeekday", () => {
  it("maps Monday to 0 and Sunday to 6", () => {
    expect(isoWeekday("2026-06-08")).toBe(0);
    expect(isoWeekday("2026-06-14")).toBe(6);
  });
});

describe("findRecurringDayOffClashes", () => {
  it("flags a shift on an approved day-off weekday", () => {
    const approved = new Map([["olivia", new Set([6])]]); // Sundays off
    const clashes = findRecurringDayOffClashes(
      [shift({ id: "s1", dayIndex: 6 })], // Sunday
      WEEK,
      approved,
      staffById,
    );
    expect(clashes).toHaveLength(1);
    expect(clashes[0]).toMatchObject({ shiftId: "s1", staffName: "Olivia Bennett", dayLabel: "Sunday" });
  });

  it("ignores shifts on other days, open shifts, and staff without an approval", () => {
    const approved = new Map([["olivia", new Set([6])]]);
    const clashes = findRecurringDayOffClashes(
      [
        shift({ id: "s1", dayIndex: 0 }), // Monday — fine
        shift({ id: "s2", dayIndex: 6, staffId: null }), // open shift — ignored
        shift({ id: "s3", dayIndex: 6, staffId: "sam" }), // no approval for Sam
      ],
      WEEK,
      approved,
      staffById,
    );
    expect(clashes).toHaveLength(0);
  });
});
