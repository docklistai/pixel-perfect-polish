import { describe, it, expect, vi } from "vitest";
import { applyLiveOpenShiftSuggestions, fillOpenShiftsWithSuggestions } from "./rotaSuggestions";
import type { ApprovedAvailabilityConstraints } from "./availabilityConstraints";
import { isoWeekday } from "./recurringDayOffClashes";
import type { DraftShift, RotaDayIndex, StaffMember } from "../types";
import type { LeaveRequest } from "@/features/leave/types";

// 2026-06-08 is a Monday.
const MONDAY = "2026-06-08";
const TUESDAY = "2026-06-09";

function staff(id: string, name: string, role: string): StaffMember {
  return { id, name, role, hrs: "0", img: 1, tone: "info" };
}

function shift(
  id: string,
  dayIndex: RotaDayIndex,
  role: string,
  staffId: string | null,
  times: { start: string; end: string } = { start: "09:00", end: "17:00" },
): DraftShift {
  return {
    id,
    dayIndex,
    staffId,
    role,
    start: times.start,
    end: times.end,
    breakMinutes: 30,
    tone: staffId === null ? "open" : "info",
    status: staffId === null ? "open" : "scheduled",
  };
}

function leave(staffId: string, state: LeaveRequest["state"], iso = MONDAY): LeaveRequest {
  return {
    id: `leave-${staffId}`,
    staffId,
    n: "Someone",
    role: "Chef",
    dept: "Kitchen",
    date: "8 Jun",
    startIso: iso,
    endIso: iso,
    days: 1,
    type: "Annual leave",
    impact: "Low",
    tone: "warning",
    state,
    notice: 7,
    reason: "",
    img: 1,
    balance: "",
    submitted: "",
    coverNote: "",
  };
}

function constraintsOf(input: {
  unavailable?: Record<string, string[]>;
  recurring?: Record<string, number[]>;
}): ApprovedAvailabilityConstraints {
  return {
    unavailableDatesByStaff: new Map(
      Object.entries(input.unavailable ?? {}).map(([id, dates]) => [id, new Set(dates)]),
    ),
    recurringByStaff: new Map(
      Object.entries(input.recurring ?? {}).map(([id, days]) => [id, new Set(days)]),
    ),
  };
}

describe("fillOpenShiftsWithSuggestions", () => {
  it("assigns an open shift to a role-matching staff member with a reason", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Chef")],
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({ shiftId: "s1", staffId: "a", role: "Chef" });
    expect(result.shifts[0]!.staffId).toBe("a");
    expect(result.shifts[0]!.status).toBe("scheduled");
    expect(result.unfilled).toHaveLength(0);
  });

  it("never mutates already-assigned shifts", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", "a")],
      [staff("a", "Ana", "Chef")],
    );
    expect(result.suggestions).toHaveLength(0);
    expect(result.shifts[0]!.staffId).toBe("a");
  });

  it("prefers the candidate with fewer shifts already assigned this week", () => {
    const result = fillOpenShiftsWithSuggestions(
      [
        shift("busy1", 0, "Chef", "a"),
        shift("busy2", 1, "Chef", "a"),
        shift("open1", 2, "Chef", null),
      ],
      [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef")],
    );
    expect(result.suggestions[0]!.staffId).toBe("b");
  });

  it("is deterministic when candidates are otherwise tied", () => {
    const run = () =>
      fillOpenShiftsWithSuggestions(
        [shift("s1", 0, "Chef", null)],
        [staff("b", "Ben", "Chef"), staff("a", "Ana", "Chef")],
      ).suggestions[0]!.staffId;
    expect(run()).toBe("a");
    expect(run()).toBe(run());
  });
});

describe("fill exclusions", () => {
  it("excludes an incompatible role and says so", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Waiter")],
    );
    expect(result.suggestions).toHaveLength(0);
    expect(result.unfilled[0]!.reason).toBe("No active staff hold the Chef role.");
  });

  it("excludes approved leave", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef")],
      { dayIsoDates: [MONDAY], leaveRequests: [leave("a", "approved")] },
    );
    expect(result.suggestions[0]!.staffId).toBe("b");
  });

  it("excludes pending leave too, rather than scheduling over a live request", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef")],
      { dayIsoDates: [MONDAY], leaveRequests: [leave("a", "pending")] },
    );
    expect(result.suggestions[0]!.staffId).toBe("b");
  });

  it("excludes approved one-off unavailability on the shift date", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef")],
      { dayIsoDates: [MONDAY], constraints: constraintsOf({ unavailable: { a: [MONDAY] } }) },
    );
    expect(result.suggestions[0]!.staffId).toBe("b");
  });

  it("does not exclude unavailability recorded for a different date", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Chef")],
      { dayIsoDates: [MONDAY], constraints: constraintsOf({ unavailable: { a: [TUESDAY] } }) },
    );
    expect(result.suggestions[0]!.staffId).toBe("a");
  });

  it("excludes a recurring day off on the shift's weekday", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef")],
      {
        dayIsoDates: [MONDAY],
        constraints: constraintsOf({ recurring: { a: [isoWeekday(MONDAY)] } }),
      },
    );
    expect(result.suggestions[0]!.staffId).toBe("b");
  });

  it("does not exclude a recurring day off on a different weekday", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Chef")],
      {
        dayIsoDates: [MONDAY],
        constraints: constraintsOf({ recurring: { a: [isoWeekday(TUESDAY)] } }),
      },
    );
    expect(result.suggestions[0]!.staffId).toBe("a");
  });

  it("excludes an overlapping assigned shift", () => {
    const result = fillOpenShiftsWithSuggestions(
      [
        shift("busy", 0, "Chef", "a", { start: "08:00", end: "16:00" }),
        shift("open1", 0, "Chef", null, { start: "12:00", end: "20:00" }),
      ],
      [staff("a", "Ana", "Chef")],
    );
    expect(result.suggestions).toHaveLength(0);
    expect(result.unfilled[0]!.reason).toContain("already working an overlapping shift");
  });

  it("excludes someone already rostered that day, even when the times do not overlap", () => {
    const result = fillOpenShiftsWithSuggestions(
      [
        shift("morning", 0, "Chef", "a", { start: "08:00", end: "12:00" }),
        shift("evening", 0, "Chef", null, { start: "17:00", end: "22:00" }),
      ],
      [staff("a", "Ana", "Chef")],
    );
    expect(result.suggestions).toHaveLength(0);
    expect(result.unfilled[0]!.reason).toContain("already scheduled that day");
  });

  it("still fills the same person on a different day", () => {
    const result = fillOpenShiftsWithSuggestions(
      [
        shift("monday", 0, "Chef", "a", { start: "08:00", end: "12:00" }),
        shift("tuesday", 1, "Chef", null, { start: "17:00", end: "22:00" }),
      ],
      [staff("a", "Ana", "Chef")],
    );
    expect(result.suggestions[0]!).toMatchObject({ staffId: "a", dayIndex: 1 });
  });

  it("does not double-book across two open shifts filled in the same pass", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null), shift("s2", 0, "Chef", null)],
      [staff("a", "Ana", "Chef")],
    );
    expect(result.suggestions).toHaveLength(1);
    expect(result.unfilled).toHaveLength(1);
  });

  it("generates at most one shift per person per day across a same-day open pair", () => {
    const result = fillOpenShiftsWithSuggestions(
      [
        shift("early", 0, "Chef", null, { start: "08:00", end: "12:00" }),
        shift("late", 0, "Chef", null, { start: "17:00", end: "22:00" }),
      ],
      [staff("a", "Ana", "Chef")],
    );
    expect(result.suggestions).toHaveLength(1);
    expect(result.unfilled).toHaveLength(1);
    expect(result.unfilled[0]!.reason).toContain("already scheduled that day");
  });

  it("leaves manually built split shifts alone", () => {
    const manualSplit = [
      shift("am", 0, "Chef", "a", { start: "09:00", end: "12:00" }),
      shift("pm", 0, "Chef", "a", { start: "17:00", end: "22:00" }),
    ];
    const result = fillOpenShiftsWithSuggestions(manualSplit, [staff("a", "Ana", "Chef")]);
    expect(result.suggestions).toHaveLength(0);
    expect(result.shifts).toEqual(manualSplit);
  });
});

describe("unfilled reporting", () => {
  it("summarises mixed exclusion reasons with counts", () => {
    const result = fillOpenShiftsWithSuggestions(
      [shift("s1", 0, "Chef", null)],
      [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef"), staff("c", "Cal", "Chef")],
      {
        dayIsoDates: [MONDAY],
        leaveRequests: [leave("a", "approved")],
        constraints: constraintsOf({
          unavailable: { b: [MONDAY] },
          recurring: { c: [isoWeekday(MONDAY)] },
        }),
      },
    );

    expect(result.suggestions).toHaveLength(0);
    const reason = result.unfilled[0]!.reason;
    expect(reason).toContain("All 3 Chef staff are unavailable");
    expect(reason).toContain("1 on leave");
    expect(reason).toContain("1 marked unavailable");
    expect(reason).toContain("1 on a recurring day off");
  });

  it("reports the shift identity alongside the reason", () => {
    const result = fillOpenShiftsWithSuggestions([shift("s1", 3, "Bar", null)], []);
    expect(result.unfilled[0]).toMatchObject({ shiftId: "s1", role: "Bar", dayIndex: 3 });
  });
});

describe("applyLiveOpenShiftSuggestions", () => {
  it("writes each suggestion and returns the fill summary", async () => {
    const updateShift = vi.fn().mockResolvedValue(undefined);

    const result = await applyLiveOpenShiftSuggestions({
      shifts: [shift("s1", 0, "Chef", null)],
      staff: [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef")],
      dayIsoDates: [MONDAY],
      leaveRequests: [leave("a", "approved")],
      updateShift,
    });

    expect(result.suggestions[0]!.staffId).toBe("b");
    expect(result.unfilled).toHaveLength(0);
    expect(updateShift).toHaveBeenCalledWith("s1", {
      staffId: "b",
      status: "scheduled",
      tone: "info",
      edited: true,
    });
  });

  it("passes availability constraints through to the deterministic fill", async () => {
    const updateShift = vi.fn().mockResolvedValue(undefined);

    const result = await applyLiveOpenShiftSuggestions({
      shifts: [shift("s1", 0, "Chef", null)],
      staff: [staff("a", "Ana", "Chef")],
      dayIsoDates: [MONDAY],
      leaveRequests: [],
      constraints: constraintsOf({ unavailable: { a: [MONDAY] } }),
      updateShift,
    });

    expect(result.suggestions).toHaveLength(0);
    expect(result.unfilled[0]!.reason).toContain("marked unavailable");
    expect(updateShift).not.toHaveBeenCalled();
  });
});
