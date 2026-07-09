import { describe, expect, it } from "vitest";
import { findClosedDayShifts } from "./closedDayShifts";
import { openDaysToMask } from "@/features/settings/lib/openingDays";
import type { DraftShift } from "../types";

// 2026-06-15 Monday .. 2026-06-21 Sunday.
const WEEK = [
  "2026-06-15",
  "2026-06-16",
  "2026-06-17",
  "2026-06-18",
  "2026-06-19",
  "2026-06-20",
  "2026-06-21",
];

function shift(id: string, dayIndex: DraftShift["dayIndex"], role = "Chef"): DraftShift {
  return {
    id,
    dayIndex,
    staffId: "a",
    role,
    start: "09:00",
    end: "17:00",
    breakMinutes: 0,
    tone: "info",
    status: "scheduled",
  };
}

describe("findClosedDayShifts", () => {
  it("flags shifts on closed weekdays", () => {
    // Closed Mondays (bit 0). A Monday shift should be flagged.
    const mask = openDaysToMask([false, true, true, true, true, true, true]);
    const result = findClosedDayShifts([shift("s1", 0), shift("s2", 1)], WEEK, mask);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ shiftId: "s1", dayLabel: "Monday" });
  });

  it("flags nothing when opening days are unconfigured", () => {
    expect(findClosedDayShifts([shift("s1", 0)], WEEK, null)).toEqual([]);
  });
});
