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

interface DepartmentRow {
  id: string;
  name: string;
}

interface ActiveStaffAssignment {
  id: string;
  departmentId: string | null;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function roleMatchesDepartment(role: string, departmentName: string): boolean {
  const roleValue = normalise(role);
  const deptValue = normalise(departmentName);
  const aliases: Record<string, string[]> = {
    "front of house": ["foh", "front of house", "front house", "waiter"],
    kitchen: ["kitchen", "chef", "cook"],
    bar: ["bar", "bartender"],
    housekeeping: ["housekeeping", "housekeeper"],
    maintenance: ["maintenance", "porter"],
  };
  return (
    roleValue.includes(deptValue) ||
    (aliases[deptValue] ?? []).some((alias) => roleValue.includes(alias))
  );
}

export async function resolveActiveStaffAssignment(
  supabase: SupabaseClient,
  workspaceId: string,
  staffId: string,
): Promise<ActiveStaffAssignment> {
  const { data, error } = await supabase
    .from("staff_members")
    .select("id, department_id, employment_status")
    .eq("workspace_id", workspaceId)
    .eq("id", staffId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.employment_status !== "active") {
    throw new Error("Assigned staff member is not active in this workspace");
  }
  return {
    id: data.id as string,
    departmentId: (data.department_id as string | null) ?? null,
  };
}

export async function resolveDepartmentId(
  supabase: SupabaseClient,
  workspaceId: string,
  input: { staffId: string | null; role: string; fallbackDepartmentId?: string },
): Promise<string> {
  if (input.staffId) {
    const assignment = await resolveActiveStaffAssignment(supabase, workspaceId, input.staffId);
    if (assignment.departmentId) return assignment.departmentId;
  }

  if (input.fallbackDepartmentId) return input.fallbackDepartmentId;

  // Created order makes the first row the workspace's starter/default department,
  // so the fallback below is deterministic.
  const { data: departments, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;

  const active = (departments as DepartmentRow[] | null) ?? [];
  // A workspace with zero active departments genuinely can't place a shift; this
  // should not happen after bootstrap seeds the starter departments.
  if (active.length === 0) {
    throw new Error("Add a department to this workspace before scheduling shifts.");
  }
  // Assigned active staff with no department still need to be schedulable. Use
  // the workspace starter/default department rather than fuzzy role matching.
  if (input.staffId) return active[0]!.id;

  // For open shifts, prefer a department whose name matches the role for
  // sensible grouping/colour, but never block scheduling.
  const match = active.find((department) => roleMatchesDepartment(input.role, department.name));
  return (match ?? active[0]!).id;
}

export async function markWeekDraft(
  supabase: SupabaseClient,
  workspaceId: string,
  rotaWeekId: string,
): Promise<void> {
  const { error } = await supabase
    .from("rota_weeks")
    .update({ status: "draft" })
    .eq("workspace_id", workspaceId)
    .eq("id", rotaWeekId)
    .neq("status", "draft");
  if (error) throw error;
}

export async function insertShift(
  context: LiveMutationContext,
  week: RotaWeekRow,
  input: z.infer<typeof draftShiftInput>,
): Promise<string> {
  const departmentId = await resolveDepartmentId(context.supabase, context.workspaceId, {
    staffId: input.staffId,
    role: input.role,
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
    })
    .select("id")
    .single();
  if (error) throw error;
  await markWeekDraft(context.supabase, context.workspaceId, week.id);
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
  const departmentId = await resolveDepartmentId(supabase, workspaceId, {
    staffId: nextStaffId,
    role: nextRole,
    fallbackDepartmentId: shift.department_id,
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
