import { describe, it, expect } from "vitest";
import {
  calculateLeaveBalance,
  clipRangeToWindow,
  countDistinctLeaveDays,
  isEntitlementConsumingLeaveType,
  type BalanceLeaveRequest,
} from "./leaveBalance";
import type { LeaveYearWindow } from "./leaveYear";

/** April 2026 leave year, so boundary behaviour is never a calendar-year accident. */
const YEAR: LeaveYearWindow = { startIso: "2026-04-01", endIso: "2027-03-31" };

function request(overrides: Partial<BalanceLeaveRequest> = {}): BalanceLeaveRequest {
  return {
    startIso: "2026-06-01",
    endIso: "2026-06-05",
    leaveType: "annual_leave",
    status: "approved",
    ...overrides,
  };
}

describe("isEntitlementConsumingLeaveType", () => {
  it("consumes annual leave only", () => {
    expect(isEntitlementConsumingLeaveType("annual_leave")).toBe(true);
  });

  it("does not consume any other persisted leave type", () => {
    for (const leaveType of ["personal", "sick", "unpaid", "other"]) {
      expect(isEntitlementConsumingLeaveType(leaveType)).toBe(false);
    }
  });

  it("does not consume an unknown type", () => {
    expect(isEntitlementConsumingLeaveType("sabbatical")).toBe(false);
    expect(isEntitlementConsumingLeaveType("")).toBe(false);
  });
});

describe("clipRangeToWindow", () => {
  it("returns the range unchanged when it sits inside the window", () => {
    expect(clipRangeToWindow("2026-06-01", "2026-06-05", YEAR)).toEqual({
      startIso: "2026-06-01",
      endIso: "2026-06-05",
    });
  });

  it("clips a range that starts before the window", () => {
    expect(clipRangeToWindow("2026-03-28", "2026-04-04", YEAR)).toEqual({
      startIso: "2026-04-01",
      endIso: "2026-04-04",
    });
  });

  it("clips a range that ends after the window", () => {
    expect(clipRangeToWindow("2027-03-28", "2027-04-04", YEAR)).toEqual({
      startIso: "2027-03-28",
      endIso: "2027-03-31",
    });
  });

  it("returns null for a range entirely outside the window", () => {
    expect(clipRangeToWindow("2025-01-01", "2025-01-05", YEAR)).toBeNull();
    expect(clipRangeToWindow("2030-01-01", "2030-01-05", YEAR)).toBeNull();
  });

  it("returns null for an inverted range", () => {
    expect(clipRangeToWindow("2026-06-05", "2026-06-01", YEAR)).toBeNull();
  });
});

describe("countDistinctLeaveDays", () => {
  it("counts an approved annual leave request inclusively", () => {
    expect(countDistinctLeaveDays([request()], YEAR, "approved")).toBe(5);
  });

  it("counts a single-day request as one day", () => {
    expect(
      countDistinctLeaveDays(
        [request({ startIso: "2026-06-01", endIso: "2026-06-01" })],
        YEAR,
        "approved",
      ),
    ).toBe(1);
  });

  it("counts weekend dates — the unit is calendar days, not working days", () => {
    // 2026-06-06 is a Saturday and 2026-06-07 a Sunday; both are inside the range.
    expect(
      countDistinctLeaveDays(
        [request({ startIso: "2026-06-05", endIso: "2026-06-08" })],
        YEAR,
        "approved",
      ),
    ).toBe(4);
  });

  it("counts an overlapping date once rather than summing per-request durations", () => {
    const overlapping = [
      request({ startIso: "2026-06-01", endIso: "2026-06-05" }),
      request({ startIso: "2026-06-04", endIso: "2026-06-08" }),
    ];
    // Naive summing would give 10; the union of 1–8 June is 8.
    expect(countDistinctLeaveDays(overlapping, YEAR, "approved")).toBe(8);
  });

  it("counts fully duplicated requests once", () => {
    expect(countDistinctLeaveDays([request(), request()], YEAR, "approved")).toBe(5);
  });

  it("clips a request that crosses the leave-year boundary", () => {
    // 28 Mar – 4 Apr 2026 spans the April leave-year boundary.
    const crossing = [request({ startIso: "2026-03-28", endIso: "2026-04-04" })];
    const previousYear: LeaveYearWindow = { startIso: "2025-04-01", endIso: "2026-03-31" };

    expect(countDistinctLeaveDays(crossing, YEAR, "approved")).toBe(4); // 1–4 Apr
    expect(countDistinctLeaveDays(crossing, previousYear, "approved")).toBe(4); // 28–31 Mar
  });

  it("ignores a request entirely outside the leave year", () => {
    expect(
      countDistinctLeaveDays(
        [request({ startIso: "2025-06-01", endIso: "2025-06-05" })],
        YEAR,
        "approved",
      ),
    ).toBe(0);
  });

  it("ignores non-consuming leave types in every status", () => {
    for (const leaveType of ["personal", "sick", "unpaid", "other"]) {
      expect(countDistinctLeaveDays([request({ leaveType })], YEAR, "approved")).toBe(0);
      expect(
        countDistinctLeaveDays([request({ leaveType, status: "pending" })], YEAR, "pending"),
      ).toBe(0);
    }
  });

  it("ignores statuses other than the one requested", () => {
    const mixed = [
      request({ status: "approved" }),
      request({ status: "pending", startIso: "2026-07-01", endIso: "2026-07-03" }),
      request({ status: "declined", startIso: "2026-08-01", endIso: "2026-08-10" }),
      request({ status: "cancelled", startIso: "2026-09-01", endIso: "2026-09-10" }),
    ];
    expect(countDistinctLeaveDays(mixed, YEAR, "approved")).toBe(5);
    expect(countDistinctLeaveDays(mixed, YEAR, "pending")).toBe(3);
  });

  it("skips malformed dates without throwing", () => {
    expect(
      countDistinctLeaveDays(
        [request({ startIso: "nope", endIso: "2026-06-05" })],
        YEAR,
        "approved",
      ),
    ).toBe(0);
  });
});

describe("calculateLeaveBalance", () => {
  it("reports booked, pending and remaining for a recorded entitlement", () => {
    const balance = calculateLeaveBalance({
      entitlementDays: 28,
      window: YEAR,
      requests: [
        request({ startIso: "2026-06-01", endIso: "2026-06-05" }), // 5 approved
        request({ startIso: "2026-07-01", endIso: "2026-07-03", status: "pending" }), // 3 pending
      ],
    });

    expect(balance).toEqual({
      recorded: true,
      entitlementDays: 28,
      booked: 5,
      pending: 3,
      remaining: 23,
    });
  });

  it("does not let pending reduce remaining", () => {
    const balance = calculateLeaveBalance({
      entitlementDays: 28,
      window: YEAR,
      requests: [request({ startIso: "2026-07-01", endIso: "2026-07-10", status: "pending" })],
    });

    expect(balance.pending).toBe(10);
    expect(balance.booked).toBe(0);
    expect(balance.remaining).toBe(28);
  });

  it("ignores declined requests entirely", () => {
    const balance = calculateLeaveBalance({
      entitlementDays: 28,
      window: YEAR,
      requests: [request({ status: "declined" })],
    });

    expect(balance.booked).toBe(0);
    expect(balance.pending).toBe(0);
    expect(balance.remaining).toBe(28);
  });

  it("ignores cancelled requests entirely", () => {
    const balance = calculateLeaveBalance({
      entitlementDays: 28,
      window: YEAR,
      requests: [request({ status: "cancelled" })],
    });

    expect(balance.booked).toBe(0);
    expect(balance.pending).toBe(0);
    expect(balance.remaining).toBe(28);
  });

  it("ignores sick, unpaid, personal and other against the annual balance", () => {
    const balance = calculateLeaveBalance({
      entitlementDays: 28,
      window: YEAR,
      requests: [
        request({ leaveType: "sick", startIso: "2026-06-01", endIso: "2026-06-10" }),
        request({ leaveType: "unpaid", startIso: "2026-06-11", endIso: "2026-06-20" }),
        request({ leaveType: "personal", startIso: "2026-06-21", endIso: "2026-06-25" }),
        request({ leaveType: "other", startIso: "2026-06-26", endIso: "2026-06-28" }),
      ],
    });

    expect(balance.booked).toBe(0);
    expect(balance.remaining).toBe(28);
  });

  it("allows a negative remaining rather than clamping at zero", () => {
    const balance = calculateLeaveBalance({
      entitlementDays: 28,
      window: YEAR,
      requests: [request({ startIso: "2026-06-01", endIso: "2026-07-01" })], // 31 days
    });

    expect(balance.booked).toBe(31);
    expect(balance.remaining).toBe(-3);
  });

  it("reports an unrecorded entitlement without inventing a number", () => {
    const balance = calculateLeaveBalance({
      entitlementDays: null,
      window: YEAR,
      requests: [request()],
    });

    expect(balance).toEqual({
      recorded: false,
      entitlementDays: null,
      booked: 5,
      pending: 0,
      remaining: null,
    });
  });

  it("never falls back to a workspace default — an unrecorded person stays unrecorded", () => {
    // Whatever a workspace default may be, it is not an input to this function.
    const balance = calculateLeaveBalance({
      entitlementDays: null,
      window: YEAR,
      requests: [],
    });

    expect(balance.recorded).toBe(false);
    expect(balance.entitlementDays).toBeNull();
    expect(balance.remaining).toBeNull();
  });

  it("treats a recorded zero entitlement as recorded, not as missing", () => {
    const balance = calculateLeaveBalance({
      entitlementDays: 0,
      window: YEAR,
      requests: [request()],
    });

    expect(balance.recorded).toBe(true);
    expect(balance.entitlementDays).toBe(0);
    expect(balance.remaining).toBe(-5);
  });

  it("keeps two leave years independent for a request that crosses the boundary", () => {
    const crossing = [request({ startIso: "2026-03-28", endIso: "2026-04-04" })];
    const previousYear: LeaveYearWindow = { startIso: "2025-04-01", endIso: "2026-03-31" };

    expect(
      calculateLeaveBalance({ entitlementDays: 28, window: YEAR, requests: crossing }),
    ).toEqual({ recorded: true, entitlementDays: 28, booked: 4, pending: 0, remaining: 24 });
    expect(
      calculateLeaveBalance({ entitlementDays: 25, window: previousYear, requests: crossing }),
    ).toEqual({ recorded: true, entitlementDays: 25, booked: 4, pending: 0, remaining: 21 });
  });
});
