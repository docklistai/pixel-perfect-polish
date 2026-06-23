import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import type { ClockEntry, PortalNotification, PortalShift } from "../types";

/**
 * Browser-side staff-safe reads for the portal. These hit the
 * `staff_portal_*` security-barrier views only — never base tables — so RLS
 * and the view definitions guarantee a staff member can read their own
 * published snapshot rows and nothing else. Reads are additionally scoped by
 * the caller's resolved `auth.workspaceId` / `auth.staffMemberId`.
 *
 * Nothing here writes. Sensitive actions go through SECURITY DEFINER RPCs in
 * `portalActions.ts`.
 */

const WORKSPACE_TZ = "Europe/London";

const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: WORKSPACE_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: WORKSPACE_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

function formatTime(iso: string): string {
  return TIME_FMT.format(new Date(iso));
}

/** Date-only column → "Thu 11 Jun" without a timezone day-shift. */
function formatDayLabel(isoDate: string): string {
  return DAY_FMT.format(new Date(`${isoDate}T12:00:00Z`));
}

function shiftHours(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.round((ms / 3_600_000) * 100) / 100;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}`;
}

function inclusiveDays(startIso: string, endIso: string): number {
  const ms =
    new Date(`${endIso}T00:00:00Z`).getTime() - new Date(`${startIso}T00:00:00Z`).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

interface PublishedShiftViewRow {
  published_shift_id: string;
  staff_member_id: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role_name: string;
  assignment_status: "scheduled" | "open";
  snapshot_version: number;
  published_at: string;
  location_name: string;
}

function mapPublishedShift(row: PublishedShiftViewRow): PortalShift {
  return {
    id: row.published_shift_id,
    date: row.shift_date,
    dayLabel: formatDayLabel(row.shift_date),
    start: formatTime(row.starts_at),
    end: formatTime(row.ends_at),
    hours: shiftHours(row.starts_at, row.ends_at),
    role: row.role_name,
    station: row.location_name,
    breakMinutes: row.break_minutes,
    status: row.assignment_status === "open" ? "open" : "confirmed",
    sourceSnapshotVersion: row.snapshot_version,
    publishedAt: row.published_at,
  };
}

/**
 * The signed-in staff member's own shifts from the latest published snapshot,
 * soonest first. Open (unassigned) shifts are excluded — this is "my rota".
 */
export async function fetchPortalPublishedShifts(
  workspaceId: string,
  staffMemberId: string,
): Promise<PortalShift[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_published_shifts")
    .select(
      "published_shift_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status, snapshot_version, published_at, location_name",
    )
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("shift_date", { ascending: true })
    .order("starts_at", { ascending: true });

  if (error) throw error;

  return ((data as PublishedShiftViewRow[] | null) ?? []).map(mapPublishedShift);
}

const NOTIFICATION_DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: WORKSPACE_TZ,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** DB notification kind → the portal's display kind. */
const NOTIFICATION_KIND_MAP: Record<string, PortalNotification["kind"]> = {
  rota_published: "rota-published",
  leave_approved: "leave-approved",
  leave_declined: "leave-declined",
  shift_changed: "shift-changed",
  timesheet_reminder: "timesheet-reminder",
  announcement: "announcement",
};

interface NotificationViewRow {
  notification_id: string;
  kind: string;
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
  read_at: string | null;
}

function mapNotification(row: NotificationViewRow): PortalNotification {
  const kind = NOTIFICATION_KIND_MAP[row.kind] ?? "announcement";
  return {
    id: row.notification_id,
    kind,
    title: row.title,
    body: row.body,
    postedAt: NOTIFICATION_DAY_FMT.format(new Date(row.created_at)),
    unread: row.read_at === null,
    important: kind === "leave-approved" || kind === "leave-declined",
    relatedLeaveRequestId:
      row.related_entity_type === "leave_request" && row.related_entity_id
        ? row.related_entity_id
        : undefined,
  };
}

/**
 * The signed-in staff member's own notifications from the staff-safe
 * `staff_portal_notifications` view (their own deliveries only), newest first.
 */
export async function fetchPortalNotifications(workspaceId: string): Promise<PortalNotification[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_notifications")
    .select(
      "notification_id, kind, title, body, related_entity_type, related_entity_id, created_at, read_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data as NotificationViewRow[] | null) ?? []).map(mapNotification);
}

export interface PortalLeaveRequest {
  id: string;
  type: string;
  date: string;
  startIso: string;
  endIso: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  submittedAt: string;
  decisionReason?: string;
}

export interface LeaveRequestViewRow {
  leave_request_id: string;
  staff_member_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  submitted_at: string;
  decided_at: string | null;
  decision_reason: string | null;
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual_leave: "Annual leave",
  personal: "Personal leave",
  sick: "Sick leave",
  unpaid: "Unpaid leave",
  other: "Other",
};

export function mapLeaveRequest(row: LeaveRequestViewRow): PortalLeaveRequest {
  return {
    id: row.leave_request_id,
    type: LEAVE_TYPE_LABEL[row.leave_type] ?? "Leave",
    date: `${dayMonth(row.start_date)} – ${dayMonth(row.end_date)}`,
    startIso: row.start_date,
    endIso: row.end_date,
    days: inclusiveDays(row.start_date, row.end_date),
    reason: row.reason,
    status: row.status,
    submittedAt: dayMonth(row.submitted_at.slice(0, 10)),
    decisionReason:
      row.status === "cancelled"
        ? (row.decision_reason ?? "Withdrawn by staff")
        : (row.decision_reason ?? undefined),
  };
}

export function upcomingApprovedLeaveRequests(
  requests: PortalLeaveRequest[],
  todayIso: string,
): PortalLeaveRequest[] {
  return requests
    .filter((request) => request.status === "approved" && request.endIso >= todayIso)
    .sort((a, b) => a.startIso.localeCompare(b.startIso));
}

/**
 * The signed-in staff member's own leave requests from the staff-safe
 * `staff_portal_leave_requests` view, newest first.
 */
export async function fetchPortalLeaveRequests(
  workspaceId: string,
  staffMemberId: string,
): Promise<PortalLeaveRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_leave_requests")
    .select(
      "leave_request_id, staff_member_id, leave_type, start_date, end_date, reason, status, submitted_at, decided_at, decision_reason",
    )
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;

  return ((data as LeaveRequestViewRow[] | null) ?? []).map(mapLeaveRequest);
}

/**
 * A staff-safe time entry plus the raw clock instants the live clock needs.
 * Extends the display-ready {@link ClockEntry} with epoch-ms clock times so the
 * portal can both render history and derive the open entry / timer origin from
 * persisted state rather than session memory.
 */
export interface PortalTimeEntry extends ClockEntry {
  clockedInAtMs: number | null;
  clockedOutAtMs: number | null;
}

interface TimeEntryViewRow {
  time_entry_id: string;
  staff_member_id: string;
  work_date: string;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  break_minutes: number;
}

function mapPortalTimeEntry(row: TimeEntryViewRow): PortalTimeEntry {
  const clockedInAtMs = row.clocked_in_at ? Date.parse(row.clocked_in_at) : null;
  const clockedOutAtMs = row.clocked_out_at ? Date.parse(row.clocked_out_at) : null;
  const workedHours =
    clockedInAtMs !== null && clockedOutAtMs !== null
      ? Math.max(0, (clockedOutAtMs - clockedInAtMs) / 3_600_000 - row.break_minutes / 60)
      : null;
  return {
    id: row.time_entry_id,
    dayLabel: formatDayLabel(row.work_date),
    clockIn: row.clocked_in_at ? formatTime(row.clocked_in_at) : "—",
    clockOut: row.clocked_out_at ? formatTime(row.clocked_out_at) : null,
    breakMinutes: row.break_minutes,
    totalHours: workedHours !== null ? Math.round(workedHours * 10) / 10 : null,
    // A past entry with a clock-in but no clock-out is genuinely missing one;
    // the live caller excludes the active open entry before reading this flag.
    flag: clockedInAtMs !== null && clockedOutAtMs === null ? "missing-clock-out" : null,
    clockedInAtMs,
    clockedOutAtMs,
  };
}

/**
 * The signed-in staff member's own time entries from the staff-safe
 * `staff_portal_time_entries` view, newest first.
 */
export async function fetchPortalTimeEntries(
  workspaceId: string,
  staffMemberId: string,
): Promise<PortalTimeEntry[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_time_entries")
    .select(
      "time_entry_id, staff_member_id, work_date, clocked_in_at, clocked_out_at, break_minutes",
    )
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("work_date", { ascending: false })
    .order("clocked_in_at", { ascending: false, nullsFirst: false });

  if (error) throw error;

  return ((data as TimeEntryViewRow[] | null) ?? []).map(mapPortalTimeEntry);
}

export type PortalClockEventType = "clock_in" | "clock_out" | "break_start" | "break_end";

export interface PortalClockEvent {
  timeEntryId: string;
  eventType: PortalClockEventType;
  occurredAtMs: number;
}

interface ClockEventViewRow {
  time_entry_id: string;
  event_type: PortalClockEventType;
  occurred_at: string;
}

/**
 * The signed-in staff member's own recent clock events from the staff-safe
 * `staff_portal_clock_events` view, newest first. Used to derive break state
 * for the open entry; bounded so the read stays cheap.
 */
export async function fetchPortalClockEvents(
  workspaceId: string,
  staffMemberId: string,
): Promise<PortalClockEvent[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_clock_events")
    .select("time_entry_id, event_type, occurred_at")
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return ((data as ClockEventViewRow[] | null) ?? []).map((row) => ({
    timeEntryId: row.time_entry_id,
    eventType: row.event_type,
    occurredAtMs: Date.parse(row.occurred_at),
  }));
}

interface ProfileViewRow {
  staff_member_id: string;
  display_name: string;
  role_name: string;
  department_name: string | null;
  email: string | null;
  phone: string | null;
  employment_status: string;
}

export async function fetchPortalProfile(workspaceId: string, staffMemberId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_profile")
    .select(
      "staff_member_id, display_name, role_name, department_name, email, phone, employment_status",
    )
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .single();

  if (error) throw error;

  const row = data as ProfileViewRow;

  const parts = row.display_name.trim().split(" ");
  const initials =
    parts.length > 1
      ? `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase()
      : `${parts[0]![0]!}`.toUpperCase();

  return {
    staffId: row.staff_member_id,
    name: row.display_name,
    initials,
    role: row.role_name,
    department: row.department_name ?? "Unassigned",
    email: row.email ?? "",
    phone: row.phone ?? "",
    accessStatus: "active" as const,
    manager: { name: "Your Manager", email: "", phone: "" },
  };
}
