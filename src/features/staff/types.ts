/**
 * Result of issuing a workspace or staff portal code. The plaintext `code` is
 * returned exactly once on success and is never validated client-side.
 */
export type IssuePortalCodeResult = { ok: true; code: string } | { ok: false; message: string };

/** Live contract types the `staff_members` schema accepts. */
export type StaffContractType = "full_time" | "part_time" | "casual" | "fixed_term";

/** Live employment statuses the `staff_members` schema accepts. */
export type StaffEmploymentStatus = "active" | "inactive" | "left";

/** A workspace department option for the Add Staff department picker. */
export interface WorkspaceDepartment {
  id: string;
  name: string;
}

/** Result of creating a live staff member. `id` is the new row's uuid. */
export type CreateStaffMemberResult = { ok: true; id: string } | { ok: false; message: string };

/** Outcome for a single row of a bulk staff import, keyed by source index. */
export interface BulkStaffRowResult {
  index: number;
  ok: boolean;
  /** Present when `ok` — the new row's uuid. */
  id?: string;
  /** Present when not `ok` — honest, non-leaking failure copy. */
  message?: string;
}

/** Result of a bulk staff import. Rows are inserted independently. */
export type BulkCreateStaffResult =
  | { ok: true; results: BulkStaffRowResult[]; created: number; failed: number }
  | { ok: false; message: string };

/** A department row for the minimal department manager (includes archive state). */
export interface ManageableDepartment {
  id: string;
  name: string;
  status: "active" | "inactive";
}

/** Result of a department create/rename/status write. */
export type DepartmentWriteResult = { ok: true; id: string } | { ok: false; message: string };

/** Result of updating a live staff member. `id` echoes the updated row's uuid. */
export type UpdateStaffMemberResult = { ok: true; id: string } | { ok: false; message: string };

export interface StaffRow {
  id: string;
  name: string;
  n: string;
  e: string;
  role: string;
  sub: string;
  dept: string;
  status: string;
  contract: string;
  hours: string;
  avail: string;
  availTone: "high" | "med" | "off";
  img: number;
  active?: boolean;
  statusTone?: "info" | "purple";
  portalStatus?: "Claimed" | "Pending" | "Not invited";
  // Raw live-schema values carried on live rows so Edit Staff can prefill them
  // accurately. Demo rows omit these (their editing stays demo-only).
  phone?: string;
  departmentId?: string | null;
  contractType?: StaffContractType | null;
  contractedMinutesPerWeek?: number | null;
  employmentStatus?: StaffEmploymentStatus;
}

// Extended manager-only profile data — never exposed to staff portal
export interface StaffProfileShift {
  date: string;
  time: string;
  dept: string;
  role: string;
  location?: string;
  notes?: string;
  status?: string;
}

export interface StaffProfileDocument {
  name: string;
  type: string;
  expiry?: string;
  status: "valid" | "expiring" | "expired" | "missing";
}

export interface StaffProfileNote {
  date: string;
  author: string;
  type: string;
  text: string;
  visibleToStaff: boolean;
}

export interface StaffProfileActivity {
  date: string;
  type: string;
  note: string;
}

export interface StaffProfileTimeEntry {
  date: string;
  shift: string;
  role: string;
  location: string;
  clockIn: string;
  clockOut: string;
  breaks: string;
  total: string;
}

export interface StaffProfileLeaveEntry {
  range: string;
  type: string;
  duration: string;
  status: string;
}

export interface StaffProfileAbsenceEntry {
  date: string;
  type: string;
  duration: string;
  reason: string;
  status: string;
  rtw: string;
}

export interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  sub: string;
  dept: string;
  status: string;
  contract: string;
  contractedHours: string;
  startDate: string;
  img: number;
  employmentType: string;
  emergencyContact: string;
  skills: string[];
  flags: string[];
  managerSnapshot: string[];
  nextShift: StaffProfileShift;
  recentActivity: StaffProfileActivity[];
  documentsSummary: { total: number; expiringSoon: number; missing: number };
  documents: StaffProfileDocument[];
  availability: {
    updated: string;
    conflicts: number;
    lateChanges: number;
    usuallyAvailable: string;
  };
  scheduleStats: { preferredDays: string[]; preferredShifts: string[]; avoidIfPossible: string[] };
  workloadBalance: {
    hoursThisWeek: number;
    avgLast4Weeks: number;
    consecutiveShifts: number;
    restGap: string;
    weekendLoad: string;
    overtimeTrend: string;
  };
  leaveAbsence: {
    annualLeaveRemaining: number;
    sickDaysThisYear: number;
    sickDaysThisMonth: number;
    sickDaysLast90: number;
    sicknessEpisodes: number;
    shortNoticeAbsences: number;
    returnToWorkRequired: boolean;
    fitNoteRequired: boolean;
  };
  timeStats: {
    hoursThisWeek: number;
    avgWeeklyHours: number;
    hoursThisMonth: number;
    overtimeThisMonth: number;
  };
  portalAccess: { status: string; lastLogin: string };
  notes: StaffProfileNote[];
  upcomingShifts: StaffProfileShift[];
  recentShifts: StaffProfileShift[];
  roleCoverage?: Array<{ label: string; value: number }>;
  breakSummary?: { averageBreak: string; missedBreaks: number; complianceStatus: string };
  weeklyHours?: number[];
  timeEntries?: StaffProfileTimeEntry[];
  upcomingLeave?: StaffProfileLeaveEntry[];
  absenceHistory?: StaffProfileAbsenceEntry[];
  insights: {
    attendanceRate: number;
    onTimeStarts: number;
    lateClockIns: number;
    noShows: number;
    avgWeeklyHours: number;
    consecutiveShifts: number;
    restGap: string;
    weekendLoad: string;
    overtimeTrend: string;
    sickDaysLast30: number;
    sickDaysLast90: number;
    sicknessEpisodesThisYear: number;
    shortNoticeAbsenceCount: number;
    roleFit: string;
    preferredShifts: string;
    departmentFit: string;
    availabilityMatch: string;
    certificationsStatus: string;
  };
}
