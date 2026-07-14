/** Where the inbox data came from: the live workspace read or the demo store. */
export type LeaveSource = "live" | "demo";

/** States a manager decision can move a request to (no cancel — staff-only). */
export type LeaveDecisionState = "pending" | "approved" | "declined";

/** Every state a request can be in. `cancelled` is staff-withdrawn, distinct
 * from a manager `declined`. */
export type LeaveRequestState = LeaveDecisionState | "cancelled";

export interface LeaveDecisionEvent {
  state: LeaveRequestState;
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
  state: LeaveRequestState;
  notice: number;
  reason: string;
  img: number;
  balance: string;
  submitted: string;
  coverNote: string;
  /** Distinguishes a staff withdrawal from a manager cancellation. */
  cancellationSource?: "staff" | "manager";
  /** Manager decision/reopen history retained for the audit-facing views. */
  decisionHistory?: LeaveDecisionEvent[];
}
