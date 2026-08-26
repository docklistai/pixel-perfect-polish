import { describe, it, expect } from "vitest";
import {
  CALENDAR_DAYS_EXPLAINER,
  CALENDAR_DAYS_LABEL,
  NOT_RECORDED_LABEL,
  formatEntitlementSummary,
  formatPendingSummary,
  remainingTone,
} from "./leaveBalancePresentation";
import type { LeaveBalance } from "./leaveBalance";

function balance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    recorded: true,
    entitlementDays: 28,
    booked: 12,
    pending: 0,
    remaining: 16,
    ...overrides,
  };
}

describe("unit copy", () => {
  it("states calendar days, never working days", () => {
    expect(CALENDAR_DAYS_LABEL).toBe("Calendar days");
    expect(CALENDAR_DAYS_EXPLAINER).toContain("calendar dates");
    expect(CALENDAR_DAYS_EXPLAINER).toContain("does not calculate");
  });

  it("never claims statutory or contractual entitlement", () => {
    expect(CALENDAR_DAYS_EXPLAINER.toLowerCase()).not.toMatch(/\bstatutory entitlement\b/);
    expect(CALENDAR_DAYS_LABEL.toLowerCase()).not.toContain("working day");
  });
});

describe("formatEntitlementSummary", () => {
  it("summarises a recorded balance", () => {
    expect(formatEntitlementSummary(balance())).toBe("12 booked of 28 · 16 remaining");
  });

  it("shows a negative remaining rather than hiding it", () => {
    expect(formatEntitlementSummary(balance({ booked: 31, remaining: -3 }))).toBe(
      "31 booked of 28 · -3 remaining",
    );
  });

  it("reports an unrecorded entitlement without inventing a number", () => {
    const summary = formatEntitlementSummary(
      balance({ recorded: false, entitlementDays: null, booked: 0, remaining: null }),
    );
    expect(summary).toBe(NOT_RECORDED_LABEL);
    expect(summary).not.toMatch(/\d/);
  });

  it("still reports booked days when nothing is recorded", () => {
    expect(
      formatEntitlementSummary(
        balance({ recorded: false, entitlementDays: null, booked: 5, remaining: null }),
      ),
    ).toBe("Entitlement not recorded · 5 days booked");
  });

  it("singularises one booked day", () => {
    expect(
      formatEntitlementSummary(
        balance({ recorded: false, entitlementDays: null, booked: 1, remaining: null }),
      ),
    ).toBe("Entitlement not recorded · 1 day booked");
  });
});

describe("formatPendingSummary", () => {
  it("returns null when nothing is pending", () => {
    expect(formatPendingSummary(balance({ pending: 0 }))).toBeNull();
  });

  it("pluralises correctly", () => {
    expect(formatPendingSummary(balance({ pending: 1 }))).toBe("1 day");
    expect(formatPendingSummary(balance({ pending: 3 }))).toBe("3 days");
  });
});

describe("remainingTone", () => {
  it("is muted when nothing is recorded", () => {
    expect(remainingTone(balance({ recorded: false, remaining: null }))).toBe("muted");
  });

  it("is danger when over-booked", () => {
    expect(remainingTone(balance({ remaining: -1 }))).toBe("danger");
  });

  it("is warning when running low", () => {
    expect(remainingTone(balance({ remaining: 0 }))).toBe("warning");
    expect(remainingTone(balance({ remaining: 5 }))).toBe("warning");
  });

  it("is success with headroom", () => {
    expect(remainingTone(balance({ remaining: 6 }))).toBe("success");
  });
});
