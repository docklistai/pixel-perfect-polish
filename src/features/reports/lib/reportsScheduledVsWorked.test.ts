import { describe, expect, it } from "vitest";
import { buildScheduledVsWorkedSummary } from "./reportsPresentation";
import type { ReportsPageData, ReportsWeek } from "../types";

function createMockReportsData(overrides: Partial<ReportsPageData> = {}): ReportsPageData {
  const defaultWeek: ReportsWeek = {
    weekStart: "2026-08-03",
    weekEnd: "2026-08-09",
    publicationStatus: "published",
    publishedLocations: 1,
    expectedLocations: 1,
    scheduledMinutes: 9600, // 160h 00m
    assignedShifts: 20,
    openShifts: 0,
    openMinutes: 0,
    approvedWorkedMinutes: 9150, // 152h 30m
    awaitingReviewEntries: 3,
  };

  return {
    meta: {
      source: "latest_published_snapshots",
      workspaceTimezone: "Europe/London",
      rotaStartWeekday: 0, // Monday
      periodStart: "2026-08-03",
      periodEnd: "2026-08-09",
      currentWeekStart: "2026-08-03",
      hourSemantics: "net_after_breaks",
      shiftAttribution: "local_shift_start_date",
      heatmapSemantics: "average_assigned_headcount_by_local_3_hour_bucket",
      contractBasis: "exact_current_rota_week_only",
    },
    filters: { locationId: null, departmentId: null },
    options: { locations: [], departments: [] },
    totals: {
      scheduledMinutes: 9600,
      assignedShifts: 20,
      openShifts: 0,
      openMinutes: 0,
      approvedWorkedMinutes: 9150,
      approvedEntries: 18,
      awaitingReviewEntries: 3,
      pendingLeave: 1,
      approvedLeaveAffectedShifts: 0,
      approvedLeaveAffectedMinutes: 0,
    },
    weeks: [defaultWeek],
    departmentHours: [],
    heatmap: [],
    leaveImpacts: [],
    contractReviews: [],
    coverageRows: [],
    ...overrides,
  };
}

describe("buildScheduledVsWorkedSummary", () => {
  it("plainly states three numbers with pending stated separately", () => {
    const data = createMockReportsData();
    const summary = buildScheduledVsWorkedSummary(data);

    expect(summary.hasPublishedWeek).toBe(true);
    // 9600 minutes = 160h
    expect(summary.scheduledHours).toBe("160h");
    expect(summary.scheduledMinutes).toBe(9600);
    // 9150 minutes = 152.5h
    expect(summary.approvedWorkedHours).toBe("152.5h");
    expect(summary.approvedWorkedMinutes).toBe(9150);
    // Pending stated separately as exact entry count
    expect(summary.awaitingReviewCount).toBe(3);
    expect(summary.approvedEntriesCount).toBe(18);

    // Verify no ratios, percentages or efficiency metrics are exposed
    const raw = summary as unknown as Record<string, unknown>;
    expect(raw.efficiency).toBeUndefined();
    expect(raw.ratio).toBeUndefined();
    expect(raw.variancePercent).toBeUndefined();
    expect(raw.adherence).toBeUndefined();
  });

  it("detects when no published rota snapshots exist in the period", () => {
    const data = createMockReportsData({
      weeks: [
        {
          weekStart: "2026-08-03",
          weekEnd: "2026-08-09",
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
      totals: {
        scheduledMinutes: 0,
        assignedShifts: 0,
        openShifts: 0,
        openMinutes: 0,
        approvedWorkedMinutes: 0,
        approvedEntries: 0,
        awaitingReviewEntries: 0,
        pendingLeave: 0,
        approvedLeaveAffectedShifts: 0,
        approvedLeaveAffectedMinutes: 0,
      },
    });

    const summary = buildScheduledVsWorkedSummary(data);
    expect(summary.hasPublishedWeek).toBe(false);
  });

  it("recognises partially published weeks as having published content", () => {
    const data = createMockReportsData({
      weeks: [
        {
          weekStart: "2026-08-03",
          weekEnd: "2026-08-09",
          publicationStatus: "partially_published",
          publishedLocations: 1,
          expectedLocations: 2,
          scheduledMinutes: 4800,
          assignedShifts: 10,
          openShifts: 0,
          openMinutes: 0,
          approvedWorkedMinutes: 4200,
          awaitingReviewEntries: 1,
        },
      ],
    });

    const summary = buildScheduledVsWorkedSummary(data);
    expect(summary.hasPublishedWeek).toBe(true);
  });

  it("respects multi-week periods and sums totals accurately", () => {
    const data = createMockReportsData({
      weeks: [
        {
          weekStart: "2026-08-03",
          weekEnd: "2026-08-09",
          publicationStatus: "published",
          publishedLocations: 1,
          expectedLocations: 1,
          scheduledMinutes: 4800,
          assignedShifts: 10,
          openShifts: 0,
          openMinutes: 0,
          approvedWorkedMinutes: 4500,
          awaitingReviewEntries: 2,
        },
        {
          weekStart: "2026-08-10",
          weekEnd: "2026-08-16",
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
      totals: {
        scheduledMinutes: 4800,
        assignedShifts: 10,
        openShifts: 0,
        openMinutes: 0,
        approvedWorkedMinutes: 4500,
        approvedEntries: 8,
        awaitingReviewEntries: 2,
        pendingLeave: 0,
        approvedLeaveAffectedShifts: 0,
        approvedLeaveAffectedMinutes: 0,
      },
    });

    const summary = buildScheduledVsWorkedSummary(data);
    // Has at least one published week in the 2-week period
    expect(summary.hasPublishedWeek).toBe(true);
    expect(summary.scheduledHours).toBe("80h");
    expect(summary.approvedWorkedHours).toBe("75h");
    expect(summary.awaitingReviewCount).toBe(2);
    expect(summary.approvedEntriesCount).toBe(8);
  });
});
