import { describe, expect, it } from "vitest";
import { buildOutsideHoursShifts, isOutsideOpeningHours } from "./outsideOpeningHours";
import type { DraftShift } from "../types";

describe("isOutsideOpeningHours", () => {
  const open = "12:00";
  const close = "23:00";

  it("flags a shift starting before open or ending after close", () => {
    expect(isOutsideOpeningHours({ start: "09:00", end: "17:00" }, open, close)).toBe(true);
    expect(isOutsideOpeningHours({ start: "18:00", end: "23:30" }, open, close)).toBe(true);
  });

  it("does not flag a shift fully within hours", () => {
    expect(isOutsideOpeningHours({ start: "12:00", end: "23:00" }, open, close)).toBe(false);
    expect(isOutsideOpeningHours({ start: "17:00", end: "22:00" }, open, close)).toBe(false);
  });

  it("never flags when the venue trades overnight (close <= open)", () => {
    // Open noon, close 02:00 next day: any shift is left unjudged.
    expect(isOutsideOpeningHours({ start: "06:00", end: "10:00" }, "12:00", "02:00")).toBe(false);
  });

  it("never flags an overnight shift", () => {
    expect(isOutsideOpeningHours({ start: "22:00", end: "02:00" }, open, close)).toBe(false);
  });
});

describe("buildOutsideHoursShifts", () => {
  function shift(id: string, start: string, end: string): DraftShift {
    return {
      id,
      dayIndex: 0,
      staffId: "a",
      role: "Chef",
      start,
      end,
      breakMinutes: 0,
      tone: "info",
      status: "scheduled",
    };
  }

  it("returns nothing when hours are unconfigured", () => {
    expect(buildOutsideHoursShifts([shift("s1", "06:00", "10:00")], null, null)).toEqual([]);
  });

  it("collects only the out-of-hours shifts", () => {
    const result = buildOutsideHoursShifts(
      [shift("s1", "06:00", "10:00"), shift("s2", "13:00", "21:00")],
      "12:00",
      "23:00",
    );
    expect(result).toEqual([{ shiftId: "s1", role: "Chef" }]);
  });
});
