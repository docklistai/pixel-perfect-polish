import { describe, expect, it } from "vitest";
import {
  buildReportsKpis,
  buildReviewPoints,
  buildTrendPoints,
  QUICK_REPORTS,
  weekPublicationLabel,
} from "./reportsPresentation";
import type { ReportsPageData } from "../types";

function page(overrides: Partial<ReportsPageData> = {}): ReportsPageData {
  return {
    meta: {
      source: "latest_published_snapshots",
      workspaceTimezone: "Europe/London",
      rotaStartWeekday: 0,
      periodStart: "2026-07-20",
      periodEnd: "2026-08-16",
      currentWeekStart: "2026-08-10",
      hourSemantics: "net_after_breaks",
      shiftAttribution: "local_shift_start_date",
      heatmapSemantics: "average_assigned_headcount_by_local_3_hour_bucket",
      contractBasis: "exact_current_rota_week_only",
    },
    filters: { locationId: null, departmentId: null },
    options: { locations: [], departments: [] },
    totals: {
      scheduledMinutes: 1200,
      assignedShifts: 3,
      openShifts: 2,
      openMinutes: 600,
      approvedWorkedMinutes: 900,
      approvedEntries: 2,
      awaitingReviewEntries: 4,
      pendingLeave: 1,
      approvedLeaveAffectedShifts: 2,
      approvedLeaveAffectedMinutes: 480,
    },
    weeks: [
      {
        weekStart: "2026-07-20",
        weekEnd: "2026-07-26",
        publicationStatus: "published",
        publishedLocations: 1,
        expectedLocations: 1,
        scheduledMinutes: 1200,
        assignedShifts: 3,
        openShifts: 2,
        openMinutes: 600,
        approvedWorkedMinutes: 900,
        awaitingReviewEntries: 4,
      },
      {
        weekStart: "2026-07-27",
        weekEnd: "2026-08-02",
        publicationStatus: "not_published",
        publishedLocations: 0,
        expectedLocations: 1,
        scheduledMinutes: 0,
        assignedShifts: 0,
        openShifts: 0,
        openMinutes: 0,
        approvedWorkedMinutes: 0,
        awaitingReviewEntries: 0,
      },
    ],
    departmentHours: [],
    heatmap: [],
    leaveImpacts: [
      {
        leaveRequestId: "leave-1",
        staffName: "Sophie Carter",
        leaveType: "annual_leave",
        startDate: "2026-07-20",
        endDate: "2026-07-20",
        affectedShifts: 1,
        affectedMinutes: 240,
      },
      {
        leaveRequestId: "leave-2",
        staffName: "Daniel Mitchell",
        leaveType: "sick",
        startDate: "2026-07-21",
        endDate: "2026-07-21",
        affectedShifts: 1,
        affectedMinutes: 240,
      },
    ],
    contractReviews: [],
    coverageRows: [],
    ...overrides,
  };
}

describe("Reports presentation", () => {
  it("presents the four approved live KPIs", () => {
    const kpis = buildReportsKpis(page());
    expect(kpis.map((item) => item.label)).toEqual([
      "Scheduled hours",
      "Open work",
      "Approved worked hours",
      "Pending leave",
    ]);
    expect(kpis.map((item) => item.value)).toEqual(["20h", "2", "15h", "1"]);
    expect(kpis[1]?.sub).toContain("10h open");
  });

  it("keeps unpublished calendar weeks in the trend", () => {
    const points = buildTrendPoints(page());
    expect(points).toHaveLength(2);
    expect(points[1]).toMatchObject({ status: "not_published", scheduledHours: 0 });
    expect(weekPublicationLabel(points[1]!.status)).toBe("Not published");
  });

  it("derives exact manager-review facts without employee scoring", () => {
    const points = buildReviewPoints(page());
    const copy = points.map((point) => `${point.title} ${point.body}`).join(" ");
    expect(copy).toContain("2 published shifts still need cover");
    expect(copy).toContain("2 approved absences affect 2 published shifts");
    expect(copy).toContain("4 time entries await manager review");
    expect(copy).not.toMatch(/strong|stable|watch|score|rank|performer/i);
  });

  it("uses honest singular manager-review copy", () => {
    const singular = page({
      totals: {
        ...page().totals,
        openShifts: 1,
        approvedLeaveAffectedShifts: 1,
        awaitingReviewEntries: 1,
      },
      contractReviews: [
        {
          staffMemberId: "staff-1",
          staffName: "Sophie Carter",
          contractedMinutes: 1920,
          scheduledMinutes: 2250,
          differenceMinutes: 330,
          basis: "current_contract",
        },
      ],
      leaveImpacts: [
        {
          leaveRequestId: "leave-1",
          staffName: "Sophie Carter",
          leaveType: "annual_leave",
          startDate: "2026-08-10",
          endDate: "2026-08-10",
          affectedShifts: 1,
          affectedMinutes: 450,
        },
      ],
    });
    expect(buildReviewPoints(singular).map((point) => point.title)).toEqual([
      "1 published shift still needs cover",
      "1 approved absence affects 1 published shift",
      "1 time entry awaits manager review",
      "1 current-week contract comparison needs review",
    ]);
  });

  it("exposes fixed Quick Reports rather than saved/custom report semantics", () => {
    expect(QUICK_REPORTS.map((report) => report.label)).toEqual([
      "Published schedule review",
      "Coverage and open work",
      "Leave impact",
      "Time review",
      "Approved hours export",
    ]);
  });
});
