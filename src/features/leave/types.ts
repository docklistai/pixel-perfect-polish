export interface LeaveDecisionEvent {
  state: "pending" | "approved" | "declined";
  reason: string;
  at: string;
}

export interface LeaveRequest {
  id: string;
  /** Staff id from the canonical demo world (matches rota staff ids). */
  staffId: string;
  n: string;
  role: string;
  dept: string;
  date: string;
  /** ISO range used to derive calendars and rota conflicts. */
  startIso: string;
  endIso: string;
  days: number;
  type: string;
  impact: "Low" | "Medium" | "High";
  tone: "success" | "warning" | "danger";
  state: "pending" | "approved" | "declined";
  notice: number;
  reason: string;
  img: number;
  balance: string;
  submitted: string;
  coverNote: string;
  /** Manager decision/reopen history retained for the audit-facing views. */
  decisionHistory?: LeaveDecisionEvent[];
}
