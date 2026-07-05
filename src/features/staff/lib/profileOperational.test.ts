import { describe, expect, it } from "vitest";
import type { DraftShift } from "@/features/rota/types";
import type { LeaveRequest, LeaveRequestState } from "@/features/leave/types";
import type { StoredTimesheetRow } from "@/features/time/types";
import {
  memberLeaveRequests,
  memberLeaveSummary,
  memberRecentTimeRows,
  memberUpcomingShifts,
  type WeekShiftsInput,
} from "./profileOperational";

function shift(overrides: Partial<DraftShift> & Pick<DraftShift, "id" | "dayIndex">): DraftShift {
  return {
    staffId: "s1",
    role: "Server",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...overrides,
  };
}

// Week 0 starts Mon 8 Jun 2026, week 1 starts Mon 15 Jun 2026.
const weeks: WeekShiftsInput[] = [
  {
    weekOffset: 0,
    weekStart: "2026-06-08",
    shifts: [
      shift({ id: "a", dayIndex: 0, start: "09:00" }), // Mon 8 Jun
      shift({ id: "b", dayIndex: 3, start: "12:00" }), // Thu 11 Jun
      shift({ id: "open", dayIndex: 4, staffId: null, status: "open" }),
      shift({ id: "other", dayIndex: 2, staffId: "s2" }),
    ],
  },
  {
    weekOffset: 1,
    weekStart: "2026-06-15",
    shifts: [
      shift({ id: "c", dayIndex: 1, start: "08:00" }), // Tue 16 Jun
    ],
  },
];

describe("memberUpcomingShifts", () => {
  it("filters to the member's own assigned shifts", () => {
    const result = memberUpcomingShifts(weeks, "s1", "2026-06-08", 0);
    expect(result.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("excludes open/unassigned shifts from the member's schedule", () => {
    const result = memberUpcomingShifts(weeks, "s1", "2026-06-08", 0);
    expect(result.some((s) => s.id === "open")).toBe(false);
    expect(result.some((s) => s.id === "other")).toBe(false);
  });

  it("drops shifts dated before today and sorts soonest-first", () => {
    const result = memberUpcomingShifts(weeks, "s1", "2026-06-11", 0);
    // Mon 8 Jun is in the past; Thu 11 Jun (today) and Tue 16 Jun remain.
    expect(result.map((s) => s.id)).toEqual(["b", "c"]);
    expect(result[0]!.dateIso).toBe("2026-06-11");
    expect(result[0]!.dayLabel).toBe("Thu 11 Jun");
    expect(result[0]!.weekOffset).toBe(0);
    expect(result[1]!.weekOffset).toBe(1);
  });

  it("caps the number of returned shifts", () => {
    const result = memberUpcomingShifts(weeks, "s1", "2026-06-08", 2);
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("returns an empty list for a member with no shifts", () => {
    expect(memberUpcomingShifts(weeks, "nobody", "2026-06-08", 0)).toEqual([]);
  });
});

function leave(
  id: string,
  staffId: string,
  state: LeaveRequestState,
  startIso: string,
  endIso: string,
): LeaveRequest {
  return {
    id,
    staffId,
    n: "Test Member",
    role: "Server",
    dept: "FOH",
    date: `${startIso} – ${endIso}`,
    startIso,
    endIso,
    days: 1,
    type: "Annual leave",
    impact: "Low",
    tone: "success",
    state,
    notice: 5,
    reason: "",
    img: 1,
    balance: "—",
    submitted: "1 Jun",
    coverNote: "",
  };
}

const leaveRequests: LeaveRequest[] = [
  leave("l1", "s1", "pending", "2026-06-20", "2026-06-22"),
  leave("l2", "s1", "approved", "2026-06-12", "2026-06-13"),
  leave("l3", "s1", "declined", "2026-06-09", "2026-06-09"),
  leave("l4", "s2", "pending", "2026-06-15", "2026-06-16"),
  leave("l5", "s1", "cancelled", "2026-06-25", "2026-06-26"),
];

describe("memberLeaveRequests", () => {
  it("filters leave requests by staff id", () => {
    expect(memberLeaveRequests(leaveRequests, "s1").map((r) => r.id)).toEqual([
      "l1",
      "l2",
      "l3",
      "l5",
    ]);
  });

  it("returns an empty list for a member with no leave", () => {
    expect(memberLeaveRequests(leaveRequests, "nobody")).toEqual([]);
  });
});

describe("memberLeaveSummary", () => {
  it("counts only this member's pending requests", () => {
    const summary = memberLeaveSummary(leaveRequests, "s1", "2026-06-10");
    expect(summary.total).toBe(4);
    expect(summary.pendingCount).toBe(1);
  });

  it("picks the soonest upcoming pending/approved leave, ignoring declined/cancelled", () => {
    const summary = memberLeaveSummary(leaveRequests, "s1", "2026-06-10");
    expect(summary.nextUpcoming?.startIso).toBe("2026-06-12"); // approved l2, sooner than pending l1
    expect(summary.nextUpcoming?.state).toBe("approved");
  });

  it("returns no upcoming leave once everything has ended", () => {
    const summary = memberLeaveSummary(leaveRequests, "s1", "2026-07-01");
    expect(summary.pendingCount).toBe(1);
    expect(summary.nextUpcoming).toBeNull();
  });
});

function timeRow(
  overrides: Partial<StoredTimesheetRow> & Pick<StoredTimesheetRow, "id">,
): StoredTimesheetRow {
  return {
    n: "Test Member",
    role: "Server",
    img: 1,
    sched: "09:00-17:00",
    in: "09:00",
    inN: "",
    out: "17:00",
    outN: "",
    brk: "30m",
    paid: "7 h 30 m",
    exc: "—",
    department: "FOH",
    status: "pending",
    flagged: false,
    auditTrail: [],
    workDate: "2026-06-10",
    staffMemberId: "s1",
    ...overrides,
  } satisfies StoredTimesheetRow;
}

const demoTimeRow = timeRow({ id: "demo-without-staff-id", workDate: "2026-06-13" });
delete demoTimeRow.staffMemberId;

const timeRows: StoredTimesheetRow[] = [
  timeRow({ id: "older", workDate: "2026-06-09", in: "09:00" }),
  timeRow({ id: "newest-early", workDate: "2026-06-11", in: "08:00" }),
  timeRow({ id: "newest-late", workDate: "2026-06-11", in: "10:00" }),
  timeRow({ id: "other-member", staffMemberId: "s2", workDate: "2026-06-12" }),
  demoTimeRow,
];

describe("memberRecentTimeRows", () => {
  it("filters time rows by staff member", () => {
    const result = memberRecentTimeRows(timeRows, "s1", 0);
    expect(result.map((row) => row.id)).toEqual(["newest-late", "newest-early", "older"]);
  });

  it("sorts recent time rows newest first, then later clock-in first", () => {
    const result = memberRecentTimeRows(timeRows, "s1", 0);
    expect(result.map((row) => row.id)).toEqual(["newest-late", "newest-early", "older"]);
  });

  it("caps displayed time rows", () => {
    const result = memberRecentTimeRows(timeRows, "s1", 2);
    expect(result.map((row) => row.id)).toEqual(["newest-late", "newest-early"]);
  });

  it("returns an honest empty result for a member with no time rows", () => {
    expect(memberRecentTimeRows(timeRows, "nobody", 10)).toEqual([]);
  });

  it("keeps other members and rows without live ids out of the profile result", () => {
    const result = memberRecentTimeRows(timeRows, "s1", 0);
    expect(result.some((row) => row.id === "other-member")).toBe(false);
    expect(result.some((row) => row.id === "demo-without-staff-id")).toBe(false);
  });
});
