import { describe, expect, it } from "vitest";
import {
  compareCandidates,
  describeExclusionCounts,
  emptyAvailabilityFacts,
  hardExclusionFor,
  scheduledMinutesFor,
  type AvailabilityFacts,
  type CommittedShift,
  type StaffSchedulingFact,
} from "./eligibility";

const MON = "2026-07-27";
const TUE = "2026-07-28";
const DEPT_BAR = "11111111-1111-4111-8111-111111111111";
const DEPT_KITCHEN = "33333333-3333-4333-8333-333333333333";

function staff(overrides: Partial<StaffSchedulingFact> = {}): StaffSchedulingFact {
  return {
    id: "staff-a",
    name: "Amelia Stone",
    roleKey: "bar",
    departmentId: DEPT_BAR,
    active: true,
    contractedMinutesPerWeek: null,
    ...overrides,
  };
}

const dayShift = { workDate: MON, start: "09:00", end: "17:00" };
const overnightShift = { workDate: MON, start: "22:00", end: "02:00" };

function committed(
  staffId: string,
  workDate: string,
  start: string,
  end: string,
  shiftId = `${staffId}-${workDate}-${start}`,
): CommittedShift {
  return { shiftId, staffId, times: { workDate, start, end } };
}

function facts(overrides: Partial<AvailabilityFacts> = {}): AvailabilityFacts {
  return { ...emptyAvailabilityFacts(), ...overrides };
}

function exclusion(args: Partial<Parameters<typeof hardExclusionFor>[0]> = {}) {
  return hardExclusionFor({
    staff: staff(),
    target: dayShift,
    requiredRoleKey: "bar",
    committed: [],
    availability: facts(),
    ...args,
  });
}

describe("hard exclusions", () => {
  it("clears an eligible candidate", () => {
    expect(exclusion()).toBeNull();
  });

  it("excludes an inactive person before anything else", () => {
    expect(exclusion({ staff: staff({ active: false }) })).toBe("inactive");
  });

  it("requires exact normalized role equality", () => {
    expect(exclusion({ staff: staff({ roleKey: "barista" }) })).toBe("role-mismatch");
    expect(exclusion({ requiredRoleKey: "head chef" })).toBe("role-mismatch");
  });

  it("excludes approved leave", () => {
    const availability = facts({
      approvedLeaveDatesByStaff: new Map([["staff-a", new Set([MON])]]),
    });
    expect(exclusion({ availability })).toBe("approved-leave");
  });

  it("excludes pending leave too, and names it distinctly", () => {
    const availability = facts({
      pendingLeaveDatesByStaff: new Map([["staff-a", new Set([MON])]]),
    });
    expect(exclusion({ availability })).toBe("pending-leave");
  });

  it("excludes an approved one-off unavailability", () => {
    const availability = facts({ unavailableDatesByStaff: new Map([["staff-a", new Set([MON])]]) });
    expect(exclusion({ availability })).toBe("one-off-unavailable");
  });

  it("excludes an approved recurring day off on the shift's weekday", () => {
    // 2026-07-27 is a Monday, which is weekday 0.
    const availability = facts({ recurringWeekdaysByStaff: new Map([["staff-a", new Set([0])]]) });
    expect(exclusion({ availability })).toBe("recurring-day-off");
  });

  it("ignores a recurring day off on a different weekday", () => {
    const availability = facts({ recurringWeekdaysByStaff: new Map([["staff-a", new Set([3])]]) });
    expect(exclusion({ availability })).toBeNull();
  });

  it("excludes an overlapping committed shift", () => {
    expect(exclusion({ committed: [committed("staff-a", MON, "16:00", "23:00")] })).toBe(
      "interval-conflict",
    );
  });

  it("allows a non-overlapping split shift on the same day", () => {
    expect(exclusion({ committed: [committed("staff-a", MON, "18:00", "23:00")] })).toBeNull();
  });

  it("ignores another person's overlapping shift", () => {
    expect(exclusion({ committed: [committed("staff-b", MON, "09:00", "17:00")] })).toBeNull();
  });

  it("never conflicts a shift with itself", () => {
    const self = committed("staff-a", MON, "09:00", "17:00", "target");
    expect(exclusion({ committed: [self], excludeShiftId: "target" })).toBeNull();
    expect(exclusion({ committed: [self] })).toBe("interval-conflict");
  });
});

describe("overnight hard exclusions use real calendar dates", () => {
  it("catches a next-day shift that overlaps the overnight tail", () => {
    expect(
      exclusion({
        target: overnightShift,
        committed: [committed("staff-a", TUE, "00:00", "08:00")],
      }),
    ).toBe("interval-conflict");
  });

  it("checks leave on the date the overnight shift ends, not only the date it starts", () => {
    const availability = facts({
      approvedLeaveDatesByStaff: new Map([["staff-a", new Set([TUE])]]),
    });
    expect(exclusion({ target: overnightShift, availability })).toBe("approved-leave");
  });

  it("checks a recurring day off on the end date too", () => {
    // Tuesday is weekday 1.
    const availability = facts({ recurringWeekdaysByStaff: new Map([["staff-a", new Set([1])]]) });
    expect(exclusion({ target: overnightShift, availability })).toBe("recurring-day-off");
  });

  it("does not treat midnight-ending shifts as touching the next day", () => {
    const availability = facts({
      approvedLeaveDatesByStaff: new Map([["staff-a", new Set([TUE])]]),
    });
    expect(
      exclusion({ target: { workDate: MON, start: "16:00", end: "00:00" }, availability }),
    ).toBeNull();
  });
});

describe("unreadable times are one policy everywhere", () => {
  it("excludes when the target times cannot be read", () => {
    expect(exclusion({ target: { workDate: MON, start: "nope", end: "17:00" } })).toBe(
      "unreadable-times",
    );
  });

  it("excludes when a committed shift's times cannot be read", () => {
    expect(exclusion({ committed: [committed("staff-a", MON, "??", "17:00")] })).toBe(
      "unreadable-times",
    );
  });
});

describe("scheduledMinutesFor", () => {
  it("sums only that person's shifts, across midnight", () => {
    const shifts = [
      committed("staff-a", MON, "09:00", "17:00"),
      committed("staff-a", TUE, "22:00", "02:00"),
      committed("staff-b", MON, "09:00", "17:00"),
    ];
    expect(scheduledMinutesFor("staff-a", shifts)).toBe(480 + 240);
    expect(scheduledMinutesFor("staff-b", shifts)).toBe(480);
    expect(scheduledMinutesFor("staff-c", shifts)).toBe(0);
  });

  it("skips shifts whose times cannot be read rather than counting them as zero-length", () => {
    expect(scheduledMinutesFor("staff-a", [committed("staff-a", MON, "??", "17:00")])).toBe(0);
  });
});

describe("balancing signals never exclude, only reorder", () => {
  it("prefers the person with fewer scheduled minutes", () => {
    const light = { staff: staff({ id: "staff-b" }), scheduledMinutes: 120 };
    const heavy = { staff: staff({ id: "staff-a" }), scheduledMinutes: 600 };
    expect(compareCandidates(light, heavy, DEPT_BAR)).toBeLessThan(0);
    expect(compareCandidates(heavy, light, DEPT_BAR)).toBeGreaterThan(0);
  });

  it("prefers more contracted headroom when both have a contract", () => {
    const roomy = {
      staff: staff({ id: "staff-a", contractedMinutesPerWeek: 2400 }),
      scheduledMinutes: 480,
    };
    const tight = {
      staff: staff({ id: "staff-b", contractedMinutesPerWeek: 600 }),
      scheduledMinutes: 480,
    };
    expect(compareCandidates(roomy, tight, DEPT_BAR)).toBeLessThan(0);
  });

  it("treats a null contract as neutral, not as a penalty", () => {
    // With equal load and equal department, a null contract must fall through to
    // the staff-id tie-break rather than losing to anyone with a figure.
    const withContract = {
      staff: staff({ id: "staff-b", contractedMinutesPerWeek: 2400 }),
      scheduledMinutes: 480,
    };
    const withoutContract = {
      staff: staff({ id: "staff-a", contractedMinutesPerWeek: null }),
      scheduledMinutes: 480,
    };
    // staff-a sorts first purely on id, proving the contract term was skipped.
    expect(compareCandidates(withoutContract, withContract, DEPT_BAR)).toBeLessThan(0);
  });

  it("uses department affinity only as a late hint", () => {
    const matching = {
      staff: staff({ id: "staff-b", departmentId: DEPT_BAR }),
      scheduledMinutes: 480,
    };
    const other = {
      staff: staff({ id: "staff-a", departmentId: DEPT_KITCHEN }),
      scheduledMinutes: 480,
    };
    expect(compareCandidates(matching, other, DEPT_BAR)).toBeLessThan(0);
    // But load still outranks it.
    expect(
      compareCandidates({ ...matching, scheduledMinutes: 900 }, other, DEPT_BAR),
    ).toBeGreaterThan(0);
  });

  it("is a total order, so the result never depends on input sequence", () => {
    const candidates = [
      { staff: staff({ id: "staff-c" }), scheduledMinutes: 480 },
      { staff: staff({ id: "staff-a" }), scheduledMinutes: 480 },
      { staff: staff({ id: "staff-b" }), scheduledMinutes: 120 },
    ];
    const forward = [...candidates].sort((a, b) => compareCandidates(a, b, DEPT_BAR));
    const reverse = [...candidates].reverse().sort((a, b) => compareCandidates(a, b, DEPT_BAR));
    expect(forward.map((c) => c.staff.id)).toEqual(["staff-b", "staff-a", "staff-c"]);
    expect(reverse.map((c) => c.staff.id)).toEqual(forward.map((c) => c.staff.id));
  });
});

describe("describeExclusionCounts", () => {
  it("says when nobody holds the role", () => {
    expect(describeExclusionCounts("bar", 0, new Map())).toBe("No active staff hold the bar role.");
  });

  it("summarises mixed reasons deterministically", () => {
    const counts = new Map([
      ["interval-conflict" as const, 1],
      ["approved-leave" as const, 2],
    ]);
    expect(describeExclusionCounts("bar", 3, counts)).toBe(
      "All 3 bar staff are unavailable — 2 is on approved leave, 1 is already working an overlapping shift.",
    );
  });
});
