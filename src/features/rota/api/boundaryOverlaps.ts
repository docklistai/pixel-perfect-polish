import type { SupabaseClient } from "@supabase/supabase-js";
import { formatTimeInTimezone } from "../lib/liveRotaDates";
import { latestPartnerChangeAt, timestampValue } from "./unpublishedChanges";

/**
 * Overlaps between the week on screen and assigned shifts *outside* it.
 *
 * A person cannot work two shifts at once, and neither a rota-week boundary nor
 * a location boundary changes that. The two assignment authorities
 * (`rpc_internal_assert_build_week_assignable`, `rpc_select_open_shift_applicant`)
 * have always compared workspace-wide, but the rota page reads one week of one
 * location (`rota_week_id = week.id`), so a partner outside that window was
 * invisible to the grid and to the publish dialog. Phase 53 closes that.
 *
 * WHY THIS RUNS SERVER-SIDE. Overlap is decided here, on the raw `timestamptz`
 * values, with the same half-open predicate `rpc_publish_rota_week` uses. It is
 * deliberately NOT decided by the frontend interval engine: `LocalShiftTimes`
 * carries wall-clock `HH:MM` with no timezone, and `mapShift` renders every row
 * in the *selected* location's clock. In-week that is safe, because every
 * candidate shares one clock. A partner at another location — or across a DST
 * transition — can overlap as instants while not overlapping as naive local
 * minutes, or the reverse. That disagreement would refuse a publication the
 * dialog could never acknowledge, which is the hard-block the Phase 52 mirror
 * contract exists to prevent. Comparing instants on both sides removes the
 * class of bug rather than managing it.
 */

/** One current-week shift overlapping one shift outside this rota week. */
export type BoundaryOverlap = {
  /** The shift in the week being viewed/published. Always the anchor. */
  shiftId: string;
  otherShiftId: string;
  staffMemberId: string;
  otherRotaWeekId: string;
  otherLocationId: string;
  otherDepartmentId: string;
  /** Local date the other shift is filed under, at its own location. */
  otherShiftDate: string;
  /** Other shift's times, rendered in ITS OWN location's timezone. */
  otherStart: string;
  otherEnd: string;
  otherLocationName: string | null;
  /** False when the other shift sits at a different location. */
  sameLocation: boolean;
  /** Where the other shift falls relative to this week's date range. */
  side: "before" | "after" | "same-dates";
};

type CurrentShiftRow = {
  id: string;
  staff_member_id: string | null;
  starts_at: string;
  ends_at: string;
};

type CandidateRow = {
  id: string;
  staff_member_id: string;
  rota_week_id: string;
  location_id: string;
  department_id: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

export type BoundaryLocation = { name: string; timezone: string };

/**
 * Overlaps plus the one fact the publish boundary needs about them.
 *
 * `partnerChangeAt` is the latest change across the partners that ACTUALLY
 * overlap — not across every candidate the query returned — and is null when
 * there is no boundary conflict. It stays out of `BoundaryOverlap` on purpose:
 * a timestamp is not conflict-display material, and no UI component should have
 * to know one exists.
 */
export type BoundaryOverlapResult = {
  overlaps: BoundaryOverlap[];
  partnerChangeAt: string | null;
};

const EMPTY_RESULT: BoundaryOverlapResult = { overlaps: [], partnerChangeAt: null };

/** Half-open, on absolute instants. Touching end-to-start is a clean handover. */
function overlaps(first: CurrentShiftRow, second: CandidateRow): boolean {
  return (
    Date.parse(first.starts_at) < Date.parse(second.ends_at) &&
    Date.parse(second.starts_at) < Date.parse(first.ends_at)
  );
}

function sideFor(
  otherShiftDate: string,
  weekStart: string,
  weekEnd: string,
): BoundaryOverlap["side"] {
  if (otherShiftDate < weekStart) return "before";
  if (otherShiftDate > weekEnd) return "after";
  // Same calendar dates but a different rota week — another location's week for
  // this same week_start. Real, and previously invisible from either side.
  return "same-dates";
}

/**
 * Every overlap between this week's assigned shifts and assigned shifts outside
 * it, in the same workspace.
 *
 * Bounded twice over: by the staff already assigned in this week (an equality
 * that uses the `(workspace_id, staff_member_id)` prefix of
 * `shifts_workspace_staff_date_idx`), and by this week's own occupied time
 * envelope. The envelope is a superset filter on the same axis the comparison
 * uses, so it can only discard rows that cannot overlap — no duration,
 * timezone or calendar assumption enters. A fixed `shift_date` band would need
 * one and is unsafe across locations with differing UTC offsets.
 *
 * Returns `[]` without querying when the week has no assigned shifts.
 */
export async function fetchBoundaryOverlaps({
  supabase,
  workspaceId,
  rotaWeekId,
  currentLocationId,
  weekStart,
  weekEnd,
  shifts,
  locations,
}: {
  supabase: SupabaseClient;
  workspaceId: string;
  rotaWeekId: string;
  currentLocationId: string;
  weekStart: string;
  weekEnd: string;
  shifts: CurrentShiftRow[];
  locations: Map<string, BoundaryLocation>;
}): Promise<BoundaryOverlapResult> {
  const assigned = shifts.filter(
    (shift): shift is CurrentShiftRow & { staff_member_id: string } =>
      shift.staff_member_id !== null,
  );
  if (assigned.length === 0) return EMPTY_RESULT;

  const staffIds = [...new Set(assigned.map((shift) => shift.staff_member_id))];
  // Compared as instants, never as strings. Lexical ordering of these ISO values
  // only tracks chronological ordering while every one carries the same UTC
  // offset, which is a property of the session timezone rather than a guarantee.
  // The filter still sends the original string, which Postgres parses exactly.
  let minStartsAt = assigned[0]!.starts_at;
  let maxEndsAt = assigned[0]!.ends_at;
  let minStartsMs = timestampValue(minStartsAt);
  let maxEndsMs = timestampValue(maxEndsAt);
  for (const shift of assigned) {
    const startsMs = timestampValue(shift.starts_at);
    const endsMs = timestampValue(shift.ends_at);
    if (startsMs < minStartsMs) {
      minStartsMs = startsMs;
      minStartsAt = shift.starts_at;
    }
    if (endsMs > maxEndsMs) {
      maxEndsMs = endsMs;
      maxEndsAt = shift.ends_at;
    }
  }

  const { data, error } = await supabase
    .from("shifts")
    .select(
      "id, staff_member_id, rota_week_id, location_id, department_id, shift_date, starts_at, ends_at, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    // In-week partners are already found by `localConflicts`; this read owns
    // everything outside the week, whatever location or department it sits in.
    .neq("rota_week_id", rotaWeekId)
    // Open shifts cannot match: the `shifts` coherence CHECK makes
    // `staff_member_id` null for every `assignment_status = 'open'` row, so
    // this membership test excludes them exactly as the RPC's equality join
    // does. Different staff are excluded for the same reason.
    .in("staff_member_id", staffIds)
    .lt("starts_at", maxEndsAt)
    .gt("ends_at", minStartsAt);

  if (error) throw error;

  const candidates = (data as CandidateRow[] | null) ?? [];
  if (candidates.length === 0) return EMPTY_RESULT;

  const overlapsFound: BoundaryOverlap[] = [];
  const matchedPartners: CandidateRow[] = [];
  for (const shift of assigned) {
    for (const other of candidates) {
      if (other.staff_member_id !== shift.staff_member_id) continue;
      if (other.id === shift.id) continue;
      if (!overlaps(shift, other)) continue;
      matchedPartners.push(other);

      const location = locations.get(other.location_id) ?? null;
      const timezone = location?.timezone ?? "UTC";
      overlapsFound.push({
        shiftId: shift.id,
        otherShiftId: other.id,
        staffMemberId: shift.staff_member_id,
        otherRotaWeekId: other.rota_week_id,
        otherLocationId: other.location_id,
        otherDepartmentId: other.department_id,
        otherShiftDate: other.shift_date,
        otherStart: formatTimeInTimezone(other.starts_at, timezone),
        otherEnd: formatTimeInTimezone(other.ends_at, timezone),
        otherLocationName: location?.name ?? null,
        sameLocation: other.location_id === currentLocationId,
        side: sideFor(other.shift_date, weekStart, weekEnd),
      });
    }
  }

  // Each (current, other) pair is produced exactly once. Sorting only makes the
  // payload deterministic across runs so the UI order is stable.
  overlapsFound.sort(
    (left, right) =>
      left.shiftId.localeCompare(right.shiftId) ||
      left.otherShiftId.localeCompare(right.otherShiftId),
  );

  return { overlaps: overlapsFound, partnerChangeAt: latestPartnerChangeAt(matchedPartners) };
}
