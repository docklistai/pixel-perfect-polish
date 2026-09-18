import { describe, expect, it } from "vitest";
import type { PortalOpenShift } from "../api/openShiftRequests";
import { filterEligibleOpenShifts } from "./openShiftEligibility";

function openShift(overrides: Partial<PortalOpenShift> = {}): PortalOpenShift {
  return {
    publishedShiftId: "shift-1",
    date: "2026-07-13",
    endDate: "2026-07-13",
    dayLabel: "Mon 13 Jul",
    start: "09:00",
    end: "17:00",
    role: "Server",
    ...overrides,
  };
}

describe("portal open-shift eligibility", () => {
  it("excludes approved leave and approved one-off unavailability", () => {
    const shifts = [
      openShift({ publishedShiftId: "leave", date: "2026-07-13" }),
      openShift({ publishedShiftId: "unavailable", date: "2026-07-14", endDate: "2026-07-14" }),
      openShift({ publishedShiftId: "free", date: "2026-07-15", endDate: "2026-07-15" }),
    ];

    expect(
      filterEligibleOpenShifts(shifts, {
        approvedLeave: [{ startIso: "2026-07-13", endIso: "2026-07-13" }],
        approvedRecurringWeekdays: new Set(),
        approvedUnavailableDates: new Set(["2026-07-14"]),
      }).map((shift) => shift.publishedShiftId),
    ).toEqual(["free"]);
  });

  it("checks both local dates for an overnight shift", () => {
    const overnight = openShift({
      publishedShiftId: "overnight",
      date: "2026-07-17",
      endDate: "2026-07-18",
      start: "22:00",
      end: "06:00",
    });

    expect(
      filterEligibleOpenShifts([overnight], {
        approvedLeave: [],
        approvedRecurringWeekdays: new Set([5]),
        approvedUnavailableDates: new Set(),
      }),
    ).toEqual([]);
  });

  it("filters shifts overlapping approved or pending blocking leave", () => {
    const shift = openShift({ publishedShiftId: "s1", date: "2026-07-13", endDate: "2026-07-13" });

    // Pending overlapping leave filters the shift
    expect(
      filterEligibleOpenShifts([shift], {
        blockingLeave: [{ startIso: "2026-07-13", endIso: "2026-07-13" }],
        approvedRecurringWeekdays: new Set(),
        approvedUnavailableDates: new Set(),
      }),
    ).toHaveLength(0);

    // Approved overlapping leave filters the shift
    expect(
      filterEligibleOpenShifts([shift], {
        blockingLeave: [{ startIso: "2026-07-12", endIso: "2026-07-14" }],
        approvedRecurringWeekdays: new Set(),
        approvedUnavailableDates: new Set(),
      }),
    ).toHaveLength(0);

    // Non-blocking / non-overlapping leave does not filter the shift
    expect(
      filterEligibleOpenShifts([shift], {
        blockingLeave: [{ startIso: "2026-07-14", endIso: "2026-07-15" }],
        approvedRecurringWeekdays: new Set(),
        approvedUnavailableDates: new Set(),
      }),
    ).toHaveLength(1);
  });

  it("filters overnight shifts when blocking leave overlaps the start or end date", () => {
    const overnight = openShift({
      publishedShiftId: "overnight",
      date: "2026-07-17",
      endDate: "2026-07-18",
      start: "22:00",
      end: "06:00",
    });

    // Leave on start date (2026-07-17) blocks
    expect(
      filterEligibleOpenShifts([overnight], {
        blockingLeave: [{ startIso: "2026-07-17", endIso: "2026-07-17" }],
        approvedRecurringWeekdays: new Set(),
        approvedUnavailableDates: new Set(),
      }),
    ).toHaveLength(0);

    // Leave on end date (2026-07-18) blocks
    expect(
      filterEligibleOpenShifts([overnight], {
        blockingLeave: [{ startIso: "2026-07-18", endIso: "2026-07-18" }],
        approvedRecurringWeekdays: new Set(),
        approvedUnavailableDates: new Set(),
      }),
    ).toHaveLength(0);

    // Leave outside shift boundary does not block
    expect(
      filterEligibleOpenShifts([overnight], {
        blockingLeave: [{ startIso: "2026-07-19", endIso: "2026-07-19" }],
        approvedRecurringWeekdays: new Set(),
        approvedUnavailableDates: new Set(),
      }),
    ).toHaveLength(1);
  });
});
