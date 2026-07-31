import { emptyAvailabilityFacts, type CommittedShift } from "../lib/scheduling/eligibility";
import { addIsoDays, formatTimeInTimezone } from "../lib/liveRotaDates";
import type { SupabaseClientLike } from "./buildWeekFacts";

/**
 * Everything that can stop somebody working, read once and indexed by staff id.
 *
 * Approved *and* pending leave are both loaded, because both are hard exclusions
 * for a new automatic assignment: the planner must not quietly schedule over a
 * request the manager has not answered yet.
 */

/**
 * Loads leave, recurring days off and one-off unavailability for the week.
 *
 * Every query is workspace-scoped and selects explicit columns.
 */
export async function loadAvailabilityFacts(
  supabase: SupabaseClientLike,
  workspaceId: string,
  weekStart: string,
  dayIsoDates: readonly string[],
) {
  const facts = emptyAvailabilityFacts();
  const weekEndPlusOne = addIsoDays(weekStart, 7);

  const [leaveRes, recurringRes, oneOffRes] = await Promise.all([
    supabase
      .from("leave_requests")
      .select("staff_member_id, start_date, end_date, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["approved", "pending"])
      .gte("end_date", weekStart)
      .lte("start_date", weekEndPlusOne),
    supabase
      .from("staff_recurring_day_off_requests")
      .select("staff_member_id, weekday")
      .eq("workspace_id", workspaceId)
      .eq("status", "approved"),
    supabase
      .from("staff_one_off_unavailability_requests")
      .select("staff_member_id, date")
      .eq("workspace_id", workspaceId)
      .eq("status", "approved")
      .gte("date", weekStart)
      .lte("date", weekEndPlusOne),
  ]);
  if (leaveRes.error) throw leaveRes.error;
  if (recurringRes.error) throw recurringRes.error;
  if (oneOffRes.error) throw oneOffRes.error;

  // An overnight shift on the final column ends on the day after the week, so
  // that date has to be testable too.
  const testableDates = [...dayIsoDates, weekEndPlusOne];
  for (const row of (leaveRes.data ?? []) as {
    staff_member_id: string;
    start_date: string;
    end_date: string;
    status: string;
  }[]) {
    const target =
      row.status === "approved" ? facts.approvedLeaveDatesByStaff : facts.pendingLeaveDatesByStaff;
    const bucket = target.get(row.staff_member_id) ?? new Set<string>();
    for (const date of testableDates) {
      if (row.start_date <= date && row.end_date >= date) bucket.add(date);
    }
    if (bucket.size > 0) target.set(row.staff_member_id, bucket);
  }
  for (const row of (recurringRes.data ?? []) as {
    staff_member_id: string;
    weekday: number;
  }[]) {
    const bucket = facts.recurringWeekdaysByStaff.get(row.staff_member_id) ?? new Set<number>();
    bucket.add(row.weekday);
    facts.recurringWeekdaysByStaff.set(row.staff_member_id, bucket);
  }
  for (const row of (oneOffRes.data ?? []) as { staff_member_id: string; date: string }[]) {
    const bucket = facts.unavailableDatesByStaff.get(row.staff_member_id) ?? new Set<string>();
    bucket.add(row.date);
    facts.unavailableDatesByStaff.set(row.staff_member_id, bucket);
  }
  return facts;
}

/**
 * Shifts these staff already hold **outside** the week being built.
 *
 * The apply RPC checks interval overlap against every shift a person holds in
 * the workspace, with no week and no location filter. The planner only sees the
 * week it is building, so without this it would propose an assignment the
 * database then refuses — and since the planner is deterministic, the "Build it
 * again" the refusal suggests would produce the identical proposal and the
 * identical refusal.
 *
 * The window is the day either side of the week: a shift can only overlap across
 * a date boundary by running past midnight, which reaches at most one day. Other
 * locations in the same workspace are included, because the same person can be
 * rostered at two of them.
 */
export async function loadExternalCommitments(
  supabase: SupabaseClientLike,
  workspaceId: string,
  rotaWeekId: string,
  weekStart: string,
  timezone: string,
): Promise<CommittedShift[]> {
  const { data, error } = await supabase
    .from("shifts")
    .select("id, staff_member_id, shift_date, starts_at, ends_at, rota_week_id")
    .eq("workspace_id", workspaceId)
    .neq("rota_week_id", rotaWeekId)
    .not("staff_member_id", "is", null)
    .gte("shift_date", addIsoDays(weekStart, -1))
    .lte("shift_date", addIsoDays(weekStart, 7))
    .order("id", { ascending: true });
  if (error) throw error;

  return (
    (data as
      | {
          id: string;
          staff_member_id: string | null;
          shift_date: string;
          starts_at: string;
          ends_at: string;
        }[]
      | null) ?? []
  )
    .filter((row): row is typeof row & { staff_member_id: string } => row.staff_member_id !== null)
    .map((row) => ({
      shiftId: row.id,
      staffId: row.staff_member_id,
      times: {
        workDate: row.shift_date,
        start: formatTimeInTimezone(row.starts_at, timezone),
        end: formatTimeInTimezone(row.ends_at, timezone),
      },
    }));
}
