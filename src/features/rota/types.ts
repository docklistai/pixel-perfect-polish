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
  tone: ShiftTone;
  status: DraftShiftStatus;
};

export type DraftShiftInput = {
  dayIndex: RotaDayIndex;
  staffId: StaffId | null;
  role: string;
  start: string;
  end: string;
  tone?: ShiftTone;
  status?: DraftShiftStatus;
};

export type RotaGridCell = {
  shifts: DraftShift[];
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

export type RotaViewMode = "employee" | "role" | "day";

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
