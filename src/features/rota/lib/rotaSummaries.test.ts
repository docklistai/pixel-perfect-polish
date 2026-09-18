import { describe, expect, it } from "vitest";
import type { DraftShift, RotaDayIndex, StaffMember } from "../types";
import {
  buildDayStats,
  buildRoleCoverage,
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

describe("buildDayStats", () => {
  it("returns empty coverage and 0 planned hours for empty days", () => {
    const stats = buildDayStats([]);
    expect(stats).toHaveLength(7);
    for (const day of stats) {
      expect(day.c).toBe("");
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
    // Day 0: 8h + 4h = 12h planned. 1 assigned of 2 shifts
    expect(stats[0]).toEqual({
      h: "12h",
      c: "1 of 2 assigned",
      tone: "warning",
      hours: 12,
    });
    // Day 1: empty
    expect(stats[1]).toEqual({
      h: "0h",
      c: "",
      tone: "muted",
      hours: 0,
    });
  });

  it("handles a day with only open shifts (1 open, planned hours > 0, warning tone)", () => {
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
      c: "1 open",
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
      tone: "info",
    });
  });

  it("renders 'X of X assigned' when role has no open shifts", () => {
    const team = [staff("a", 2400)];
    const shifts = daysScheduled("a", 3);
    const roleCoverage = buildRoleCoverage(team, shifts);
    expect(roleCoverage).toHaveLength(1);
    expect(roleCoverage[0]).toEqual({
      label: "Chef",
      value: "3 of 3 assigned",
      tone: "info",
    });
  });

  it("sorts roles stably by label without ranking by completion percentage", () => {
    const team: StaffMember[] = [
      {
        id: "1",
        name: "Staff 1",
        role: "Sous Chef",
        hrs: "40h",
        contractedMinutesPerWeek: 2400,
        img: 1,
        tone: "info",
      },
      {
        id: "2",
        name: "Staff 2",
        role: "Bartender",
        hrs: "40h",
        contractedMinutesPerWeek: 2400,
        img: 1,
        tone: "info",
      },
      {
        id: "3",
        name: "Staff 3",
        role: "Head Chef",
        hrs: "40h",
        contractedMinutesPerWeek: 2400,
        img: 1,
        tone: "info",
      },
    ];
    // Bartender: 0% assigned (1 open)
    // Head Chef: 100% assigned (1 assigned)
    // Sous Chef: 50% assigned (1 assigned, 1 open)
    const shifts: DraftShift[] = [
      {
        id: "s1",
        dayIndex: 0,
        staffId: null,
        role: "Bartender",
        start: "09:00",
        end: "17:00",
        breakMinutes: 0,
        tone: "warning",
        status: "open",
      },
      {
        id: "s2",
        dayIndex: 0,
        staffId: "3",
        role: "Head Chef",
        start: "09:00",
        end: "17:00",
        breakMinutes: 0,
        tone: "info",
        status: "scheduled",
      },
      {
        id: "s3",
        dayIndex: 0,
        staffId: "1",
        role: "Sous Chef",
        start: "09:00",
        end: "17:00",
        breakMinutes: 0,
        tone: "info",
        status: "scheduled",
      },
      {
        id: "s4",
        dayIndex: 1,
        staffId: null,
        role: "Sous Chef",
        start: "09:00",
        end: "17:00",
        breakMinutes: 0,
        tone: "warning",
        status: "open",
      },
    ];
    const roleCoverage = buildRoleCoverage(team, shifts);
    expect(roleCoverage.map((r) => r.label)).toEqual(["Bartender", "Head Chef", "Sous Chef"]);
  });
});
