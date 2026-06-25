import { describe, it, expect } from "vitest";
import type { LeaveRequest } from "@/features/leave/types";
import type { StoredTimesheetRow } from "@/features/time/types";
import { buildDashboardOperational } from "./dashboardOperational";

function leave(partial: Partial<LeaveRequest>): LeaveRequest {
  return {
    n: "Alex Stone",
    date: "8 – 9 Jun",
    days: 2,
    img: 12,
    impact: "Low",
    tone: "info",
    state: "pending",
    ...partial,
  } as LeaveRequest;
}

function timesheet(partial: Partial<StoredTimesheetRow>): StoredTimesheetRow {
  return {
    n: "Sam Reed",
    img: 7,
    status: "pending",
    flagged: false,
    ...partial,
  } as StoredTimesheetRow;
}

describe("buildDashboardOperational", () => {
  it("surfaces only categories with a real active issue", () => {
    const out = buildDashboardOperational({
      openShifts: 0,
      pendingLeave: [],
      pendingTime: [],
      timesheetPeriodLabel: "Awaiting review",
    });
    expect(out.attentionItems).toHaveLength(0);
    expect(out.leaveItems).toHaveLength(0);
    expect(out.timesheetItems).toHaveLength(0);
  });

  it("emits one attention item per active category", () => {
    const out = buildDashboardOperational({
      openShifts: 2,
      pendingLeave: [leave({})],
      pendingTime: [timesheet({})],
      timesheetPeriodLabel: "Awaiting review",
    });
    const routes = out.attentionItems.map((item) => item.route);
    expect(routes).toEqual(["/rota", "/time", "/leave"]);
  });

  it("flags a high-impact leave request distinctly", () => {
    const out = buildDashboardOperational({
      openShifts: 0,
      pendingLeave: [leave({ impact: "High", n: "Jordan Vale" })],
      pendingTime: [],
      timesheetPeriodLabel: "Awaiting review",
    });
    expect(out.attentionItems[0]?.t).toContain("high coverage impact");
    expect(out.attentionItems[0]?.s).toContain("Jordan Vale");
  });

  it("maps timesheet status to its review label and tone", () => {
    const out = buildDashboardOperational({
      openShifts: 0,
      pendingLeave: [],
      pendingTime: [timesheet({ status: "unapproved" }), timesheet({ flagged: true })],
      timesheetPeriodLabel: "Awaiting review",
    });
    expect(out.timesheetItems[0]).toMatchObject({ late: "Unapproved", lateTone: "danger" });
    expect(out.timesheetItems[1]).toMatchObject({ late: "Flagged", lateTone: "warning" });
    expect(out.timesheetItems[0]?.d).toBe("Awaiting review");
  });
});
