import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether a location's time zone may still be changed.
 *
 * WHY THIS EXISTS. `shifts` and `published_rota_shifts` both store `starts_at` /
 * `ends_at` as absolute `timestamptz` instants, and every surface renders them
 * through the location's *current* `timezone` — the rota grid via
 * `formatTimeInTimezone`, the staff portal via `formatTime(row.starts_at,
 * row.location_timezone)`. Editing the zone therefore does not move a shift; it
 * silently restates every existing one at a different clock time, including on
 * snapshots the database otherwise protects as immutable. Staff are never told,
 * because the publish notifier only fires on republish.
 *
 * So the write is refused rather than announced. There is no audit event and no
 * notification to add: the unsafe change never happens.
 *
 * The check is per-location on purpose. A workspace-wide check would lock a new
 * site the moment any *other* site had a shift, and the zone being edited only
 * governs the rows filed against that one location.
 */

export const TIMEZONE_LOCKED_MESSAGE =
  "Time zone can't be changed after shifts have been scheduled for this location " +
  "because it would change how existing shift times are displayed.";

/**
 * True once this location has any scheduling data at all.
 *
 * Both tables are consulted, and neither implies the other: a draft shift can be
 * deleted after publication, leaving a published row whose displayed times still
 * depend on this zone, and a drafted week that has never been published has no
 * published row yet. Each read is an indexed existence probe on the
 * `(workspace_id, location_id, …)` prefix and stops at one row.
 *
 * Runs under the caller's session, so RLS applies: `shifts_manager_all` and
 * `published_rota_shifts_staff_safe_select` both admit owner/manager for their
 * own workspace, which is the only role that can reach this path.
 */
export async function locationHasScheduleData({
  supabase,
  workspaceId,
  locationId,
}: {
  supabase: SupabaseClient;
  workspaceId: string;
  locationId: string;
}): Promise<boolean> {
  const [draft, published] = await Promise.all([
    supabase
      .from("shifts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("location_id", locationId)
      .limit(1),
    supabase
      .from("published_rota_shifts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("location_id", locationId)
      .limit(1),
  ]);
  if (draft.error) throw draft.error;
  if (published.error) throw published.error;

  return (
    ((draft.data as { id: string }[] | null) ?? []).length > 0 ||
    ((published.data as { id: string }[] | null) ?? []).length > 0
  );
}
