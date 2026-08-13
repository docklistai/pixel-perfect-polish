export type ReportsPeriodPreset = "four_weeks" | "current_week";
export type ReportsPublicationStatus = "published" | "partially_published" | "not_published";
export type ReportsOptionStatus = "active" | "inactive";
export type ReportsTone = "brand" | "info" | "warning" | "purple" | "danger" | "success";

export interface ReportsPageData {
  meta: {
    source: "latest_published_snapshots";
    workspaceTimezone: string;
    rotaStartWeekday: number;
    periodStart: string;
    periodEnd: string;
    currentWeekStart: string;
    hourSemantics: "net_after_breaks";
    shiftAttribution: "local_shift_start_date";
    heatmapSemantics: "average_assigned_headcount_by_local_3_hour_bucket";
    contractBasis: "exact_current_rota_week_only";
  };
  filters: { locationId: string | null; departmentId: string | null };
  options: {
    locations: ReportsFilterOption[];
    departments: ReportsFilterOption[];
  };
  totals: ReportsTotals;
  weeks: ReportsWeek[];
  departmentHours: ReportsDepartmentHours[];
  heatmap: ReportsHeatmapCell[];
  leaveImpacts: ReportsLeaveImpact[];
  contractReviews: ReportsContractReview[];
  coverageRows: ReportsCoverageRow[];
}

export interface ReportsFilterOption {
  id: string;
  name: string;
  status: ReportsOptionStatus;
}

export interface ReportsTotals {
  scheduledMinutes: number;
  assignedShifts: number;
  openShifts: number;
  openMinutes: number;
  approvedWorkedMinutes: number;
  approvedEntries: number;
  awaitingReviewEntries: number;
  pendingLeave: number;
  approvedLeaveAffectedShifts: number;
  approvedLeaveAffectedMinutes: number;
}

export interface ReportsWeek {
  weekStart: string;
  weekEnd: string;
  publicationStatus: ReportsPublicationStatus;
  publishedLocations: number;
  expectedLocations: number;
  scheduledMinutes: number;
  assignedShifts: number;
  openShifts: number;
  openMinutes: number;
  approvedWorkedMinutes: number;
  awaitingReviewEntries: number;
}

export interface ReportsDepartmentHours {
  id: string;
  name: string;
  status: ReportsOptionStatus;
  scheduledMinutes: number;
  assignedShifts: number;
}

export interface ReportsHeatmapCell {
  weekday: number;
  bucketStartHour: number;
  bucketEndHour: number;
  averageHeadcount: number;
}

export interface ReportsLeaveImpact {
  leaveRequestId: string;
  staffName: string;
  leaveType: "annual_leave" | "personal" | "sick" | "unpaid" | "other";
  startDate: string;
  endDate: string;
  affectedShifts: number;
  affectedMinutes: number;
}

export interface ReportsContractReview {
  staffMemberId: string;
  staffName: string;
  contractedMinutes: number;
  scheduledMinutes: number;
  differenceMinutes: number;
  basis: "current_contract";
}

export interface ReportsCoverageRow {
  date: string;
  location: string;
  department: string;
  assignedShifts: number;
  openShifts: number;
  scheduledMinutes: number;
  openMinutes: number;
}

export type ReportsDetailKey = "published" | "coverage" | "leave" | "time" | "contracts";
