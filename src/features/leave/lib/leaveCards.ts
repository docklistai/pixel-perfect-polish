/**
 * Source-aware data helpers for the Leave page cards. The single rule: demo
 * sample content (team balances, illustrative coverage bars) renders only in
 * demo mode. In live mode these helpers return `null` so the components show
 * honest "not available yet" copy instead of fabricated people, entitlements,
 * or coverage percentages. Status mapping is kept here too so `cancelled` vs
 * `declined` has one tested source of truth.
 */

import type { LeaveRequest, LeaveRequestState, LeaveSource } from "../types";

/** Backend leave status as persisted by Supabase (`leave_requests.status`). */
export type LeaveBackendStatus = "pending" | "approved" | "declined" | "cancelled";

/**
 * Maps the persisted backend status to the UI state. `cancelled` (staff
 * withdrawal) stays distinct from `declined` (manager decision) — they are not
 * collapsed together.
 */
export function leaveStateFromStatus(status: LeaveBackendStatus): LeaveRequestState {
  return status;
}

export interface TeamLeaveBalance {
  name: string;
  tone: string;
  used: number;
  total: number;
}

const DEMO_TEAM_BALANCES: TeamLeaveBalance[] = [
  { name: "Sophie Carter", tone: "av-c1", used: 13, total: 28 },
  { name: "Daniel Mitchell", tone: "av-c2", used: 8, total: 28 },
  { name: "Priya Patel", tone: "av-c3", used: 14, total: 22 },
  { name: "Liam O'Connor", tone: "av-c4", used: 5, total: 22 },
];

/**
 * Team leave balances for the bottom card. Demo only — there is no live
 * entitlement source, so live returns `null` and the card shows honest copy
 * rather than inventing people or totals.
 */
export function teamLeaveBalances(source: LeaveSource): TeamLeaveBalance[] | null {
  return source === "demo" ? DEMO_TEAM_BALANCES : null;
}

export interface CoverageRow {
  label: string;
  value: number;
  tone: "danger" | "warning";
}

const DEMO_COVERAGE_BY_REQUEST: Record<string, CoverageRow[]> = {
  l1: [
    { label: "Thu 18 Jun", value: 85, tone: "warning" },
    { label: "Fri 19 Jun", value: 80, tone: "warning" },
  ],
  l2: [
    { label: "Tue 16 Jun", value: 75, tone: "warning" },
    { label: "Wed 17 Jun", value: 70, tone: "warning" },
  ],
  l3: [
    { label: "Sun 21 Jun", value: 50, tone: "danger" },
    { label: "Mon 22 Jun", value: 60, tone: "warning" },
    { label: "Tue 23 Jun", value: 66, tone: "warning" },
  ],
  l4: [
    { label: "Mon 15 Jun", value: 70, tone: "warning" },
    { label: "Fri 19 Jun", value: 65, tone: "warning" },
    { label: "Sun 21 Jun", value: 60, tone: "warning" },
  ],
};

/**
 * Illustrative coverage rows for the detail panel. Demo only — these are sample
 * figures, never a real coverage calculation, so live returns `null` and the
 * panel routes the manager to the rota instead of showing invented percentages.
 */
export function coverageRowsForRequest(
  request: Pick<LeaveRequest, "id" | "date" | "impact">,
  source: LeaveSource,
): CoverageRow[] | null {
  if (source !== "demo") return null;
  return (
    DEMO_COVERAGE_BY_REQUEST[request.id] ?? [
      {
        label: request.date,
        value: request.impact === "High" ? 50 : request.impact === "Medium" ? 70 : 90,
        tone: request.impact === "High" ? "danger" : "warning",
      },
    ]
  );
}

/** Title + dates for the coverage-risk drawer, driven by the selected request. */
export function riskDrawerContext(request: Pick<LeaveRequest, "dept" | "date"> | null): {
  title: string;
  dateLabel: string;
  dept: string;
} {
  if (!request) {
    return { title: "Coverage check", dateLabel: "Select a request to review", dept: "the team" };
  }
  return { title: `Coverage check — ${request.dept}`, dateLabel: request.date, dept: request.dept };
}
