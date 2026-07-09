import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

/**
 * Staff-safe "who am I working with" reads from the `staff_portal_team_shifts`
 * security-barrier view: colleague display names, roles, and shift times from
 * the latest published snapshot only. Never drafts, never private fields.
 */

const WORKSPACE_TZ = "Europe/London";

const DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: WORKSPACE_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: WORKSPACE_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Today's ISO date in the workspace timezone. */
export function portalTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: WORKSPACE_TZ }).format(new Date());
}

export function addIsoDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
}

/** Published team shifts in [fromIsoDate, toIsoDate], soonest first. */
export async function fetchPortalTeamShifts(
  workspaceId: string,
  fromIsoDate: string,
  toIsoDate: string,
): Promise<PortalTeamShift[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_team_shifts")
    .select(
      "published_shift_id, staff_member_id, display_name, shift_date, starts_at, ends_at, role_name, assignment_status",
    )
    .eq("workspace_id", workspaceId)
    .gte("shift_date", fromIsoDate)
    .lte("shift_date", toIsoDate)
    .order("shift_date", { ascending: true })
    .order("starts_at", { ascending: true });

  if (error) throw error;

  return ((data as TeamShiftRow[] | null) ?? []).map((row) => ({
    id: row.published_shift_id,
    staffMemberId: row.staff_member_id,
    name: row.display_name,
    role: row.role_name,
    date: row.shift_date,
    dayLabel: DAY_FMT.format(new Date(`${row.shift_date}T12:00:00Z`)),
    start: TIME_FMT.format(new Date(row.starts_at)),
    end: TIME_FMT.format(new Date(row.ends_at)),
    isOpen: row.assignment_status === "open",
  }));
}
