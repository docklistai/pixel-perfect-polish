import { describe, expect, it } from "vitest";
import { estimatePortalPay, formatEstimateAmount } from "./portalPayEstimate";
import type { PortalShift } from "../types";

function shift(partial: Partial<PortalShift>): PortalShift {
  return {
    id: "s1",
    date: "2026-07-08",
    dayLabel: "Wed 8 Jul",
    start: "09:00",
    end: "17:00",
    hours: 8,
    role: "Waiter",
    station: "Main",
    breakMinutes: 30,
    status: "confirmed",
    ...partial,
  } as PortalShift;
}

describe("estimatePortalPay", () => {
  it("sums paid hours net of breaks and multiplies by the rate", () => {
    const estimate = estimatePortalPay(
      [shift({}), shift({ id: "s2", date: "2026-07-10", breakMinutes: 0, hours: 6 })],
      1250,
      "2026-07-08",
      "2026-07-14",
    );
    expect(estimate.hours).toBe(13.5);
    expect(estimate.amountPence).toBe(16875);
    expect(estimate.shiftCount).toBe(2);
  });

  it("ignores shifts outside the window", () => {
    const estimate = estimatePortalPay(
      [shift({ date: "2026-07-20" })],
      1250,
      "2026-07-08",
      "2026-07-14",
    );
    expect(estimate.shiftCount).toBe(0);
    expect(estimate.amountPence).toBe(0);
  });
});

describe("formatEstimateAmount", () => {
  it("formats pence as pounds with two decimals", () => {
    expect(formatEstimateAmount(16875)).toBe("£168.75");
  });
});
