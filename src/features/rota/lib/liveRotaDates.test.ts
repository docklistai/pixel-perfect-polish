import { describe, expect, it } from "vitest";
import { liveWeekDayLabels, weekStartForOffset } from "./liveRotaDates";

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
