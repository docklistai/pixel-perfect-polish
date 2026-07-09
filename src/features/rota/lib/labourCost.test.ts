import { describe, expect, it } from "vitest";
import { estimateLabourCost, paidShiftHours } from "./labourCost";
import type { DraftShift } from "../types";

const settings = {
  weeklyBudgetMinutes: 4800, // 80h
  dailyBudgetMinutes: null,
  targetLabourPct: 30,
  forecastWeeklySalesPence: 1_000_000, // £10,000
  avgHourlyCostPence: 1200, // £12
  budgetWarningPct: 95,
};

function shift(partial: Partial<DraftShift>): DraftShift {
  return {
    id: "s1",
    dayIndex: 0,
    staffId: "a",
    role: "Waiter",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...partial,
  } as DraftShift;
}

describe("paidShiftHours", () => {
  it("deducts unpaid breaks from the scheduled span", () => {
    expect(paidShiftHours({ start: "09:00", end: "17:00", breakMinutes: 30 })).toBe(7.5);
  });

  it("never goes negative", () => {
    expect(paidShiftHours({ start: "09:00", end: "09:30", breakMinutes: 120 })).toBe(0);
  });
});

describe("estimateLabourCost", () => {
  it("uses per-staff rates and the fallback for unrated staff", () => {
    const view = estimateLabourCost({
      shifts: [shift({ staffId: "a" }), shift({ id: "s2", staffId: "b" })],
      scheduledHours: 16,
      rates: { a: 1500 },
      settings,
    });
    // a: 7.5h × £15 = £112.50; b: 7.5h × £12 fallback = £90.
    expect(view.estCostPence).toBe(20250);
    expect(view.usedFallbackRate).toBe(true);
    expect(view.budgetHours).toBe(80);
    expect(view.labourPct).toBeCloseTo(2.025);
    expect(view.budgetState).toBe("within");
  });

  it("returns a null cost when a shift has no rate and no fallback exists", () => {
    const view = estimateLabourCost({
      shifts: [shift({ staffId: "a" })],
      scheduledHours: 8,
      rates: {},
      settings: { ...settings, avgHourlyCostPence: null },
    });
    expect(view.estCostPence).toBeNull();
    expect(view.labourPct).toBeNull();
  });

  it("ignores open shifts", () => {
    const view = estimateLabourCost({
      shifts: [shift({ staffId: null, status: "open" })],
      scheduledHours: 0,
      rates: {},
      settings,
    });
    expect(view.estCostPence).toBe(0);
    expect(view.usedFallbackRate).toBe(false);
  });

  it("flags near and over budget states against the warning threshold", () => {
    const near = estimateLabourCost({
      shifts: [],
      scheduledHours: 77, // ≥ 95% of 80h
      rates: {},
      settings,
    });
    expect(near.budgetState).toBe("near");

    const over = estimateLabourCost({ shifts: [], scheduledHours: 81, rates: {}, settings });
    expect(over.budgetState).toBe("over");

    const unset = estimateLabourCost({
      shifts: [],
      scheduledHours: 81,
      rates: {},
      settings: null,
    });
    expect(unset.budgetState).toBe("no-budget");
  });
});
