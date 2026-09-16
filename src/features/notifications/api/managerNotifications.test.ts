import { describe, expect, it } from "vitest";
import { calculateRotaWeekOffset } from "./managerNotifications";

describe("calculateRotaWeekOffset", () => {
  // Wednesday 10 June 2026
  const wednesday = new Date("2026-06-10T12:00:00Z");

  it("calculates offsets correctly with default Monday start (rotaStartWeekday = 0)", () => {
    // With Monday start, current week is 2026-06-08
    expect(calculateRotaWeekOffset("2026-06-08", "UTC", 0, wednesday)).toBe(0);
    expect(calculateRotaWeekOffset("2026-06-15", "UTC", 0, wednesday)).toBe(1);
    expect(calculateRotaWeekOffset("2026-06-01", "UTC", 0, wednesday)).toBe(-1);
  });

  it("calculates offsets correctly with Sunday start (rotaStartWeekday = 6)", () => {
    // With Sunday start, current week is 2026-06-07
    expect(calculateRotaWeekOffset("2026-06-07", "UTC", 6, wednesday)).toBe(0);
    expect(calculateRotaWeekOffset("2026-06-14", "UTC", 6, wednesday)).toBe(1);
    expect(calculateRotaWeekOffset("2026-05-31", "UTC", 6, wednesday)).toBe(-1);
  });

  it("calculates offsets correctly with Friday start (rotaStartWeekday = 4)", () => {
    // With Friday start, current week is 2026-06-05
    expect(calculateRotaWeekOffset("2026-06-05", "UTC", 4, wednesday)).toBe(0);
    expect(calculateRotaWeekOffset("2026-06-12", "UTC", 4, wednesday)).toBe(1);
  });
});
