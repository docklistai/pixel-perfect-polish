import { describe, expect, it } from "vitest";
import type { DraftShift, RotaDayIndex, StaffMember } from "../types";
import {
  buildDayStats,
  buildRoleCoverage,
  coveragePercent,
  staffWeeklyHourTarget,
  workingTimeAlerts,
} from "./rotaSummaries";

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

describe("coveragePercent", () => {
  it("returns 0 on an empty week with no planned shifts", () => {
    expect(coveragePercent([staff("a", 2400)], [])).toBe(0);
  });

  it("calculates percentage of assigned shifts out of planned shifts", () => {
    const shifts: DraftShift[] = [
      ...daysScheduled("a", 3), // 3 assigned
      {
        id: "open-1",
        dayIndex: 3,
        staffId: null,
        role: "Chef",
        start: "09:00",
        end: "17:00",
        breakMinutes: 30,
        tone: "warning",
        status: "open",
      },
    ];
    // 3 assigned out of 4 planned = 75%
    expect(coveragePercent([staff("a", 2400)], shifts)).toBe(75);
  });
});

describe("buildDayStats", () => {
  it("returns 0% coverage and 0 planned hours for empty days", () => {
    const stats = buildDayStats([]);
    expect(stats).toHaveLength(7);
    for (const day of stats) {
      expect(day.c).toBe("0%");
      expect(day.h).toBe("0h");
      expect(day.hours).toBe(0);
      expect(day.tone).toBe("muted");
    }
  });

  it("sums assigned and open shifts in planned hours and reflects open shifts in coverage and tone", () => {
    const shifts: DraftShift[] = [
      {
        id: "s1",
        dayIndex: 0,
        staffId: "a",
        role: "Chef",
        start: "09:00",
        end: "17:00", // 8h
        breakMinutes: 0,
        tone: "info",
        status: "scheduled",
      },
      {
        id: "s2",
        dayIndex: 0,
        staffId: null,
        role: "Chef",
        start: "17:00",
        end: "21:00", // 4h
        breakMinutes: 0,
        tone: "warning",
        status: "open",
      },
    ];

    const stats = buildDayStats(shifts);
    // Day 0: 8h + 4h = 12h planned. 1 assigned of 2 shifts = 50%
    expect(stats[0]).toEqual({
      h: "12h",
      c: "50%",
      tone: "warning",
      hours: 12,
    });
    // Day 1: empty
    expect(stats[1]).toEqual({
      h: "0h",
      c: "0%",
      tone: "muted",
      hours: 0,
    });
  });

  it("handles a day with only open shifts (0% coverage, planned hours > 0, warning tone)", () => {
    const shifts: DraftShift[] = [
      {
        id: "s1",
        dayIndex: 2,
        staffId: null,
        role: "Chef",
        start: "08:00",
        end: "16:00", // 8h
        breakMinutes: 0,
        tone: "warning",
        status: "open",
      },
    ];

    const stats = buildDayStats(shifts);
    expect(stats[2]).toEqual({
      h: "8h",
      c: "0%",
      tone: "warning",
      hours: 8,
    });
  });
});

describe("buildRoleCoverage", () => {
  it("renders factual planned/assigned/open composition", () => {
    const team = [staff("a", 2400), staff("b", 2400)];
    // Team has Chef role only
    const shifts: DraftShift[] = [
      {
        id: "s1",
        dayIndex: 0,
        staffId: "a",
        role: "Chef",
        start: "09:00",
        end: "17:00",
        breakMinutes: 0,
        tone: "info",
        status: "scheduled",
      },
      {
        id: "s2",
        dayIndex: 1,
        staffId: null,
        role: "Chef",
        start: "09:00",
        end: "17:00",
        breakMinutes: 0,
        tone: "warning",
        status: "open",
      },
    ];

    const roleCoverage = buildRoleCoverage(team, shifts);
    expect(roleCoverage).toHaveLength(1);
    expect(roleCoverage[0]).toEqual({
      label: "Chef",
      value: "1 of 2 assigned · 1 open",
      pct: 50,
      tone: "info",
    });
  });

  it("renders 'No shifts planned' when role has 0 shifts", () => {
    const team = [staff("a", 2400)];
    const roleCoverage = buildRoleCoverage(team, []);
    expect(roleCoverage).toHaveLength(1);
    expect(roleCoverage[0]).toEqual({
      label: "Chef",
      value: "No shifts planned",
      pct: 0,
      tone: "info",
    });
  });

  it("renders 'X assigned' when role has no open shifts", () => {
    const team = [staff("a", 2400)];
    const shifts = daysScheduled("a", 3);
    const roleCoverage = buildRoleCoverage(team, shifts);
    expect(roleCoverage).toHaveLength(1);
    expect(roleCoverage[0]).toEqual({
      label: "Chef",
      value: "3 assigned",
      pct: 100,
      tone: "info",
    });
  });
});
