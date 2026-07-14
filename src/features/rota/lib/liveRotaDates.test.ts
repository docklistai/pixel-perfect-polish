import { describe, expect, it } from "vitest";
import { liveWeekDayLabels, weekStartForOffset, zonedLocalTimeToUtcIso } from "./liveRotaDates";

// 2026-06-10 is a Wednesday (that week's Monday is 2026-06-08, Sunday 2026-06-07).
const wednesday = new Date("2026-06-10T12:00:00Z");

describe("weekStartForOffset", () => {
  it("defaults to a Monday start (unchanged existing behaviour)", () => {
    expect(weekStartForOffset("UTC", 0, 0, wednesday)).toBe("2026-06-08");
    expect(weekStartForOffset("UTC", -1, 0, wednesday)).toBe("2026-06-01");
    expect(weekStartForOffset("UTC", 1, 0, wednesday)).toBe("2026-06-15");
  });

  it("honours a configured Sunday start (startDay = 6)", () => {
    expect(weekStartForOffset("UTC", 0, 6, wednesday)).toBe("2026-06-07");
    expect(weekStartForOffset("UTC", 1, 6, wednesday)).toBe("2026-06-14");
  });
});

describe("liveWeekDayLabels", () => {
  it("labels each column from its real date, whatever day the week starts on", () => {
    expect(liveWeekDayLabels("2026-06-08")[0]).toBe("Mon 8 Jun");
    // A Sunday-start week: the first column is genuinely Sunday.
    const sundayStart = liveWeekDayLabels("2026-06-07");
    expect(sundayStart[0]).toBe("Sun 7 Jun");
    expect(sundayStart[1]).toBe("Mon 8 Jun");
    expect(sundayStart[6]).toBe("Sat 13 Jun");
  });
});

describe("zonedLocalTimeToUtcIso", () => {
  it("preserves ordinary winter and summer conversions", () => {
    expect(zonedLocalTimeToUtcIso("2026-01-15", "08:00", "Europe/London")).toBe(
      "2026-01-15T08:00:00.000Z",
    );
    expect(zonedLocalTimeToUtcIso("2026-07-15", "08:00", "America/New_York")).toBe(
      "2026-07-15T12:00:00.000Z",
    );
  });

  it("rejects a wall time skipped by the spring DST transition", () => {
    expect(() => zonedLocalTimeToUtcIso("2026-03-29", "01:30", "Europe/London")).toThrow(
      "Local time 01:30 on 2026-03-29 does not exist in Europe/London",
    );
  });

  it("uses the first occurrence of an ambiguous fall-back wall time", () => {
    expect(zonedLocalTimeToUtcIso("2026-10-25", "01:30", "Europe/London")).toBe(
      "2026-10-25T00:30:00.000Z",
    );
    expect(zonedLocalTimeToUtcIso("2026-11-01", "01:30", "America/New_York")).toBe(
      "2026-11-01T05:30:00.000Z",
    );
  });
});
