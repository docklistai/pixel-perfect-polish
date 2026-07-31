export type StaffId = string;
export type ShiftId = string;
export type RotaDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type DraftShiftStatus = "scheduled" | "open" | "conflict";
export type ShiftTone = "info" | "warning" | "danger" | "purple" | "success" | "open";

export type StaffMember = {
  id: StaffId;
  name: string;
  role: string;
  /**
   * Display-only contracted-hours label ("40h", "—").
   *
   * @deprecated Never compare this. It is a formatted string, and comparing it
   * literally is how a 37.5h contract came to be invisible to scheduling. Use
   * {@link StaffMember.contractedMinutesPerWeek} for any decision.
   */
  hrs: string;
  /**
   * Contracted minutes per week from `staff_members.contracted_minutes_per_week`.
   *
   * A **soft balancing signal only**: it reorders equally-eligible candidates and
   * can never exclude anyone. `null` means no recorded target and is treated as
   * neutral, never as zero. This is not a working-time limit and carries no
   * compliance or payroll meaning.
   */
  contractedMinutesPerWeek?: number | null;
  img: number;
  tone: ShiftTone;
  /**
   * The staff member's own department. A default and a suitability signal for
   * new shifts — never a restriction, and never rewritten by scheduling.
   */
  departmentId?: string | null;
};

export type DraftShift = {
  id: ShiftId;
  dayIndex: RotaDayIndex;
  staffId: StaffId | null;
  role: string;
  /** 24-hour HH:MM, e.g. "08:00". */
  start: string;
  /** 24-hour HH:MM. May wrap past midnight (e.g. start "16:00", end "00:00"). */
  end: string;
  breakMinutes: number;
  tone: ShiftTone;
  status: DraftShiftStatus;
  /**
   * The shift's actual department (`shifts.department_id`). This is the
   * authority — it is not derived from the staff profile, and changing it never
   * edits the staff member's own department. Null only for drafts that have not
   * been persisted yet.
   */
  departmentId?: string | null;
  /** Resolved department name for display; null when it cannot be resolved. */
  departmentName?: string | null;
  /** Manual chip colour override (dept colour preset id). Draft/local only. */
  colourOverride?: string;
  /**
   * Legacy free-text department label from the old cell menu. Kept so existing
   * data still renders, but it is NOT the department — use `departmentId`.
   */
  deptOverride?: string;
  /** Marks the shift as edited in the current draft (amber indicator). */
  edited?: boolean;
};

export type PublishedShiftStatus = "scheduled" | "open" | "changed";

export type PublishedShiftSnapshot = {
  id: ShiftId;
  dayIndex: RotaDayIndex;
  date: string;
  dayLabel: string;
  staffId: StaffId | null;
  staffName: string | null;
  staffInitials: string | null;
  role: string;
  start: string;
  end: string;
  location: string;
  breakMinutes: number;
  status: PublishedShiftStatus;
};

export type PublishedRotaSnapshot = {
  workspaceId: string;
  weekKey: string;
  weekStart: string;
  weekLabel: string;
  version: number;
  publishedAt: string;
  publishedBy: {
    id: StaffId;
    name: string;
  };
  shifts: PublishedShiftSnapshot[];
};

export type DraftShiftInput = {
  dayIndex: RotaDayIndex;
  staffId: StaffId | null;
  role: string;
  start: string;
  end: string;
  breakMinutes?: number;
  tone?: ShiftTone;
  status?: DraftShiftStatus;
  /** Explicit department for this shift. Omitted means "fall back safely". */
  departmentId?: string | null;
  /** Draft-only department label override. Ignored by live persistence schemas. */
  deptOverride?: string;
  /** Draft-only chip colour override. Ignored by live persistence schemas. */
  colourOverride?: string;
};

export type RotaGridCell = {
  shifts: DraftShift[];
  /** True if the staff member has approved leave on this day. */
  hasLeave?: boolean;
  /** Leave visibility for scheduling scanability; only approved leave creates conflicts. */
  leaveState?: "approved" | "pending";
  /** Short leave-kind label (Holiday/Sick/Unpaid/Personal/Leave) for the cell badge. */
  leaveLabel?: string;
  /** Approved scheduling constraint shown when the cell has no shift. */
  availabilityHint?: "unavailable" | "day-off";
};

export type RotaGridStaffRow = {
  kind: "staff";
  staff: StaffMember;
  cells: RotaGridCell[];
};

export type RotaGridOpenRow = {
  kind: "open";
  cells: RotaGridCell[];
};

export type RotaGridRow = RotaGridStaffRow | RotaGridOpenRow;

export type RotaShiftStatusFilter = "all" | "scheduled" | "open" | "conflict";

export type RotaWarningFilter = "all" | "conflicts" | "working-time";

export type RotaFilters = {
  department: string;
  shiftStatus: RotaShiftStatusFilter;
  warningType: RotaWarningFilter;
};

export type ConflictSummary = {
  id: ShiftId;
  staff: string;
  day: string;
  detail: string;
  cause: string;
  guidance: string;
};

export type RoleCoverageSummary = {
  label: string;
  value: string;
  pct: number;
  tone: string;
};

export type WorkingTimeAlert = {
  staffId: StaffId;
  staffName: string;
  scheduledDays: number;
};
