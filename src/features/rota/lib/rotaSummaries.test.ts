import { describe, expect, it } from "vitest";
import type { DraftShift, RotaDayIndex, StaffMember } from "../types";
import { staffWeeklyHourTarget, workingTimeAlerts } from "./rotaSummaries";

function staff(id: string, contractedMinutesPerWeek: number | null, hrs = "40h"): StaffMember {
  return {
    id,
    name: `Staff ${id}`,
    role: "Chef",
    hrs,
    contractedMinutesPerWeek,
    img: 1,
    tone: "info",
  };
}

function daysScheduled(staffId: string, dayCount: number): DraftShift[] {
  return Array.from({ length: dayCount }, (_, index) => ({
    id: `${staffId}-${index}`,
    dayIndex: index as RotaDayIndex,
    staffId,
    role: "Chef",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info" as const,
    status: "scheduled" as const,
  }));
}

describe("workingTimeAlerts reads the numeric contract, not the display string", () => {
  it("flags a 37.5h contract scheduled over six days", () => {
    // The literal `hrs === "40h"` comparison saw only 40h contracts, so a 37.5h
    // full-timer working six days was silently never flagged.
    const alerts = workingTimeAlerts([staff("a", 2250, "37.5h")], daysScheduled("a", 6));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ staffId: "a", scheduledDays: 6 });
  });

  it("still flags a 40h contract over six days", () => {
    expect(workingTimeAlerts([staff("a", 2400)], daysScheduled("a", 6))).toHaveLength(1);
  });

  it("does not flag five days or fewer", () => {
    expect(workingTimeAlerts([staff("a", 2400)], daysScheduled("a", 5))).toHaveLength(0);
  });

  it("does not flag a part-time contract", () => {
    expect(workingTimeAlerts([staff("a", 1200, "20h")], daysScheduled("a", 6))).toHaveLength(0);
  });

  it("does not flag someone with no recorded contract", () => {
    // No figure is not evidence of a full-time contract, so nothing is claimed.
    expect(workingTimeAlerts([staff("a", null, "—")], daysScheduled("a", 7))).toHaveLength(0);
  });

  it("ignores the display string entirely", () => {
    // hrs says 40h but the real contract is part-time: the numeric field wins.
    expect(workingTimeAlerts([staff("a", 900, "40h")], daysScheduled("a", 7))).toHaveLength(0);
  });
});

describe("staffWeeklyHourTarget", () => {
  it("sums contracted hours from the numeric field", () => {
    expect(staffWeeklyHourTarget([staff("a", 2400), staff("b", 2250)])).toBeCloseTo(77.5);
  });

  it("contributes nothing for staff with no recorded contract", () => {
    expect(staffWeeklyHourTarget([staff("a", 2400), staff("b", null, "—")])).toBe(40);
  });

  it("is zero for an empty roster", () => {
    expect(staffWeeklyHourTarget([])).toBe(0);
  });
});
