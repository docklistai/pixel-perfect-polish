import { describe, it, expect } from "vitest";
import type { LeaveRequest } from "@/features/leave/types";
import type { StoredTimesheetRow } from "@/features/time/types";
import {
  buildDashboardOperational,
  dashboardAttentionSummary,
  dashboardAttentionTitle,
  weekScopeHeading,
  weekScopePossessive,
} from "./dashboardOperational";

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
    id: "time-entry-default",
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
      weekScope: "current",
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
      weekScope: "current",
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
      weekScope: "current",
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
      weekScope: "current",
      pendingLeave: [],
      pendingTime: [
        timesheet({ id: "entry-a", status: "unapproved" }),
        timesheet({ id: "entry-b", flagged: true }),
      ],
      timesheetPeriodLabel: "Awaiting review",
    });
    expect(out.timesheetItems[0]).toMatchObject({ late: "Unapproved", lateTone: "danger" });
    expect(out.timesheetItems[1]).toMatchObject({ late: "Flagged", lateTone: "warning" });
    expect(out.timesheetItems[0]?.d).toBe("Awaiting review");
    expect(out.timesheetItems.map((item) => item.id)).toEqual(["entry-a", "entry-b"]);
  });

  it("describes current-week open shifts as 'This week', never 'next week' (D1)", () => {
    const out = buildDashboardOperational({
      openShifts: 4,
      weekScope: "current",
      pendingLeave: [],
      pendingTime: [],
      timesheetPeriodLabel: "Awaiting review",
    });
    const item = out.attentionItems[0]!;
    const detail = item.detail ?? "";
    expect(item.t).toBe("This week has 4 open shifts");
    expect(item.t.toLowerCase()).not.toContain("next week");
    expect(detail.toLowerCase()).not.toContain("next week");
    expect(detail).toContain("This week's draft");
  });

  it("keeps 'Next week' wording for the demo store's next-week scope", () => {
    const out = buildDashboardOperational({
      openShifts: 1,
      weekScope: "next",
      pendingLeave: [],
      pendingTime: [],
      timesheetPeriodLabel: "Awaiting review",
    });
    expect(out.attentionItems[0]?.t).toBe("Next week has 1 open shift");
  });

  it("never promises a fabricated publish deadline (D2)", () => {
    const out = buildDashboardOperational({
      openShifts: 3,
      weekScope: "current",
      pendingLeave: [],
      pendingTime: [],
      timesheetPeriodLabel: "Awaiting review",
    });
    const item = out.attentionItems[0]!;
    expect(item.s).toBe("Resolve open shifts before publishing");
    expect(`${item.s} ${item.detail ?? ""}`).not.toMatch(/16:00|deadline|on time/i);
  });
});

describe("week scope copy helpers", () => {
  it("maps scope to heading and possessive nouns", () => {
    expect(weekScopeHeading("current")).toBe("This week");
    expect(weekScopeHeading("next")).toBe("Next week");
    expect(weekScopePossessive("current")).toBe("This week's");
    expect(weekScopePossessive("next")).toBe("Next week's");
  });
});

describe("dashboardAttentionTitle (D3 pluralization)", () => {
  it("uses the singular 'thing' for exactly one active category", () => {
    expect(dashboardAttentionTitle(1)).toBe("1 thing worth your attention today");
  });

  it("uses the plural 'things' for many", () => {
    expect(dashboardAttentionTitle(2)).toBe("2 things worth your attention today");
  });

  it("reads as a genuine all-clear when nothing is active", () => {
    expect(dashboardAttentionTitle(0)).toBe("Nothing needs your attention right now");
  });
});

describe("dashboardAttentionSummary", () => {
  it("uses 'This week's' for the current-week scope and no 'next week'", () => {
    const body = dashboardAttentionSummary({
      weekScope: "current",
      openShifts: 4,
      pendingTime: 0,
      pendingLeave: 0,
    });
    expect(body).toContain("This week's draft has 4 open shifts");
    expect(body.toLowerCase()).not.toContain("next week");
  });

  it("never renders robotic zero counts", () => {
    const body = dashboardAttentionSummary({
      weekScope: "current",
      openShifts: 0,
      pendingTime: 2,
      pendingLeave: 0,
    });
    expect(body).not.toMatch(/\b0\b/);
    expect(body).toContain("no open shifts");
    expect(body).toContain("2 timesheets need manager review");
  });

  it("summarises an all-clear week in one natural sentence", () => {
    const body = dashboardAttentionSummary({
      weekScope: "current",
      openShifts: 0,
      pendingTime: 0,
      pendingLeave: 0,
    });
    expect(body).toBe(
      "This week's draft has no open shifts, and no timesheets or leave requests are waiting on you.",
    );
  });
});
