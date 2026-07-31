import { describe, expect, it } from "vitest";
import type { DraftShift, RotaDayIndex, StaffMember } from "../../types";
import type { LeaveRequest } from "@/features/leave/types";
import { localConflictShiftIds } from "../localConflicts";
import { toAvailabilityFacts, toStaffSchedulingFact } from "../rotaFillExclusions";
import { planRepeatShift } from "../repeatShift";
import { buildRotaRecoveryOptions } from "../rotaRecoveryOptions";
import { committedShiftsFrom, draftShiftTimes } from "./draftShiftAdapter";
import { hardExclusionFor, type HardExclusion } from "./eligibility";
import { normaliseRoleKey } from "./shiftSignature";

/**
 * Cross-engine acceptance tests.
 *
 * The unit tests for `calendarInterval` and `eligibility` prove those modules are
 * right. These prove the surfaces that used to answer the same question several
 * different ways now actually delegate to them — the migration, not the module.
 */

const WEEK = ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"];

/**
 * Why one candidate cannot take this shift, asked through the same adapters
 * production uses.
 *
 * The automatic open-shift fill that once wrapped this composition is gone, so
 * the wrapper went with it rather than being kept alive for a test. Every part
 * below still has real callers — `buildRotaRecoveryOptions` composes exactly
 * this, and asserting the two together is the point of these tests: the reason
 * codes stay pinned, and they stay pinned through the DraftShift/StaffMember
 * translation rather than against hand-built engine facts.
 */
function hardExclusion(
  member: StaffMember,
  shift: DraftShift,
  shifts: DraftShift[],
  options: { dayIsoDates: string[]; leaveRequests?: LeaveRequest[] },
): HardExclusion | null {
  return hardExclusionFor({
    staff: toStaffSchedulingFact(member),
    target: draftShiftTimes(shift, options.dayIsoDates),
    requiredRoleKey: normaliseRoleKey(shift.role),
    committed: committedShiftsFrom(shifts, options.dayIsoDates),
    availability: toAvailabilityFacts(options),
    excludeShiftId: shift.id,
  });
}

function shift(
  id: string,
  dayIndex: number,
  staffId: string | null,
  start: string,
  end: string,
  role = "Chef",
): DraftShift {
  return {
    id,
    dayIndex: dayIndex as RotaDayIndex,
    staffId,
    role,
    start,
    end,
    breakMinutes: 30,
    tone: staffId ? "info" : "open",
    status: staffId ? "scheduled" : "open",
  };
}

function staff(id: string, name: string, role = "Chef"): StaffMember {
  return { id, name, role, hrs: "40h", contractedMinutesPerWeek: 2400, img: 1, tone: "info" };
}

function leave(
  staffId: string,
  state: LeaveRequest["state"],
  startIso: string,
  endIso: string,
): LeaveRequest {
  return {
    id: `leave-${staffId}-${state}`,
    staffId,
    n: "Someone",
    role: "Chef",
    dept: "Kitchen",
    date: "27 Jul",
    startIso,
    endIso,
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

describe("overnight conflicts now reach every engine", () => {
  const monLateShift = shift("mon-late", 0, "a", "22:00", "02:00");
  const tueEarlyShift = shift("tue-early", 1, "a", "00:00", "08:00");

  it("localConflicts flags a shift that runs past midnight into the next day", () => {
    const ids = localConflictShiftIds([monLateShift, tueEarlyShift], WEEK);
    expect(ids.has("mon-late")).toBe(true);
    expect(ids.has("tue-early")).toBe(true);
  });

  it("localConflicts leaves a genuinely separate next-day shift alone", () => {
    const ids = localConflictShiftIds(
      [monLateShift, shift("tue-day", 1, "a", "09:00", "17:00")],
      WEEK,
    );
    expect(ids.size).toBe(0);
  });

  it("eligibility refuses a candidate whose previous night runs into this shift", () => {
    const openTueEarly = shift("open-tue", 1, null, "00:00", "08:00");
    expect(
      hardExclusion(staff("a", "Ana"), openTueEarly, [monLateShift, openTueEarly], {
        dayIsoDates: WEEK,
      }),
    ).toBe("interval-conflict");
  });

  it("repeat skips a day where the copy would run past midnight into an existing shift", () => {
    // Repeating Monday 22:00-02:00 onto Tuesday produces Tue 22:00 - Wed 02:00,
    // which collides with the Wednesday 00:00-08:00 shift this person already has.
    // A same-day-only comparison sees nothing here, because the copy is filed
    // under Tuesday and the clash is on Wednesday.
    const wedEarly = shift("wed-early", 2, "a", "00:00", "08:00");
    const plan = planRepeatShift(monLateShift, [1], [monLateShift, wedEarly], WEEK);
    expect(plan.inputs).toHaveLength(0);
    expect(plan.skippedCount).toBe(1);
  });

  it("repeat allows a day whose copy does not actually overlap", () => {
    // Tue 22:00 - Wed 02:00 does not touch Tue 00:00-08:00, so this must not be
    // skipped just because both involve Tuesday.
    const plan = planRepeatShift(monLateShift, [1], [monLateShift, tueEarlyShift], WEEK);
    expect(plan.inputs).toHaveLength(1);
    expect(plan.skippedCount).toBe(0);
  });

  it("recovery will not suggest someone whose overnight shift covers the target", () => {
    const target = shift("needs-cover", 1, null, "00:00", "08:00");
    const options = buildRotaRecoveryOptions({
      shift: target,
      staff: [staff("a", "Ana")],
      shifts: [monLateShift, target],
      leaveRequests: [],
      dayIsoDates: WEEK,
    });
    expect(options).toHaveLength(0);
  });
});

describe("eligibility and recovery agree on the same candidate", () => {
  const target = shift("open", 0, null, "09:00", "17:00");
  const roster = [staff("a", "Ana")];

  it("both refuse pending leave — recovery used to recommend it", () => {
    const pending = [leave("a", "pending", WEEK[0]!, WEEK[0]!)];
    expect(
      hardExclusion(roster[0]!, target, [target], { dayIsoDates: WEEK, leaveRequests: pending }),
    ).toBe("pending-leave");
    expect(
      buildRotaRecoveryOptions({
        shift: target,
        staff: roster,
        shifts: [target],
        leaveRequests: pending,
        dayIsoDates: WEEK,
      }),
    ).toHaveLength(0);
  });

  it("both refuse approved leave", () => {
    const approved = [leave("a", "approved", WEEK[0]!, WEEK[0]!)];
    expect(
      hardExclusion(roster[0]!, target, [target], { dayIsoDates: WEEK, leaveRequests: approved }),
    ).toBe("approved-leave");
    expect(
      buildRotaRecoveryOptions({
        shift: target,
        staff: roster,
        shifts: [target],
        leaveRequests: approved,
        dayIsoDates: WEEK,
      }),
    ).toHaveLength(0);
  });

  it("both accept an otherwise-clear candidate", () => {
    expect(hardExclusion(roster[0]!, target, [target], { dayIsoDates: WEEK })).toBeNull();
    expect(
      buildRotaRecoveryOptions({
        shift: target,
        staff: roster,
        shifts: [target],
        leaveRequests: [],
        dayIsoDates: WEEK,
      }),
    ).toHaveLength(1);
  });

  it("both require exact role identity rather than a substring match", () => {
    const barista = [staff("a", "Ana", "Barista")];
    const barShift = shift("open-bar", 0, null, "09:00", "17:00", "Bar");
    expect(hardExclusion(barista[0]!, barShift, [barShift], { dayIsoDates: WEEK })).toBe(
      "role-mismatch",
    );
    expect(
      buildRotaRecoveryOptions({
        shift: barShift,
        staff: barista,
        shifts: [barShift],
        leaveRequests: [],
        dayIsoDates: WEEK,
      }),
    ).toHaveLength(0);
  });

  it("both treat a role differing only in case and spacing as the same role", () => {
    const chef = [staff("a", "Ana", " chef ")];
    expect(hardExclusion(chef[0]!, target, [target], { dayIsoDates: WEEK })).toBeNull();
    expect(
      buildRotaRecoveryOptions({
        shift: target,
        staff: chef,
        shifts: [target],
        leaveRequests: [],
        dayIsoDates: WEEK,
      }),
    ).toHaveLength(1);
  });
});
