import { describe, expect, it } from "vitest";
import { buildRotaRecoveryOptions, NO_SAFE_RECOVERY_OPTIONS } from "./rotaRecoveryOptions";
import type { DraftShift, RotaDayIndex, StaffMember } from "../types";
import type { LeaveRequest } from "@/features/leave/types";

function staff(id: string, name: string, role: string): StaffMember {
  return { id, name, role, hrs: "0", img: 1, tone: "info" };
}

function shift(
  id: string,
  dayIndex: RotaDayIndex,
  role: string,
  staffId: string | null,
  start = "09:00",
  end = "17:00",
): DraftShift {
  return {
    id,
    dayIndex,
    staffId,
    role,
    start,
    end,
    breakMinutes: 30,
    tone: staffId === null ? "open" : "info",
    status: staffId === null ? "open" : "scheduled",
  };
}

function approvedLeave(staffId: string, date: string): LeaveRequest {
  return {
    id: `leave-${staffId}`,
    staffId,
    n: staffId,
    role: "Chef",
    dept: "Kitchen",
    date,
    startIso: date,
    endIso: date,
    days: 1,
    type: "Annual leave",
    impact: "Low",
    tone: "warning",
    state: "approved",
    notice: 7,
    reason: "",
    img: 1,
    balance: "",
    submitted: "",
    coverNote: "",
  };
}

describe("buildRotaRecoveryOptions", () => {
  it("returns safe open-shift options and sorts them by current weekly load", () => {
    const shifts = [
      shift("busy-1", 0, "Chef", "a"),
      shift("busy-2", 1, "Chef", "a"),
      shift("open", 2, "Chef", null),
    ];
    const result = buildRotaRecoveryOptions({
      shift: shifts[2]!,
      staff: [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef"), staff("c", "Cara", "Chef")],
      shifts,
      leaveRequests: [],
      dayIsoDates: ["2026-06-08", "2026-06-09", "2026-06-10"],
    });

    expect(result).toHaveLength(3);
    expect(result.map((option) => option.staffId)).toEqual(["b", "c", "a"]);
    expect(result[0]?.note).toContain("No shifts yet this week");
    expect(result[1]?.note).toContain("No shifts yet this week");
    // Load is reported in hours, matching the balancing signal that produced the
    // order. Counting shifts made two 4-hour shifts outrank one 12-hour shift.
    expect(result[2]?.note).toContain("16h scheduled this week");
  });

  it("returns approved-leave conflict options and excludes blocked staff", () => {
    const target = shift("conflict", 0, "Chef", "a");
    const result = buildRotaRecoveryOptions({
      shift: target,
      staff: [staff("a", "Ana", "Chef"), staff("b", "Ben", "Chef"), staff("c", "Cara", "Chef")],
      shifts: [
        target,
        shift("b-conflict", 0, "Chef", "b", "09:30", "17:00"),
        shift("c-work", 1, "Chef", "c"),
      ],
      leaveRequests: [approvedLeave("a", "2026-06-08")],
      dayIsoDates: ["2026-06-08"],
      excludeStaffId: "a",
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ staffId: "c", staffName: "Cara" });
  });

  it("returns no suggestions when every candidate is blocked", () => {
    const target = shift("open", 0, "Chef", null);
    const result = buildRotaRecoveryOptions({
      shift: target,
      staff: [staff("a", "Ana", "Chef"), staff("b", "Ben", "Waiter")],
      shifts: [
        target,
        shift("a-conflict", 0, "Chef", "a", "09:00", "17:00"),
        shift("b-work", 1, "Waiter", "b"),
      ],
      leaveRequests: [approvedLeave("a", "2026-06-08")],
      dayIsoDates: ["2026-06-08"],
    });

    expect(result).toEqual([]);
  });

  it("excludes approved one-off and recurring constraints across overnight dates", () => {
    const target = shift("overnight", 0, "Chef", null, "22:00", "06:00");
    const result = buildRotaRecoveryOptions({
      shift: target,
      staff: [
        staff("one-off", "One Off", "Chef"),
        staff("recurring", "Recurring", "Chef"),
        staff("free", "Free", "Chef"),
      ],
      shifts: [target],
      leaveRequests: [],
      dayIsoDates: ["2026-06-08", "2026-06-09"],
      availabilityConstraints: {
        recurringByStaff: new Map([["recurring", new Set([1])]]),
        unavailableDatesByStaff: new Map([["one-off", new Set(["2026-06-08"])]]),
      },
    });

    expect(result.map((option) => option.staffId)).toEqual(["free"]);
  });

  it("excludes staff whose approved leave begins on an overnight shift's end date", () => {
    const target = shift("overnight", 0, "Chef", null, "22:00", "06:00");
    const result = buildRotaRecoveryOptions({
      shift: target,
      staff: [staff("leave", "On Leave", "Chef"), staff("free", "Free", "Chef")],
      shifts: [target],
      leaveRequests: [approvedLeave("leave", "2026-06-09")],
      dayIsoDates: ["2026-06-08", "2026-06-09"],
    });

    expect(result.map((option) => option.staffId)).toEqual(["free"]);
  });

  it("does not mutate the rota inputs while building suggestions", () => {
    const shifts = [shift("open", 0, "Chef", null)];
    const snapshot = structuredClone(shifts);

    const result = buildRotaRecoveryOptions({
      shift: shifts[0]!,
      staff: [staff("a", "Ana", "Chef")],
      shifts,
      leaveRequests: [],
      dayIsoDates: ["2026-06-08"],
    });

    expect(result).toHaveLength(1);
    expect(shifts).toEqual(snapshot);
  });

  it("returns the honest empty-state copy when no shift date is available", () => {
    const result = buildRotaRecoveryOptions({
      shift: shift("open", 0, "Chef", null),
      staff: [staff("a", "Ana", "Chef")],
      shifts: [shift("open", 0, "Chef", null)],
      leaveRequests: [],
      dayIsoDates: [],
    });

    expect(result).toEqual([]);
    expect(NO_SAFE_RECOVERY_OPTIONS).toContain("No safe suggestions found");
  });
});
