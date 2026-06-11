import type { ClockEntry, PortalNotification } from "@/features/staff-portal/types";
import type { LeaveRequest } from "@/features/leave/types";
import type { WeekDraftState } from "@/features/rota/lib/weekDraftState";
import type { StoredTimesheetRow } from "@/features/time/types";
import type { MockNotification } from "@/components/notificationData";

export type PortalClockState = {
  clockedIn: boolean;
  onBreak: boolean;
  /** Real epoch ms when the demo clock-in started; drives the elapsed timer. */
  startedAtMs: number | null;
};

/**
 * Single in-memory truth for the demo workspace. Routes and the staff portal
 * read from this state; publishing, approvals, and decisions mutate it so
 * every surface (Home, sidebar, Time, Leave, Reports, notifications, portal)
 * stays coherent for the lifetime of the session.
 */
export type WorkspaceState = {
  /** Selected rota week (0 = current week, 1 = next-week draft). */
  weekOffset: number;
  /** Per-week rota drafts and their published snapshots, keyed by offset. */
  weekDrafts: Record<string, WeekDraftState>;
  /** All leave requests; decisions update calendars, badges, and the portal. */
  leaveRequests: LeaveRequest[];
  /** Live manager-facing timesheets; approvals, flags, and adjustments persist here. */
  timeRows: StoredTimesheetRow[];
  /** Manager notification inbox shown from the topbar. */
  managerNotifications: MockNotification[];
  /** Staff portal clock state for the signed-in staff member (Olivia). */
  portalClock: PortalClockState;
  /** Olivia's recent clock entries; clock-outs append here. */
  portalClockEntries: ClockEntry[];
  /** Olivia's staff-safe notifications; publishes and leave decisions append here. */
  portalNotifications: PortalNotification[];
};
