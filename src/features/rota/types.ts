export type Shift = {
  time: string;
  role: string;
  tone: string;
  flag?: "conflict" | "open" | "off";
};

export type ShiftDetail = Shift & { staff: string; day: string };

export type StaffMember = {
  name: string;
  role: string;
  hrs: string;
  img: number;
  tone: string;
  shifts: Shift[];
};

export const off: Shift = { time: "—", role: "Day off", tone: "off", flag: "off" };

export type RotaShiftStatusFilter = "all" | "scheduled" | "open" | "conflict";

export type RotaWarningFilter = "all" | "conflicts" | "working-time";

export type RotaViewMode = "employee" | "role" | "day";

export type RotaFilters = {
  department: string;
  shiftStatus: RotaShiftStatusFilter;
  warningType: RotaWarningFilter;
};

export type ConflictSummary = {
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
