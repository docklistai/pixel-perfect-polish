import { describe, expect, it } from "vitest";
import { validatePortalLeaveDates } from "./portalLeaveValidation";

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
});
