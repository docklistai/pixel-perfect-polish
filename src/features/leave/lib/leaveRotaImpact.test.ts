import { describe, expect, it } from "vitest";
import type { DraftShift } from "@/features/rota/types";
import { buildLeaveRotaImpact, weekOffsetForDate } from "./leaveRotaImpact";

// Week of Mon 6 Jul 2026 → Sun 12 Jul 2026.
const WEEK_START = "2026-07-06";

function shift(overrides: Partial<DraftShift> & Pick<DraftShift, "id" | "dayIndex">): DraftShift {
  return {
    staffId: "staff-1",
    role: "Chef",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...overrides,
  };
}

describe("buildLeaveRotaImpact", () => {
  it("lists scheduled shifts assigned to the staff member inside the leave window", () => {
    const shifts = [
      shift({ id: "wed", dayIndex: 2, role: "Kitchen", start: "08:00", end: "16:00" }),
      shift({ id: "thu", dayIndex: 3, role: "Bar", start: "12:00", end: "20:00" }),
    ];

    const impact = buildLeaveRotaImpact({
      shifts,
      weekStartIso: WEEK_START,
      staffId: "staff-1",
      startIso: "2026-07-08", // Wed
      endIso: "2026-07-09", // Thu
    });

    expect(impact.affectedShifts).toHaveLength(2);
    expect(impact.affectedShifts[0]).toMatchObject({
      id: "wed",
      dateIso: "2026-07-08",
      dayLabel: "Wed 8 Jul",
      role: "Kitchen",
      start: "08:00",
      end: "16:00",
    });
    expect(impact.affectedShifts[1]).toMatchObject({ id: "thu", dateIso: "2026-07-09" });
    expect(impact.leaveStartsInWeek).toBe(true);
    expect(impact.spansBeyondWeek).toBe(false);
  });

  it("returns no affected shifts when the staff member has none in the window", () => {
    const shifts = [shift({ id: "mon", dayIndex: 0 })]; // 6 Jul, before the window
    const impact = buildLeaveRotaImpact({
      shifts,
      weekStartIso: WEEK_START,
      staffId: "staff-1",
      startIso: "2026-07-08",
      endIso: "2026-07-09",
    });

    expect(impact.affectedShifts).toHaveLength(0);
  });

  it("excludes shifts that do not overlap the leave window", () => {
    const shifts = [
      shift({ id: "mon", dayIndex: 0 }), // 6 Jul — outside
      shift({ id: "fri", dayIndex: 4 }), // 10 Jul — outside
      shift({ id: "wed", dayIndex: 2 }), // 8 Jul — inside
    ];
    const impact = buildLeaveRotaImpact({
      shifts,
      weekStartIso: WEEK_START,
      staffId: "staff-1",
      startIso: "2026-07-08",
      endIso: "2026-07-08",
    });

    expect(impact.affectedShifts.map((s) => s.id)).toEqual(["wed"]);
  });

  it("does not count open (unassigned) shifts as exposed", () => {
    const shifts = [
      shift({ id: "open-null", dayIndex: 2, staffId: null, status: "open" }),
      shift({ id: "open-held", dayIndex: 2, status: "open" }), // status open even if id present
      shift({ id: "scheduled", dayIndex: 2, status: "scheduled" }),
    ];
    const impact = buildLeaveRotaImpact({
      shifts,
      weekStartIso: WEEK_START,
      staffId: "staff-1",
      startIso: "2026-07-08",
      endIso: "2026-07-08",
    });

    expect(impact.affectedShifts.map((s) => s.id)).toEqual(["scheduled"]);
  });

  it("excludes shifts belonging to other staff members", () => {
    const shifts = [
      shift({ id: "other", dayIndex: 2, staffId: "staff-2" }),
      shift({ id: "mine", dayIndex: 2, staffId: "staff-1" }),
    ];
    const impact = buildLeaveRotaImpact({
      shifts,
      weekStartIso: WEEK_START,
      staffId: "staff-1",
      startIso: "2026-07-08",
      endIso: "2026-07-08",
    });

    expect(impact.affectedShifts.map((s) => s.id)).toEqual(["mine"]);
  });

  it("supports multi-day leave within the same week, date-sorted", () => {
    const shifts = [
      shift({ id: "thu", dayIndex: 3 }),
      shift({ id: "tue", dayIndex: 1 }),
      shift({ id: "wed", dayIndex: 2 }),
    ];
    const impact = buildLeaveRotaImpact({
      shifts,
      weekStartIso: WEEK_START,
      staffId: "staff-1",
      startIso: "2026-07-07", // Tue
      endIso: "2026-07-09", // Thu
    });

    expect(impact.affectedShifts.map((s) => s.id)).toEqual(["tue", "wed", "thu"]);
  });

  it("flags leave that spans beyond the fetched week", () => {
    const impact = buildLeaveRotaImpact({
      shifts: [],
      weekStartIso: WEEK_START,
      staffId: "staff-1",
      startIso: "2026-07-10",
      endIso: "2026-07-15", // past Sun 12 Jul
    });

    expect(impact.spansBeyondWeek).toBe(true);
    expect(impact.leaveStartsInWeek).toBe(true);
  });

  it("reports when the leave start does not fall in the fetched week", () => {
    const impact = buildLeaveRotaImpact({
      shifts: [],
      weekStartIso: WEEK_START,
      staffId: "staff-1",
      startIso: "2026-07-01", // before this week
      endIso: "2026-07-01",
    });

    expect(impact.leaveStartsInWeek).toBe(false);
  });
});

describe("weekOffsetForDate", () => {
  it("returns 0 for a date in the same week as today", () => {
    expect(weekOffsetForDate("2026-07-06", "2026-07-08")).toBe(0);
    expect(weekOffsetForDate("2026-07-09", "2026-07-06")).toBe(0); // mid-week today, same week
  });

  it("returns positive offsets for future weeks", () => {
    expect(weekOffsetForDate("2026-07-06", "2026-07-13")).toBe(1);
    expect(weekOffsetForDate("2026-07-06", "2026-07-20")).toBe(2);
  });

  it("returns negative offsets for past weeks", () => {
    expect(weekOffsetForDate("2026-07-06", "2026-06-29")).toBe(-1);
  });

  it("treats Sunday as the end of its Monday-started week", () => {
    // Sun 12 Jul belongs to the week of Mon 6 Jul → same week as today.
    expect(weekOffsetForDate("2026-07-06", "2026-07-12")).toBe(0);
  });
});
