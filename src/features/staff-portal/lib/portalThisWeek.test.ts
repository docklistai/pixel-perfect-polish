import { describe, expect, it } from "vitest";
import { buildPortalThisWeekShape } from "./portalThisWeek";
import type { PortalShift } from "../types";
import type { PortalWeekDay } from "./portalNow";

const MOCK_WEEK_DAYS: PortalWeekDay[] = [
  { iso: "2026-06-08", dayNum: 8, letter: "M" },
  { iso: "2026-06-09", dayNum: 9, letter: "T" },
  { iso: "2026-06-10", dayNum: 10, letter: "W" },
  { iso: "2026-06-11", dayNum: 11, letter: "T" },
  { iso: "2026-06-12", dayNum: 12, letter: "F" },
  { iso: "2026-06-13", dayNum: 13, letter: "S" },
  { iso: "2026-06-14", dayNum: 14, letter: "S" },
];

function makeShift(overrides: Partial<PortalShift>): PortalShift {
  return {
    id: "shift-1",
    date: "2026-06-08",
    dayLabel: "Mon 8 Jun",
    start: "09:00",
    end: "17:00",
    hours: 8,
    role: "Barista",
    station: "Main Bar",
    breakMinutes: 30,
    status: "confirmed",
    sourceSnapshotVersion: 1,
    publishedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("buildPortalThisWeekShape — published week shape (§8.3)", () => {
  it("returns an honest empty shape when hasPublished is false", () => {
    const shape = buildPortalThisWeekShape({
      hasPublished: false,
      weekDays: MOCK_WEEK_DAYS,
      shifts: [makeShift({ date: "2026-06-08" })],
      weekLabel: "8 – 14 Jun 2026",
    });

    expect(shape.hasPublished).toBe(false);
    expect(shape.days).toHaveLength(0);
    expect(shape.assignedShiftCount).toBe(0);
  });

  it("returns an honest empty shape when weekDays is empty", () => {
    const shape = buildPortalThisWeekShape({
      hasPublished: true,
      weekDays: [],
      shifts: [],
      weekLabel: "8 – 14 Jun 2026",
    });

    expect(shape.hasPublished).toBe(false);
    expect(shape.days).toHaveLength(0);
  });

  it("builds all 7 days of the week with shift times and off states", () => {
    const shifts = [
      makeShift({ id: "s1", date: "2026-06-08", start: "09:00", end: "17:00" }),
      makeShift({ id: "s2", date: "2026-06-10", start: "14:00", end: "22:00" }),
    ];

    const shape = buildPortalThisWeekShape({
      hasPublished: true,
      weekDays: MOCK_WEEK_DAYS,
      shifts,
      todayIso: "2026-06-09",
      weekLabel: "8 – 14 Jun 2026",
    });

    expect(shape.hasPublished).toBe(true);
    expect(shape.days).toHaveLength(7);
    expect(shape.assignedShiftCount).toBe(2);

    // Monday: assigned shift
    const mon = shape.days[0]!;
    expect(mon.iso).toBe("2026-06-08");
    expect(mon.weekdayName).toBe("Mon");
    expect(mon.formattedDate).toBe("Mon 8");
    expect(mon.isToday).toBe(false);
    expect(mon.primaryShift?.id).toBe("s1");
    expect(mon.primaryShift?.start).toBe("09:00");
    expect(mon.isOvernight).toBe(false);
    expect(mon.isOff).toBe(false);

    // Tuesday: today, off
    const tue = shape.days[1]!;
    expect(tue.iso).toBe("2026-06-09");
    expect(tue.weekdayName).toBe("Tue");
    expect(tue.isToday).toBe(true);
    expect(tue.primaryShift).toBeNull();
    expect(tue.isOff).toBe(true);

    // Wednesday: assigned shift
    const wed = shape.days[2]!;
    expect(wed.primaryShift?.id).toBe("s2");
    expect(wed.isOff).toBe(false);

    // Thursday: off
    const thu = shape.days[3]!;
    expect(thu.isOff).toBe(true);
  });

  it("marks overnight finish unambiguously", () => {
    const shifts = [
      makeShift({ id: "s-overnight", date: "2026-06-11", start: "22:00", end: "06:00" }),
    ];

    const shape = buildPortalThisWeekShape({
      hasPublished: true,
      weekDays: MOCK_WEEK_DAYS,
      shifts,
      todayIso: "2026-06-08",
    });

    const thu = shape.days[3]!;
    expect(thu.primaryShift?.id).toBe("s-overnight");
    expect(thu.isOvernight).toBe(true);
  });

  it("surfaces approved leave context on days without shifts", () => {
    const leaveRequests = [
      {
        startIso: "2026-06-12",
        endIso: "2026-06-13",
        type: "Annual leave",
        status: "approved",
      },
      {
        startIso: "2026-06-14",
        endIso: "2026-06-14",
        type: "Medical appointment",
        status: "pending", // Pending leave should NOT appear as approved context
      },
    ];

    const shape = buildPortalThisWeekShape({
      hasPublished: true,
      weekDays: MOCK_WEEK_DAYS,
      shifts: [],
      leaveRequests,
    });

    // Friday 12 Jun: approved annual leave
    const fri = shape.days[4]!;
    expect(fri.isOff).toBe(false);
    expect(fri.leaveContext).toEqual({
      type: "Annual leave",
      isApproved: true,
    });

    // Saturday 13 Jun: approved annual leave
    const sat = shape.days[5]!;
    expect(sat.isOff).toBe(false);
    expect(sat.leaveContext?.type).toBe("Annual leave");

    // Sunday 14 Jun: pending leave does not count as approved context, so day is Off
    const sun = shape.days[6]!;
    expect(sun.leaveContext).toBeNull();
    expect(sun.isOff).toBe(true);
  });

  it("keeps open shifts separate and never mixes them into assigned shifts", () => {
    const shifts = [
      makeShift({ id: "s-assigned", date: "2026-06-08", status: "confirmed" }),
      makeShift({ id: "s-open", date: "2026-06-09", status: "open" }),
    ];

    const shape = buildPortalThisWeekShape({
      hasPublished: true,
      weekDays: MOCK_WEEK_DAYS,
      shifts,
    });

    // Monday has the assigned shift
    expect(shape.days[0]!.shifts).toHaveLength(1);
    expect(shape.days[0]!.primaryShift?.id).toBe("s-assigned");

    // Tuesday open shift is NOT mixed in; Tuesday is Off
    expect(shape.days[1]!.shifts).toHaveLength(0);
    expect(shape.days[1]!.primaryShift).toBeNull();
    expect(shape.days[1]!.isOff).toBe(true);

    expect(shape.assignedShiftCount).toBe(1);
  });
});
