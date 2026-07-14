import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { addIsoDays, dateIsoInTimezone } from "@/features/rota/lib/liveRotaDates";

/**
 * Staff-safe "who am I working with" reads from the `staff_portal_team_shifts`
 * security-barrier view: colleague display names, roles, and shift times from
 * the latest published snapshot only. Never drafts, never private fields.
 */

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

export type PortalTeamShift = {
  id: string;
  staffMemberId: string | null;
  name: string | null;
  role: string;
  date: string;
  dayLabel: string;
  start: string;
  end: string;
  isOpen: boolean;
};

interface TeamShiftRow {
  published_shift_id: string;
  staff_member_id: string | null;
  display_name: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  role_name: string;
  assignment_status: "scheduled" | "open";
  location_timezone: string;
}

/** Published team shifts in [fromIsoDate, toIsoDate], soonest first, in the venue timezone. */
export async function fetchPortalTeamShifts(workspaceId: string): Promise<PortalTeamShift[]> {
  const supabase = getSupabaseBrowserClient();
  const now = new Date();
  const utcToday = dateIsoInTimezone(now, "UTC");
  const { data, error } = await supabase
    .from("staff_portal_team_shifts")
    .select(
      "published_shift_id, staff_member_id, display_name, shift_date, starts_at, ends_at, role_name, assignment_status, location_timezone",
    )
    .eq("workspace_id", workspaceId)
    .gte("shift_date", addIsoDays(utcToday, -1))
    .lte("shift_date", addIsoDays(utcToday, 7))
    .order("shift_date", { ascending: true })
    .order("starts_at", { ascending: true });

  if (error) throw error;

  const dayFmt = dayFormat();
  return ((data as TeamShiftRow[] | null) ?? [])
    .filter((row) => {
      const localToday = dateIsoInTimezone(now, row.location_timezone);
      return row.shift_date >= localToday && row.shift_date <= addIsoDays(localToday, 6);
    })
    .map((row) => ({
      id: row.published_shift_id,
      staffMemberId: row.staff_member_id,
      name: row.display_name,
      role: row.role_name,
      date: row.shift_date,
      dayLabel: dayFmt.format(new Date(`${row.shift_date}T12:00:00Z`)),
      start: timeFormat(row.location_timezone).format(new Date(row.starts_at)),
      end: timeFormat(row.location_timezone).format(new Date(row.ends_at)),
      isOpen: row.assignment_status === "open",
    }));
}
