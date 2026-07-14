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

  it("ignores pending constraints because callers pass approved facts only", () => {
    expect(
      filterEligibleOpenShifts([openShift()], {
        approvedLeave: [],
        approvedRecurringWeekdays: new Set(),
        approvedUnavailableDates: new Set(),
      }),
    ).toHaveLength(1);
  });
});
