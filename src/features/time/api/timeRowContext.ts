import type { SupabaseClient } from "@supabase/supabase-js";
import {
  selectPublishedVenueLocationIds,
  type PublishedSnapshotOrder,
  type PublishedVenueRow,
} from "./publishedVenueSelection";

export interface TimeContextEntry {
  staff_member_id: string;
  shift_id: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
}

export interface TimeStaffContext {
  displayName: string;
  roleName: string;
  department: string;
  departmentId: string | null;
  timezone: string;
}

export interface TimeShiftVenue {
  name: string | null;
  timezone: string;
  authority: "published-schedule" | "draft-fallback";
}

export async function loadTimeRowContext(
  supabase: SupabaseClient,
  workspaceId: string,
  entries: TimeContextEntry[],
  workspaceTimezone: string,
): Promise<{
  staffById: Map<string, TimeStaffContext>;
  venueByShiftId: Map<string, TimeShiftVenue>;
}> {
  const staffIds = [...new Set(entries.map((entry) => entry.staff_member_id))];
  const shiftIds = [
    ...new Set(entries.flatMap((entry) => (entry.shift_id ? [entry.shift_id] : []))),
  ];
  const [staff, draftShifts, departments, locations, published] = await Promise.all([
    staffIds.length
      ? supabase
          .from("staff_members")
          .select("id, display_name, role_name, department_id, primary_location_id")
          .eq("workspace_id", workspaceId)
          .in("id", staffIds)
      : Promise.resolve({ data: [], error: null }),
    shiftIds.length
      ? supabase
          .from("shifts")
          .select("id, location_id")
          .eq("workspace_id", workspaceId)
          .in("id", shiftIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("departments").select("id, name").eq("workspace_id", workspaceId),
    supabase.from("locations").select("id, name, timezone").eq("workspace_id", workspaceId),
    shiftIds.length
      ? supabase
          .from("published_rota_shifts")
          .select("source_shift_id, location_id, starts_at, ends_at, snapshot_id")
          .eq("workspace_id", workspaceId)
          .eq("assignment_status", "scheduled")
          .in("source_shift_id", shiftIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [staff, draftShifts, departments, locations, published]) {
    if (result.error) throw result.error;
  }

  const publishedRows = (published.data as PublishedVenueRow[] | null) ?? [];
  const snapshotIds = [...new Set(publishedRows.map((row) => row.snapshot_id))];
  const snapshotResult = snapshotIds.length
    ? await supabase
        .from("published_rota_snapshots")
        .select("id, version, published_at")
        .eq("workspace_id", workspaceId)
        .in("id", snapshotIds)
    : { data: [], error: null };
  if (snapshotResult.error) throw snapshotResult.error;

  const departmentNames = new Map(
    ((departments.data as { id: string; name: string }[] | null) ?? []).map((row) => [
      row.id,
      row.name,
    ]),
  );
  const locationRows = new Map(
    ((locations.data as { id: string; name: string; timezone: string | null }[] | null) ?? []).map(
      (row) => [row.id, row],
    ),
  );
  const staffById = new Map<string, TimeStaffContext>(
    (
      (staff.data as
        | {
            id: string;
            display_name: string;
            role_name: string;
            department_id: string | null;
            primary_location_id: string | null;
          }[]
        | null) ?? []
    ).map((row) => {
      const primary = row.primary_location_id ? locationRows.get(row.primary_location_id) : null;
      return [
        row.id,
        {
          displayName: row.display_name,
          roleName: row.role_name,
          department: row.department_id
            ? (departmentNames.get(row.department_id) ?? "Not set")
            : "Not set",
          departmentId: row.department_id,
          timezone: primary?.timezone ?? workspaceTimezone,
        },
      ];
    }),
  );

  const immutableLocationIds = selectPublishedVenueLocationIds(
    entries,
    publishedRows,
    (snapshotResult.data as PublishedSnapshotOrder[] | null) ?? [],
  );
  const draftLocationIds = new Map(
    ((draftShifts.data as { id: string; location_id: string }[] | null) ?? []).map((shift) => [
      shift.id,
      shift.location_id,
    ]),
  );
  const venueByShiftId = new Map<string, TimeShiftVenue>();
  for (const shiftId of shiftIds) {
    // Draft is a legacy fallback only when immutable scheduled evidence cannot be found.
    const locationId = immutableLocationIds.get(shiftId) ?? draftLocationIds.get(shiftId);
    const location = locationId ? locationRows.get(locationId) : null;
    if (location) {
      venueByShiftId.set(shiftId, {
        name: location.name,
        timezone: location.timezone ?? workspaceTimezone,
        authority: immutableLocationIds.has(shiftId) ? "published-schedule" : "draft-fallback",
      });
    }
  }
  return { staffById, venueByShiftId };
}
