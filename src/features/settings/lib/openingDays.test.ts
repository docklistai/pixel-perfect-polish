import { describe, expect, it } from "vitest";
import { isOpenOnWeekday, maskToOpenDays, openDaysToMask } from "./openingDays";

describe("openingDays", () => {
  it("treats a null mask as open every day", () => {
    expect(maskToOpenDays(null)).toEqual([true, true, true, true, true, true, true]);
    expect(isOpenOnWeekday(null, 0)).toBe(true);
  });

  it("round-trips a mask through booleans", () => {
    // Closed Mondays (bit 0) and Sundays (bit 6): open Tue..Sat.
    const days = [false, true, true, true, true, true, false];
    const mask = openDaysToMask(days);
    expect(mask).toBe(0b0111110);
    expect(maskToOpenDays(mask)).toEqual(days);
  });

  it("reports open/closed per weekday from a mask", () => {
    const mask = openDaysToMask([false, true, true, true, true, true, false]);
    expect(isOpenOnWeekday(mask, 0)).toBe(false); // Monday closed
    expect(isOpenOnWeekday(mask, 1)).toBe(true); // Tuesday open
    expect(isOpenOnWeekday(mask, 6)).toBe(false); // Sunday closed
  });
});
