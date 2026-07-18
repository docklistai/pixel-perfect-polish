import type { TimeExceptionCode } from "./lib/timeExceptions";

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
  /** Workspace-owned department id used for server-authoritative export scope. */
  departmentId?: string | null;
  status: TimesheetStatus;
  flagged: boolean;
  auditTrail: TimeAuditEntry[];
  /**
   * The entry's work date (YYYY-MM-DD), present on live rows only. Required to
   * build exact timestamptz values for a live adjustment; demo rows omit it.
   */
  workDate?: string;
  /**
   * The venue timezone the entry's clock times render and adjust in (the staff
   * member's primary location, workspace fallback). Live rows only.
   */
  timezone?: string;
  /** Raw linkage and instant fields retained for deterministic live derivation. */
  shiftId?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  clockedInAt?: string | null;
  clockedOutAt?: string | null;
  breakMinutes?: number;
  exceptionCodes?: TimeExceptionCode[];
  /** Scheduled venue only; never evidence of the physical clocking location. */
  scheduledLocationName?: string | null;
  timezoneAuthority?: "scheduled-shift" | "draft-shift-fallback" | "staff-primary-or-workspace";
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
