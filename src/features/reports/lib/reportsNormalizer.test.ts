import { describe, expect, it } from "vitest";
import { normaliseReportsPage } from "./reportsNormalizer";

const valid = {
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
  weeks: [],
  departmentHours: [],
  heatmap: [],
  leaveImpacts: [],
  contractReviews: [],
  coverageRows: [],
};

describe("Reports RPC normalisation", () => {
  it("accepts the explicit live contract", () => {
    expect(normaliseReportsPage(valid).weeks).toEqual([]);
  });

  it("refuses null arrays instead of substituting demo data", () => {
    expect(() => normaliseReportsPage({ ...valid, weeks: null })).toThrow();
  });

  it("refuses malformed counters and unknown snapshot authority", () => {
    expect(() =>
      normaliseReportsPage({
        ...valid,
        meta: { ...valid.meta, source: "draft_shifts" },
      }),
    ).toThrow();
    expect(() =>
      normaliseReportsPage({
        ...valid,
        totals: { ...valid.totals, openShifts: -1 },
      }),
    ).toThrow();
  });

  it("does not accept private leave text in the public read model", () => {
    expect(() =>
      normaliseReportsPage({
        ...valid,
        leaveImpacts: [
          {
            leaveRequestId: "19000000-0000-4000-8000-000000000001",
            staffName: "Alex",
            leaveType: "annual_leave",
            startDate: "2026-08-10",
            endDate: "2026-08-10",
            affectedShifts: 1,
            affectedMinutes: 450,
            reason: "private",
          },
        ],
      }),
    ).toThrow();
  });
});
