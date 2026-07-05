export interface TimesheetRow {
  id: string;
  n: string;
  role: string;
  img: number;
  sched: string;
  in: string;
  inN: string;
  inTone?: "warning" | "danger";
  out: string;
  outN: string;
  outTone?: "warning" | "danger";
  brk: string;
  paid: string;
  exc: string;
  excTone?: "danger";
}

export type TimesheetStatus = "approved" | "pending" | "unapproved";

export interface TimeAuditEntry {
  id: string;
  time: string;
  title: string;
  body: string;
}

export interface StoredTimesheetRow extends TimesheetRow {
  /**
   * Live rows carry the owning staff member id so read-only profile surfaces can
   * filter workspace time entries without changing the Time page behavior.
   */
  staffMemberId?: string;
  department: string;
  status: TimesheetStatus;
  flagged: boolean;
  auditTrail: TimeAuditEntry[];
  /**
   * The entry's work date (YYYY-MM-DD), present on live rows only. Required to
   * build exact timestamptz values for a live adjustment; demo rows omit it.
   */
  workDate?: string;
}

export interface TimeAdjustment {
  clockIn: string;
  clockOut: string;
  breakTime: string;
  reason: string;
  note: string;
}

export interface MissedClockIn {
  id: string;
  n: string;
  t: string;
  img: number;
}

export interface TimeQuery {
  id: string;
  n: string;
  t: string;
  st: string;
  stTone: "danger" | "info";
  img: number;
}
