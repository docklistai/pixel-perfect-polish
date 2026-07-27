import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { RotaDayIndex } from "../types";
import {
  buildShiftDateTimeRange,
  dayIndexFromDates,
  formatTimeInTimezone,
} from "../lib/liveRotaDates";
import {
  requireEditableWeek,
  type LiveMutationContext,
  type LocationRow,
  type RotaWeekRow,
} from "./rotaLiveMutationContext";
import type { draftShiftInput, updateShiftInput } from "./rotaLiveMutationSchemas";

export interface ExistingShiftRow {
  id: string;
  rota_week_id: string;
  location_id: string;
  department_id: string;
  staff_member_id: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role_name: string;
  assignment_status: "scheduled" | "open";
}

import {
  resolveDepartmentForCreate,
  resolveDepartmentForUpdate,
  resolveActiveStaffAssignment,
} from "./departmentAuthority";

export {
  resolveDepartmentForCreate,
  resolveDepartmentForUpdate,
  resolveActiveStaffAssignment,
} from "./departmentAuthority";

/**
 * Phase 44: the `shifts_90_mark_rota_week_draft` trigger performs the
 * unpublished-change transition inside the same transaction as the shift write
 * itself, so no caller issues a separate `rota_weeks` update any more. The
 * former `markWeekDraft` helper is deliberately gone rather than left unused —
 * a second request could only ever reintroduce the divergence it now prevents.
 */
export async function insertShift(
  context: LiveMutationContext,
  week: RotaWeekRow,
  input: z.infer<typeof draftShiftInput>,
): Promise<string> {
  const departmentId = await resolveDepartmentForCreate(context.supabase, context.workspaceId, {
    departmentId: input.departmentId,
    staffId: input.staffId,
  });
  const range = buildShiftDateTimeRange({
    weekStart: week.week_start,
    dayIndex: input.dayIndex as RotaDayIndex,
    start: input.start,
    end: input.end,
    timezone: context.location.timezone,
  });
  const { data, error } = await context.supabase
    .from("shifts")
    .insert({
      workspace_id: context.workspaceId,
      rota_week_id: week.id,
      location_id: context.location.id,
      department_id: departmentId,
      staff_member_id: input.staffId,
      shift_date: range.shiftDate,
      starts_at: range.startsAt,
      ends_at: range.endsAt,
      break_minutes: input.breakMinutes ?? 30,
      role_name: input.role,
      assignment_status: input.staffId ? "scheduled" : "open",
      // Carried only when supplied, so an ordinary create still leaves the
      // overrides null and the shift takes its role's default appearance.
      ...(input.colourOverride ? { colour_override: input.colourOverride } : {}),
      ...(input.deptOverride ? { dept_override: input.deptOverride } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function loadShiftContext(
  supabase: SupabaseClient,
  workspaceId: string,
  shiftId: string,
): Promise<{ shift: ExistingShiftRow; week: RotaWeekRow; location: LocationRow }> {
  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .select(
      "id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", shiftId)
    .maybeSingle();
  if (shiftError) throw shiftError;
  if (!shift) throw new Error("Shift was not found in this workspace");

  const shiftRow = shift as ExistingShiftRow;
  const [{ data: week, error: weekError }, { data: location, error: locationError }] =
    await Promise.all([
      supabase
        .from("rota_weeks")
        .select("id, location_id, week_start, status")
        .eq("workspace_id", workspaceId)
        .eq("id", shiftRow.rota_week_id)
        .maybeSingle(),
      supabase
        .from("locations")
        .select("id, timezone")
        .eq("workspace_id", workspaceId)
        .eq("id", shiftRow.location_id)
        .maybeSingle(),
    ]);
  if (weekError) throw weekError;
  if (locationError) throw locationError;
  if (!week || !location) throw new Error("Shift week or location is no longer available");

  return {
    shift: shiftRow,
    week: requireEditableWeek(week as RotaWeekRow),
    location: location as LocationRow,
  };
}

export async function buildShiftUpdate(
  supabase: SupabaseClient,
  workspaceId: string,
  shift: ExistingShiftRow,
  week: RotaWeekRow,
  location: LocationRow,
  patch: z.infer<typeof updateShiftInput>["patch"],
) {
  const nextStaffId = "staffId" in patch ? (patch.staffId ?? null) : shift.staff_member_id;
  const nextRole = patch.role ?? shift.role_name;
  const start = patch.start ?? formatTimeInTimezone(shift.starts_at, location.timezone);
  const end = patch.end ?? formatTimeInTimezone(shift.ends_at, location.timezone);
  const range =
    patch.start || patch.end
      ? buildShiftDateTimeRange({
          weekStart: week.week_start,
          dayIndex: dayIndexFromDates(week.week_start, shift.shift_date),
          start,
          end,
          timezone: location.timezone,
        })
      : { shiftDate: shift.shift_date, startsAt: shift.starts_at, endsAt: shift.ends_at };
  // Approved update precedence: explicit patch, then the shift's own
  // department, then the assignee's, then the workspace default. Reassigning
  // staff must never silently move the shift to their department.
  const departmentId = await resolveDepartmentForUpdate(supabase, workspaceId, {
    departmentId: patch.departmentId,
    staffId: nextStaffId,
    existingDepartmentId: shift.department_id,
  });

  return {
    department_id: departmentId,
    staff_member_id: nextStaffId,
    shift_date: range.shiftDate,
    starts_at: range.startsAt,
    ends_at: range.endsAt,
    break_minutes: patch.breakMinutes ?? shift.break_minutes,
    role_name: nextRole,
    assignment_status: nextStaffId ? "scheduled" : ("open" as const),
    // Presence in the patch (null clears) is what toggles these; absence leaves
    // the stored override untouched.
    ...("colourOverride" in patch ? { colour_override: patch.colourOverride ?? null } : {}),
    ...("deptOverride" in patch ? { dept_override: patch.deptOverride ?? null } : {}),
  };
}
