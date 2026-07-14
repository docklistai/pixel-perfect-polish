import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { addIsoDays, dateIsoInTimezone } from "@/features/rota/lib/liveRotaDates";

/**
 * Staff-safe open-shift reads. Published open shifts come from the
 * `staff_portal_team_shifts` view (latest snapshot only) and the caller's own
 * requests from the `staff_portal_open_shift_requests` view — never base
 * tables. Requesting and withdrawing go through SECURITY DEFINER RPCs via
 * server functions in `portalActions.ts`.
 */

/** How far ahead staff can browse published open shifts. */
const OPEN_SHIFT_LOOKAHEAD_DAYS = 13;

export type OpenShiftRequestStatus =
  | "pending"
  | "withdrawn"
  | "selected"
  | "confirmed"
  | "declined"
  | "filled"
  | "stale";

export interface PortalOpenShift {
  publishedShiftId: string;
  date: string;
  dayLabel: string;
  start: string;
  end: string;
  role: string;
}

export interface PortalOpenShiftRequest {
  requestId: string;
  publishedShiftId: string;
  status: OpenShiftRequestStatus;
  decisionReason: string | null;
  date: string;
  dayLabel: string;
  start: string;
  end: string;
  role: string;
  locationName: string;
}

function dayFormat(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function timeFormat(timezone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface OpenShiftRow {
  published_shift_id: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  role_name: string;
  location_timezone: string;
}

/** Published open shifts staff can request: today onwards, latest snapshot only. */
export async function fetchPortalOpenShifts(
  workspaceId: string,
  roleName: string,
): Promise<PortalOpenShift[]> {
  const supabase = getSupabaseBrowserClient();
  const now = new Date();
  const utcToday = dateIsoInTimezone(now, "UTC");
  const { data, error } = await supabase
    .from("staff_portal_team_shifts")
    .select(
      "published_shift_id, shift_date, starts_at, ends_at, role_name, assignment_status, location_timezone",
    )
    .eq("workspace_id", workspaceId)
    .eq("assignment_status", "open")
    .eq("role_name", roleName)
    .gte("shift_date", addIsoDays(utcToday, -1))
    .lte("shift_date", addIsoDays(utcToday, OPEN_SHIFT_LOOKAHEAD_DAYS + 1))
    .order("shift_date", { ascending: true })
    .order("starts_at", { ascending: true });

  if (error) throw error;

  const dayFmt = dayFormat();
  return ((data as OpenShiftRow[] | null) ?? [])
    .filter((row) => {
      const localToday = dateIsoInTimezone(now, row.location_timezone);
      return (
        row.shift_date >= localToday &&
        row.shift_date <= addIsoDays(localToday, OPEN_SHIFT_LOOKAHEAD_DAYS)
      );
    })
    .map((row) => ({
      publishedShiftId: row.published_shift_id,
      date: row.shift_date,
      dayLabel: dayFmt.format(new Date(`${row.shift_date}T12:00:00Z`)),
      start: timeFormat(row.location_timezone).format(new Date(row.starts_at)),
      end: timeFormat(row.location_timezone).format(new Date(row.ends_at)),
      role: row.role_name,
    }));
}

interface OpenShiftRequestRow {
  request_id: string;
  published_shift_id: string;
  status: OpenShiftRequestStatus;
  decision_reason: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  role_name: string;
  location_name: string;
  location_timezone: string;
}

/** The signed-in staff member's own open-shift requests, newest shift first. */
export async function fetchPortalOpenShiftRequests(
  workspaceId: string,
  staffMemberId: string,
): Promise<PortalOpenShiftRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_open_shift_requests")
    .select(
      "request_id, published_shift_id, status, decision_reason, shift_date, starts_at, ends_at, role_name, location_name, location_timezone",
    )
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("shift_date", { ascending: false })
    .order("starts_at", { ascending: false });

  if (error) throw error;

  const dayFmt = dayFormat();
  return ((data as OpenShiftRequestRow[] | null) ?? []).map((row) => ({
    requestId: row.request_id,
    publishedShiftId: row.published_shift_id,
    status: row.status,
    decisionReason: row.decision_reason,
    date: row.shift_date,
    dayLabel: dayFmt.format(new Date(`${row.shift_date}T12:00:00Z`)),
    start: timeFormat(row.location_timezone).format(new Date(row.starts_at)),
    end: timeFormat(row.location_timezone).format(new Date(row.ends_at)),
    role: row.role_name,
    locationName: row.location_name,
  }));
}
