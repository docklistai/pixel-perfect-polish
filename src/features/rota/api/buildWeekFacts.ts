import { buildShiftSignature, normaliseRoleKey } from "../lib/scheduling/shiftSignature";
import type { ExistingShiftFact } from "../lib/scheduling/buildWeekProposal";
import type { StaffSchedulingFact } from "../lib/scheduling/eligibility";
import { formatTimeInTimezone } from "../lib/liveRotaDates";

/**
 * Database rows reduced to the facts the planner reasons about.
 *
 * The planner is pure and knows nothing about Supabase; this is the only place
 * a row shape is turned into a scheduling fact, so the column list and the
 * mapping cannot drift apart between the Build and Import entry points.
 *
 * Column lists are explicit throughout — selecting every column is a
 * non-negotiable violation — and both callers scope each query by
 * `workspace_id`.
 */

export type SupabaseClientLike = Awaited<
  ReturnType<typeof import("@/lib/supabase/serverClient").getSupabaseServerClient>
>;

export interface ShiftRow {
  id: string;
  staff_member_id: string | null;
  department_id: string;
  location_id: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role_name: string;
  colour_override: string | null;
  dept_override: string | null;
}

export interface StaffRow {
  id: string;
  role_name: string | null;
  department_id: string | null;
  employment_status: string;
  display_name: string;
  contracted_minutes_per_week: number | null;
}

export const SHIFT_COLUMNS =
  "id, staff_member_id, department_id, location_id, shift_date, starts_at, ends_at, break_minutes, role_name, colour_override, dept_override";

export const STAFF_COLUMNS =
  "id, role_name, department_id, employment_status, display_name, contracted_minutes_per_week";

export function toExistingFact(row: ShiftRow, timezone: string): ExistingShiftFact {
  return {
    id: row.id,
    staffId: row.staff_member_id,
    signature: buildShiftSignature({
      workDate: row.shift_date,
      start: formatTimeInTimezone(row.starts_at, timezone),
      end: formatTimeInTimezone(row.ends_at, timezone),
      role: row.role_name,
      departmentId: row.department_id,
      locationId: row.location_id,
      breakMinutes: row.break_minutes,
    }),
    ...(row.colour_override ? { colourOverride: row.colour_override } : {}),
    ...(row.dept_override ? { deptOverride: row.dept_override } : {}),
  };
}

export function toStaffFact(row: StaffRow): StaffSchedulingFact {
  return {
    id: row.id,
    name: row.display_name,
    roleKey: normaliseRoleKey(row.role_name ?? ""),
    departmentId: row.department_id,
    active: row.employment_status === "active",
    contractedMinutesPerWeek: row.contracted_minutes_per_week,
  };
}
