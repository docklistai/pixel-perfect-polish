import { describe, expect, it } from "vitest";
import { validatePortalLeaveDates, validatePortalLeaveRequest } from "./portalLeaveValidation";

describe("validatePortalLeaveDates", () => {
  it("blocks past leave before submission", () => {
    expect(
      validatePortalLeaveDates({
        startIso: "2026-06-01",
        endIso: "2026-06-02",
        todayIso: "2026-06-27",
      }),
    ).toMatch(/past/i);
  });

  it("allows same-day and future leave", () => {
    expect(
      validatePortalLeaveDates({
        startIso: "2026-06-27",
        endIso: "2026-06-27",
        todayIso: "2026-06-27",
      }),
    ).toBeNull();
    expect(
      validatePortalLeaveDates({
        startIso: "2026-06-28",
        endIso: "2026-06-30",
        todayIso: "2026-06-27",
      }),
    ).toBeNull();
  });

  it("blocks an end date before the start date", () => {
    expect(
      validatePortalLeaveDates({
        startIso: "2026-06-29",
        endIso: "2026-06-28",
        todayIso: "2026-06-27",
      }),
    ).toMatch(/end date/i);
  });

  it("uses the same required-note and date validation for every persistence mode", () => {
    expect(
      validatePortalLeaveRequest({
        startIso: "2026-06-27",
        endIso: "2026-06-28",
        todayIso: "2026-06-27",
        reason: "   ",
      }),
    ).toEqual({ field: "reason", message: "Add a short note about your request." });

    expect(
      validatePortalLeaveRequest({
        startIso: "2026-06-26",
        endIso: "2026-06-28",
        todayIso: "2026-06-27",
        reason: "Family appointment",
      }),
    ).toEqual({ field: "dates", message: "Leave cannot start in the past." });
  });

  it("accepts one valid payload for both demo and live persistence", () => {
    expect(
      validatePortalLeaveRequest({
        startIso: "2026-06-28",
        endIso: "2026-06-30",
        todayIso: "2026-06-27",
        reason: "Family appointment",
      }),
    ).toBeNull();
  });
});
