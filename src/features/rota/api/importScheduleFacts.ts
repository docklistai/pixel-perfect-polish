import type { SupabaseClient } from "@supabase/supabase-js";
import { buildShiftSignature, signatureKey } from "../lib/scheduling/shiftSignature";
import { formatTimeInTimezone } from "../lib/liveRotaDates";
import type {
  DepartmentCandidate,
  StaffCandidate,
} from "@/features/scheduling/parsing/exactResolvers";

/**
 * Everything a schedule import needs to read before it can parse anything.
 *
 * All of it is workspace-scoped and read-only. Preview writes nothing — that is
 * the whole contract of the drawer — so this file exists to make the read side
 * one explicit, reviewable set of queries rather than something interleaved with
 * the parsing.
 *
 * The week is deliberately allowed to be absent. A manager importing into a
 * genuinely fresh week has no rota_weeks row yet, and the shift and role facts
 * for that case are simply empty rather than an error.
 */

export type ImportFacts = {
  staff: StaffCandidate[];
  departments: DepartmentCandidate[];
  defaultDepartmentId: string | null;
  /** Signature keys already in the week. Empty when the week does not exist. */
  existingSignatureKeys: Set<string>;
  /** Role labels this workspace already uses, for one spelling per role. */
  knownRoleNames: string[];
};

interface ShiftRow {
  department_id: string;
  location_id: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role_name: string;
}

export async function loadImportFacts({
  supabase,
  workspaceId,
  rotaWeekId,
  timezone,
}: {
  supabase: SupabaseClient;
  workspaceId: string;
  /** Null when importing into a week that does not exist yet. */
  rotaWeekId: string | null;
  timezone: string;
}): Promise<ImportFacts> {
  const [shiftsRes, staffRes, deptRes] = await Promise.all([
    rotaWeekId === null
      ? Promise.resolve({ data: [] as ShiftRow[], error: null })
      : supabase
          .from("shifts")
          .select(
            "department_id, location_id, shift_date, starts_at, ends_at, break_minutes, role_name",
          )
          .eq("workspace_id", workspaceId)
          .eq("rota_week_id", rotaWeekId),
    supabase
      .from("staff_members")
      .select("id, display_name, employment_status, role_name")
      .eq("workspace_id", workspaceId),
    supabase.from("departments").select("id, name, status").eq("workspace_id", workspaceId),
  ]);
  if (shiftsRes.error) throw shiftsRes.error;
  if (staffRes.error) throw staffRes.error;
  if (deptRes.error) throw deptRes.error;

  const shifts = (shiftsRes.data as ShiftRow[] | null) ?? [];
  const staff = (
    (staffRes.data as
      | { id: string; display_name: string; employment_status: string; role_name: string | null }[]
      | null) ?? []
  ).map((row) => ({
    id: row.id,
    name: row.display_name,
    active: row.employment_status === "active",
    roleName: row.role_name,
  }));
  const departments = (
    (deptRes.data as { id: string; name: string; status: string }[] | null) ?? []
  ).map((row) => ({ id: row.id, name: row.name, active: row.status === "active" }));

  return {
    staff,
    departments,
    defaultDepartmentId: departments.find((department) => department.active)?.id ?? null,
    existingSignatureKeys: new Set(
      shifts.map((row) =>
        signatureKey(
          buildShiftSignature({
            workDate: row.shift_date,
            start: formatTimeInTimezone(row.starts_at, timezone),
            end: formatTimeInTimezone(row.ends_at, timezone),
            role: row.role_name,
            departmentId: row.department_id,
            locationId: row.location_id,
            breakMinutes: row.break_minutes,
          }),
        ),
      ),
    ),
    // The week's own labels come first: an import joining a week that already
    // says "Bar" should not introduce a second "bar" beside it.
    knownRoleNames: [
      ...shifts.map((row) => row.role_name),
      ...staff.map((member) => member.roleName ?? ""),
    ].filter((name) => name.trim() !== ""),
  };
}
