export type StaffId = string;
export type ShiftId = string;
export type RotaDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type DraftShiftStatus = "scheduled" | "open" | "conflict";
export type ShiftTone = "info" | "warning" | "danger" | "purple" | "success" | "open";

export type StaffMember = {
  id: StaffId;
  name: string;
  role: string;
  hrs: string;
  img: number;
  tone: ShiftTone;
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
  /** Manual chip colour override (dept colour preset id). Draft/local only. */
  colourOverride?: string;
  /** Department override applied from the cell menu. Draft/local only. */
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
