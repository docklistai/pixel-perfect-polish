import { describe, expect, it } from "vitest";
import {
  buildCompactWeekShape,
  buildLiveKpis,
  countAssignedToday,
  countOpenToday,
  dayIndexInWeek,
} from "./dashboardKpis";
import { quickActionItems } from "../data/dashboardDemoData";
import type { DraftShift } from "@/features/rota/types";

function makeShift(partial: Partial<DraftShift>): DraftShift {
  return {
    id: "shift-1",
    dayIndex: 0,
    start: "09:00",
    end: "17:00",
    breakMinutes: 0,
    role: "Front of House",
    staffId: "staff-1",
    status: "scheduled",
    tone: "info",
    ...partial,
  };
}

describe("dayIndexInWeek", () => {
  it("calculates correct day offset within a Monday-starting week", () => {
    expect(dayIndexInWeek("2026-06-08", "2026-06-08")).toBe(0); // Monday
    expect(dayIndexInWeek("2026-06-08", "2026-06-11")).toBe(3); // Thursday
    expect(dayIndexInWeek("2026-06-08", "2026-06-14")).toBe(6); // Sunday
  });

  it("returns null when date is outside the week or invalid", () => {
    expect(dayIndexInWeek("2026-06-08", "2026-06-07")).toBeNull();
    expect(dayIndexInWeek("2026-06-08", "2026-06-15")).toBeNull();
    expect(dayIndexInWeek(null, "2026-06-11")).toBeNull();
    expect(dayIndexInWeek("2026-06-08", null)).toBeNull();
  });
});

describe("countAssignedToday and countOpenToday", () => {
  const shifts: DraftShift[] = [
    makeShift({ id: "s1", dayIndex: 2, staffId: "staff-1" }),
    makeShift({ id: "s2", dayIndex: 2, staffId: null }),
    makeShift({ id: "s3", dayIndex: 2, staffId: "staff-2" }),
    makeShift({ id: "s4", dayIndex: 3, staffId: "staff-3" }),
  ];

  it("counts assigned shifts on today's index", () => {
    expect(countAssignedToday(shifts, 2)).toBe(2);
    expect(countAssignedToday(shifts, 3)).toBe(1);
    expect(countAssignedToday(shifts, 0)).toBe(0);
    expect(countAssignedToday(shifts, null)).toBe(0);
  });

  it("counts open shifts on today's index", () => {
    expect(countOpenToday(shifts, 2)).toBe(1);
    expect(countOpenToday(shifts, 3)).toBe(0);
    expect(countOpenToday(shifts, 0)).toBe(0);
    expect(countOpenToday(shifts, null)).toBe(0);
  });
});

describe("buildLiveKpis — Today and This Week return materially different content sets", () => {
  it("provides distinct jobs: Weekly tracks volume and staffing; Today tracks live execution and immediate open work", () => {
    const shifts: DraftShift[] = [
      makeShift({ id: "s1", dayIndex: 0, start: "09:00", end: "17:00", staffId: "st-1" }),
      makeShift({ id: "s2", dayIndex: 0, start: "10:00", end: "18:00", staffId: null }),
      makeShift({ id: "s3", dayIndex: 1, start: "09:00", end: "17:00", staffId: "st-2" }),
    ];

    const kpis = buildLiveKpis({
      shifts,
      staffCount: 12,
      onShiftToday: 1,
      openShiftsToday: 1,
    });

    const weeklyLabels = kpis.weeklyKpis.map((k) => k.label);
    const todayLabels = kpis.todayKpis.map((k) => k.label);

    // Assert that the labels are completely mutually exclusive
    expect(weeklyLabels).toEqual(["Scheduled hours", "Open shifts", "Team size"]);
    expect(todayLabels).toEqual(["On shift today", "Open today"]);

    const overlap = weeklyLabels.filter((label) => todayLabels.includes(label));
    expect(overlap).toHaveLength(0);

    // Weekly values reflect full week aggregates
    expect(kpis.weeklyKpis.find((k) => k.label === "Scheduled hours")?.value).toBe("16h");
    expect(kpis.weeklyKpis.find((k) => k.label === "Open shifts")?.value).toBe("1");
    expect(kpis.weeklyKpis.find((k) => k.label === "Team size")?.value).toBe("12");

    // Today values reflect immediate day state
    expect(kpis.todayKpis.find((k) => k.label === "On shift today")?.value).toBe("1");
    expect(kpis.todayKpis.find((k) => k.label === "Open today")?.value).toBe("1");
  });
});

describe("buildCompactWeekShape — week-shape derivation reusing WS-2 truth", () => {
  it("returns honest empty states when no shifts are planned", () => {
    const shape = buildCompactWeekShape([]);
    expect(shape).toHaveLength(7);
    shape.forEach((day) => {
      expect(day.planned).toBe(0);
      expect(day.assigned).toBe(0);
      expect(day.open).toBe(0);
      expect(day.summary).toBe("No shifts planned");
      expect(day.tone).toBe("muted");
    });
  });

  it("states fully assigned days with count and no coverage percentage", () => {
    const shifts: DraftShift[] = [
      makeShift({ id: "s1", dayIndex: 0, staffId: "staff-1" }),
      makeShift({ id: "s2", dayIndex: 0, staffId: "staff-2" }),
      makeShift({ id: "s3", dayIndex: 0, staffId: "staff-3" }),
    ];
    const shape = buildCompactWeekShape(shifts);
    const mon = shape[0]!;

    expect(mon.planned).toBe(3);
    expect(mon.assigned).toBe(3);
    expect(mon.open).toBe(0);
    expect(mon.summary).toBe("3 assigned");
    expect(mon.tone).toBe("muted");
  });

  it("states mixed assigned and open shifts honestly without calculating percentages", () => {
    // 6 assigned, 2 open = 8 planned
    const shifts: DraftShift[] = [
      ...Array.from({ length: 6 }, (_, i) =>
        makeShift({ id: `assigned-${i}`, dayIndex: 4, staffId: `staff-${i}` }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        makeShift({ id: `open-${i}`, dayIndex: 4, staffId: null }),
      ),
    ];

    const shape = buildCompactWeekShape(shifts);
    const fri = shape[4]!;

    expect(fri.planned).toBe(8);
    expect(fri.assigned).toBe(6);
    expect(fri.open).toBe(2);
    expect(fri.summary).toBe("6 of 8 assigned · 2 open");
    expect(fri.tone).toBe("warning");

    // Strictly assert NO coverage percentages anywhere in any summary
    shape.forEach((day) => {
      expect(day.summary).not.toContain("%");
      expect(day.summary.toLowerCase()).not.toContain("coverage");
    });
  });

  it("highlights conflict status with danger tone", () => {
    const shifts: DraftShift[] = [
      makeShift({ id: "c1", dayIndex: 1, staffId: "st-1", status: "conflict" }),
    ];
    const shape = buildCompactWeekShape(shifts);
    expect(shape[1]!.tone).toBe("danger");
  });
});

describe("Quick Actions definition", () => {
  it("defines Quick Actions once with distinct routes and titles", () => {
    expect(quickActionItems.length).toBeGreaterThan(0);
    const titles = quickActionItems.map((item) => item.t);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);

    // Each action points to an authorized manager workflow
    quickActionItems.forEach((action) => {
      expect(action.route).toMatch(/^\/(rota|staff|leave|team|ops)$/);
    });
  });
});
