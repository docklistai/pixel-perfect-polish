import { describe, it, expect } from "vitest";
import {
  isValidLeaveYearMonth,
  leaveYearLabel,
  resolveLeaveYear,
  shiftLeaveYear,
  LEAVE_YEAR_MONTH_OPTIONS,
} from "./leaveYear";

describe("isValidLeaveYearMonth", () => {
  it("accepts 1 through 12", () => {
    for (let month = 1; month <= 12; month += 1) {
      expect(isValidLeaveYearMonth(month)).toBe(true);
    }
  });

  it("rejects an unconfigured or out-of-range policy", () => {
    expect(isValidLeaveYearMonth(null)).toBe(false);
    expect(isValidLeaveYearMonth(undefined)).toBe(false);
    expect(isValidLeaveYearMonth(0)).toBe(false);
    expect(isValidLeaveYearMonth(13)).toBe(false);
    expect(isValidLeaveYearMonth(6.5)).toBe(false);
    expect(isValidLeaveYearMonth(Number.NaN)).toBe(false);
  });
});

describe("resolveLeaveYear", () => {
  it("resolves a January start to the calendar year", () => {
    expect(resolveLeaveYear("2026-06-15", 1)).toEqual({
      startIso: "2026-01-01",
      endIso: "2026-12-31",
    });
  });

  it("resolves an April start for a date after the start month", () => {
    expect(resolveLeaveYear("2026-06-15", 4)).toEqual({
      startIso: "2026-04-01",
      endIso: "2027-03-31",
    });
  });

  it("resolves an April start for a date before the start month to the prior year", () => {
    expect(resolveLeaveYear("2026-02-15", 4)).toEqual({
      startIso: "2025-04-01",
      endIso: "2026-03-31",
    });
  });

  it("treats the first day of the start month as the new leave year", () => {
    expect(resolveLeaveYear("2026-04-01", 4)).toEqual({
      startIso: "2026-04-01",
      endIso: "2027-03-31",
    });
  });

  it("treats the last day before the start month as the old leave year", () => {
    expect(resolveLeaveYear("2026-03-31", 4)).toEqual({
      startIso: "2025-04-01",
      endIso: "2026-03-31",
    });
  });

  it("ends a March-start year on 29 February in a leap year", () => {
    // 2028 is a leap year; the March 2027 leave year ends the day before March 2028.
    expect(resolveLeaveYear("2027-06-01", 3)).toEqual({
      startIso: "2027-03-01",
      endIso: "2028-02-29",
    });
  });

  it("ends a March-start year on 28 February in a non-leap year", () => {
    expect(resolveLeaveYear("2026-06-01", 3)).toEqual({
      startIso: "2026-03-01",
      endIso: "2027-02-28",
    });
  });

  it("handles the December/January boundary for a December start", () => {
    expect(resolveLeaveYear("2026-12-31", 12)).toEqual({
      startIso: "2026-12-01",
      endIso: "2027-11-30",
    });
    expect(resolveLeaveYear("2027-01-01", 12)).toEqual({
      startIso: "2026-12-01",
      endIso: "2027-11-30",
    });
  });

  it("handles the December/January boundary for a January start", () => {
    expect(resolveLeaveYear("2026-12-31", 1)).toEqual({
      startIso: "2026-01-01",
      endIso: "2026-12-31",
    });
    expect(resolveLeaveYear("2027-01-01", 1)).toEqual({
      startIso: "2027-01-01",
      endIso: "2027-12-31",
    });
  });

  it("returns null when the workspace has not configured a leave year", () => {
    expect(resolveLeaveYear("2026-06-15", null)).toBeNull();
    expect(resolveLeaveYear("2026-06-15", undefined)).toBeNull();
    expect(resolveLeaveYear("2026-06-15", 0)).toBeNull();
    expect(resolveLeaveYear("2026-06-15", 13)).toBeNull();
  });

  it("returns null for a malformed reference date", () => {
    expect(resolveLeaveYear("not-a-date", 4)).toBeNull();
    expect(resolveLeaveYear("2026-13-01", 4)).toBeNull();
    expect(resolveLeaveYear("", 4)).toBeNull();
  });

  it("is unaffected by the host timezone", () => {
    // A DST-sensitive local-time implementation drifts here; UTC arithmetic does not.
    const previous = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Auckland";
      expect(resolveLeaveYear("2026-04-01", 4)).toEqual({
        startIso: "2026-04-01",
        endIso: "2027-03-31",
      });
      process.env.TZ = "America/Los_Angeles";
      expect(resolveLeaveYear("2026-04-01", 4)).toEqual({
        startIso: "2026-04-01",
        endIso: "2027-03-31",
      });
    } finally {
      process.env.TZ = previous;
    }
  });
});

describe("shiftLeaveYear", () => {
  it("moves to the next leave year", () => {
    expect(shiftLeaveYear({ startIso: "2026-04-01", endIso: "2027-03-31" }, 1)).toEqual({
      startIso: "2027-04-01",
      endIso: "2028-03-31",
    });
  });

  it("moves to the previous leave year", () => {
    expect(shiftLeaveYear({ startIso: "2026-04-01", endIso: "2027-03-31" }, -1)).toEqual({
      startIso: "2025-04-01",
      endIso: "2026-03-31",
    });
  });

  it("keeps February ends correct across a leap year", () => {
    expect(shiftLeaveYear({ startIso: "2026-03-01", endIso: "2027-02-28" }, 1)).toEqual({
      startIso: "2027-03-01",
      endIso: "2028-02-29",
    });
  });
});

describe("leaveYearLabel", () => {
  it("labels a January start as a plain calendar year", () => {
    expect(leaveYearLabel({ startIso: "2026-01-01", endIso: "2026-12-31" })).toBe("2026");
  });

  it("labels a cross-calendar-year leave year with both months", () => {
    expect(leaveYearLabel({ startIso: "2026-04-01", endIso: "2027-03-31" })).toBe(
      "Apr 2026 – Mar 2027",
    );
  });
});

describe("LEAVE_YEAR_MONTH_OPTIONS", () => {
  it("offers all twelve months, 1-indexed", () => {
    expect(LEAVE_YEAR_MONTH_OPTIONS).toHaveLength(12);
    expect(LEAVE_YEAR_MONTH_OPTIONS[0]).toEqual({ value: 1, label: "January" });
    expect(LEAVE_YEAR_MONTH_OPTIONS[11]).toEqual({ value: 12, label: "December" });
  });
});
