import { describe, expect, it } from "vitest";
import {
  formatShiftTime,
  formatTime,
  getShiftDurationMinutes,
  isValidShiftTimeRange,
  parseHHMMToMinutes,
  shiftHours,
} from "./rotaTimeUtils";

describe("rotaTimeUtils 24-hour formatting and duration", () => {
  it("formats times strictly in 24-hour HH:mm format", () => {
    expect(formatTime("09:00")).toBe("09:00");
    expect(formatTime("9:00")).toBe("09:00");
    expect(formatTime("17:00")).toBe("17:00");
    expect(formatTime("00:00")).toBe("00:00");
    expect(formatTime("12:00")).toBe("12:00");
    expect(formatTime("23:59")).toBe("23:59");
  });

  it("formats shift time ranges with 24-hour bounds and en-dash", () => {
    expect(formatShiftTime("09:00", "17:00")).toBe("09:00–17:00");
    expect(formatShiftTime("18:00", "23:00")).toBe("18:00–23:00");
    expect(formatShiftTime("22:00", "06:00")).toBe("22:00–06:00");
    expect(formatShiftTime("00:00", "08:00")).toBe("00:00–08:00");
  });

  it("calculates durations and shift hours accurately", () => {
    expect(parseHHMMToMinutes("09:30")).toBe(570);
    expect(getShiftDurationMinutes("09:00", "17:00")).toBe(480);
    expect(shiftHours("09:00", "17:00")).toBe(8);
    expect(getShiftDurationMinutes("22:00", "06:00")).toBe(480);
    expect(shiftHours("22:00", "06:00")).toBe(8);
    expect(isValidShiftTimeRange("09:00", "17:00")).toBe(true);
  });
});
