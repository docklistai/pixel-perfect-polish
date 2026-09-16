import { describe, it, expect } from "vitest";
import {
  weekPeriodOf,
  shiftPeriod,
  isWithinPeriod,
  periodFilename,
  dateIsoInTimezone,
  currentWeekPeriod,
} from "./reviewPeriod";

describe("weekPeriodOf", () => {
  it("returns the Monday–Sunday week containing the date", () => {
    // 2026-06-11 is a Thursday.
    expect(weekPeriodOf("2026-06-11")).toEqual({
      startIso: "2026-06-08",
      endIso: "2026-06-14",
      label: "8 – 14 Jun 2026",
    });
  });

  it("treats Monday and Sunday as the same week", () => {
    expect(weekPeriodOf("2026-06-08").startIso).toBe("2026-06-08");
    expect(weekPeriodOf("2026-06-14").startIso).toBe("2026-06-08");
  });

  it("labels cross-month and cross-year weeks", () => {
    expect(weekPeriodOf("2026-07-01").label).toBe("29 Jun – 5 Jul 2026");
    expect(weekPeriodOf("2025-12-31").label).toBe("29 Dec 2025 – 4 Jan 2026");
  });
});

describe("shiftPeriod", () => {
  it("moves to the previous and next week", () => {
    const week = weekPeriodOf("2026-06-11");
    expect(shiftPeriod(week, -1).startIso).toBe("2026-06-01");
    expect(shiftPeriod(week, 1).startIso).toBe("2026-06-15");
  });
});

describe("isWithinPeriod", () => {
  const week = weekPeriodOf("2026-06-11");
  it("includes the inclusive bounds and excludes outside dates", () => {
    expect(isWithinPeriod("2026-06-08", week)).toBe(true);
    expect(isWithinPeriod("2026-06-14", week)).toBe(true);
    expect(isWithinPeriod("2026-06-07", week)).toBe(false);
    expect(isWithinPeriod("2026-06-15", week)).toBe(false);
  });
});

describe("periodFilename", () => {
  it("encodes the period and carries no hardcoded venue or month", () => {
    const name = periodFilename(weekPeriodOf("2026-06-11"));
    expect(name).toBe("approved-hours_2026-06-08_to_2026-06-14.csv");
    expect(name).not.toMatch(/harbour/i);
  });
});

describe("dateIsoInTimezone / currentWeekPeriod", () => {
  it("resolves the workspace-timezone date for an instant", () => {
    // 23:30 UTC on 11 Jun is 12 Jun 00:30 BST in London, still 11 Jun in New York.
    expect(dateIsoInTimezone(new Date("2026-06-11T23:30:00Z"), "Europe/London")).toBe("2026-06-12");
    expect(dateIsoInTimezone(new Date("2026-06-11T23:30:00Z"), "America/New_York")).toBe(
      "2026-06-11",
    );
  });

  it("derives the current week from a real instant in the given zone", () => {
    expect(currentWeekPeriod(new Date("2026-06-11T12:00:00Z"), "Europe/London")).toEqual({
      startIso: "2026-06-08",
      endIso: "2026-06-14",
      label: "8 – 14 Jun 2026",
    });
  });
});

describe("rotaStartWeekday authority", () => {
  it("starts the week on Sunday when rotaStartWeekday is 6", () => {
    // 2026-06-11 is Thursday; with Sunday start (6), week is 7 Jun – 13 Jun 2026
    const period = weekPeriodOf("2026-06-11", 6);
    expect(period).toEqual({
      startIso: "2026-06-07",
      endIso: "2026-06-13",
      label: "7 – 13 Jun 2026",
    });
  });

  it("starts the week on Friday when rotaStartWeekday is 4", () => {
    // 2026-06-11 is Thursday; with Friday start (4), week is 5 Jun – 11 Jun 2026
    const period = weekPeriodOf("2026-06-11", 4);
    expect(period).toEqual({
      startIso: "2026-06-05",
      endIso: "2026-06-11",
      label: "5 – 11 Jun 2026",
    });
  });

  it("shifts periods preserving configured start weekday", () => {
    const period = weekPeriodOf("2026-06-11", 6);
    expect(shiftPeriod(period, -1, 6).startIso).toBe("2026-05-31");
    expect(shiftPeriod(period, 1, 6).startIso).toBe("2026-06-14");
  });

  it("resolves currentWeekPeriod with configured rotaStartWeekday", () => {
    expect(currentWeekPeriod(new Date("2026-06-11T12:00:00Z"), "Europe/London", 6)).toEqual({
      startIso: "2026-06-07",
      endIso: "2026-06-13",
      label: "7 – 13 Jun 2026",
    });
  });
});
