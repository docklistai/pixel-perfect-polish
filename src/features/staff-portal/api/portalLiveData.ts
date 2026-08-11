import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import type { PortalNotification, PortalShift } from "../types";
import { formatDayLabel, formatTime, shiftHours } from "./portalFormatting";

export { formatDayLabel } from "./portalFormatting";

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
  department_name: string | null;
  location_timezone: string;
}

function mapPublishedShift(row: PublishedShiftViewRow): PortalShift {
  return {
    id: row.published_shift_id,
    date: row.shift_date,
    dayLabel: formatDayLabel(row.shift_date),
    start: formatTime(row.starts_at, row.location_timezone),
    end: formatTime(row.ends_at, row.location_timezone),
    hours: shiftHours(row.starts_at, row.ends_at),
    role: row.role_name,
    station: row.location_name,
    department: row.department_name,
    breakMinutes: row.break_minutes,
    status: row.assignment_status === "open" ? "open" : "confirmed",
    sourceSnapshotVersion: row.snapshot_version,
    publishedAt: row.published_at,
    startsAtMs: Date.parse(row.starts_at),
    endsAtMs: Date.parse(row.ends_at),
  };
}

/**
 * The signed-in staff member's own shifts from the latest published snapshot,
 * soonest first, rendered in the venue timezone. Open (unassigned) shifts are
 * excluded — this is "my rota".
 */
export async function fetchPortalPublishedShifts(
  workspaceId: string,
  staffMemberId: string,
): Promise<PortalShift[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_published_shifts")
    .select(
      "published_shift_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status, snapshot_version, published_at, location_name, department_name, location_timezone",
    )
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("shift_date", { ascending: true })
    .order("starts_at", { ascending: true });

  if (error) throw error;

  return ((data as PublishedShiftViewRow[] | null) ?? []).map(mapPublishedShift);
}

interface PublishedRotaStateRow {
  snapshot_version: number;
  published_at: string;
}

export async function fetchPortalPublishedRotaState(
  workspaceId: string,
): Promise<{ hasPublished: boolean }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_published_rota_weeks")
    .select("snapshot_version, published_at")
    .eq("workspace_id", workspaceId)
    .order("published_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  return { hasPublished: ((data as PublishedRotaStateRow[] | null) ?? []).length > 0 };
}

function formatNotificationStamp(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** DB notification kind → the portal's display kind. */
const NOTIFICATION_KIND_MAP: Record<string, PortalNotification["kind"]> = {
  rota_published: "rota-published",
  leave_approved: "leave-approved",
  leave_declined: "leave-declined",
  leave_cancelled: "leave-cancelled",
  shift_changed: "shift-changed",
  timesheet_reminder: "timesheet-reminder",
  announcement: "announcement",
  announcement_reminder: "announcement-reminder",
  team_training_reminder: "training-reminder",
  open_shift_update: "open-shift-update",
  shift_release_update: "shift-release-update",
  unavailability_update: "unavailability-update",
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

function mapNotification(row: NotificationViewRow, timezone: string): PortalNotification {
  const kind = NOTIFICATION_KIND_MAP[row.kind] ?? "announcement";
  return {
    id: row.notification_id,
    kind,
    title: row.title,
    body: row.body,
    postedAt: formatNotificationStamp(row.created_at, timezone),
    unread: row.read_at === null,
    important:
      kind === "leave-approved" ||
      kind === "leave-declined" ||
      kind === "leave-cancelled" ||
      kind === "open-shift-update" ||
      kind === "shift-release-update" ||
      kind === "unavailability-update",
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
export async function fetchPortalNotifications(
  workspaceId: string,
  timezone: string,
): Promise<PortalNotification[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_notifications")
    .select(
      "notification_id, kind, title, body, related_entity_type, related_entity_id, created_at, read_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return ((data as NotificationViewRow[] | null) ?? []).map((row) =>
    mapNotification(row, timezone),
  );
}

export {
  fetchPortalLeaveRequests,
  mapLeaveRequest,
  upcomingApprovedLeaveRequests,
  type LeaveRequestViewRow,
  type PortalLeaveRequest,
} from "./portalLeaveData";

export {
  fetchPortalClockEvents,
  fetchPortalTimeEntries,
  portalTimeWindowStart,
  PORTAL_TIME_LOOKBACK_DAYS,
  type PortalClockEvent,
  type PortalClockEventType,
  type PortalTimeEntry,
} from "./portalTimeData";

export { fetchPortalProfile } from "./portalProfileData";
