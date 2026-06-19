import { describe, expect, it } from "vitest";
import { buildStaffRows } from "@/features/rota/lib/rotaGridBuilders";
import type { DraftShift, StaffMember } from "@/features/rota/types";
import type { LeaveRequest } from "../types";
import {
  buildApprovedLeaveConflictSummaries,
  withApprovedLeaveConflictStatus,
} from "./leaveRotaConflicts";

const dayIsoDates = [
  "2026-07-06",
  "2026-07-07",
  "2026-07-08",
  "2026-07-09",
  "2026-07-10",
  "2026-07-11",
  "2026-07-12",
];

const staff: StaffMember[] = [
  { id: "staff-1", name: "Ana", role: "Chef", hrs: "40", img: 1, tone: "info" },
];

const shift: DraftShift = {
  id: "shift-1",
  dayIndex: 2,
  staffId: "staff-1",
  role: "Chef",
  start: "09:00",
  end: "17:00",
  breakMinutes: 30,
  tone: "info",
  status: "scheduled",
};

const approvedLeave: LeaveRequest = {
  id: "leave-1",
  staffId: "staff-1",
  n: "Ana",
  role: "Chef",
  dept: "Kitchen",
  date: "8 Jul – 8 Jul",
  startIso: "2026-07-08",
  endIso: "2026-07-08",
  days: 1,
  type: "Annual leave",
  impact: "Low",
  tone: "success",
  state: "approved",
  notice: 10,
  reason: "Holiday",
  img: 1,
  balance: "—",
  submitted: "1 Jul",
  coverNote: "",
};

describe("approved leave dates on the rota", () => {
  it("uses the displayed ISO dates for both grid markers and conflict status", () => {
    const rows = buildStaffRows(staff, [shift], [approvedLeave], dayIsoDates);
    const shifts = withApprovedLeaveConflictStatus([shift], [approvedLeave], dayIsoDates);

    expect(rows[0]?.cells[2]?.hasLeave).toBe(true);
    expect(shifts[0]).toMatchObject({ status: "conflict", tone: "danger" });
  });

  it("uses the same displayed ISO dates for conflict summaries", () => {
    const summaries = buildApprovedLeaveConflictSummaries(
      [shift],
      [approvedLeave],
      dayIsoDates,
      staff,
      ["Mon 6 Jul", "Tue 7 Jul", "Wed 8 Jul"],
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: "shift-1",
      staff: "Ana",
      day: "Wed 8 Jul",
    });
  });
});
