import { createServerFn } from "@tanstack/react-start";
import type { DraftShiftInput } from "../types";
import {
  addIsoDays,
  buildShiftDateTimeRange,
  dayIndexFromDates,
  formatTimeInTimezone,
} from "../lib/liveRotaDates";
import {
  ensureWeek,
  getLiveContext,
  requireEditableWeek,
  resolveWorkspace,
} from "./rotaLiveMutationContext";
import {
  draftShiftInput,
  liveWeekInput,
  shiftIdInput,
  updateShiftInput,
} from "./rotaLiveMutationSchemas";
import {
  buildShiftUpdate,
  insertShift,
  loadShiftContext,
  markWeekDraft,
  resolveActiveStaffAssignment,
} from "./rotaLiveShiftMapping";
import { executeLiveRotaShiftDuplicate } from "./duplicateLiveRotaShift";

export {
  copyPreviousLiveRotaWeekFn,
  previewCopyPreviousLiveRotaWeekFn,
} from "./copyPreviousLiveRotaWeekServer";

export const createLiveRotaShiftFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => liveWeekInput.extend({ shift: draftShiftInput }).parse(input))
  .handler(async ({ data }) => {
    const context = await getLiveContext(data, { createWeek: true });
    const week = await ensureWeek(context);
    const shiftId = await insertShift(context, week, data.shift);
    await markWeekDraft(context.supabase, context.workspaceId, week.id);
    return { rotaWeekId: week.id, shiftId };
  });

export const updateLiveRotaShiftFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateShiftInput.parse(input))
  .handler(async ({ data }) => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const workspaceId = await resolveWorkspace(supabase);
    const { shift, week, location } = await loadShiftContext(supabase, workspaceId, data.shiftId);
    const update = await buildShiftUpdate(supabase, workspaceId, shift, week, location, data.patch);
    const { error } = await supabase
      .from("shifts")
      .update(update)
      .eq("workspace_id", workspaceId)
      .eq("id", shift.id);
    if (error) throw error;
    await markWeekDraft(supabase, workspaceId, week.id);
    return { rotaWeekId: week.id, shiftId: shift.id };
  });

export const removeLiveRotaShiftFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => shiftIdInput.parse(input))
  .handler(async ({ data }) => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const workspaceId = await resolveWorkspace(supabase);
    const { shift, week } = await loadShiftContext(supabase, workspaceId, data.shiftId);
    const { error } = await supabase
      .from("shifts")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", shift.id);
    if (error) throw error;
    await markWeekDraft(supabase, workspaceId, week.id);
    return { rotaWeekId: week.id };
  });

export const markLiveRotaShiftOpenFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => shiftIdInput.parse(input))
  .handler(async ({ data }) => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const workspaceId = await resolveWorkspace(supabase);
    const { shift, week, location } = await loadShiftContext(supabase, workspaceId, data.shiftId);
    const update = await buildShiftUpdate(supabase, workspaceId, shift, week, location, {
      staffId: null,
    });
    const { error } = await supabase
      .from("shifts")
      .update(update)
      .eq("workspace_id", workspaceId)
      .eq("id", shift.id);
    if (error) throw error;
    await markWeekDraft(supabase, workspaceId, week.id);
    return { rotaWeekId: week.id, shiftId: shift.id };
  });

export const duplicateLiveRotaShiftFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => shiftIdInput.parse(input))
  .handler(async ({ data }) => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const workspaceId = await resolveWorkspace(supabase);
    const { shift, week, location } = await loadShiftContext(supabase, workspaceId, data.shiftId);
    const shiftId = await executeLiveRotaShiftDuplicate({
      shift,
      validateAssignment: (staffId) => resolveActiveStaffAssignment(supabase, workspaceId, staffId),
      insertCopy: async (source) => {
        const nextDay = addIsoDays(source.shift_date, 1);
        const weekEnd = addIsoDays(week.week_start, 6);
        const nextDate = nextDay > weekEnd ? weekEnd : nextDay;
        const range = buildShiftDateTimeRange({
          weekStart: week.week_start,
          dayIndex: dayIndexFromDates(week.week_start, nextDate),
          start: formatTimeInTimezone(source.starts_at, location.timezone),
          end: formatTimeInTimezone(source.ends_at, location.timezone),
          timezone: location.timezone,
        });
        const { data: inserted, error } = await supabase
          .from("shifts")
          .insert({
            workspace_id: workspaceId,
            rota_week_id: week.id,
            location_id: source.location_id,
            department_id: source.department_id,
            staff_member_id: source.staff_member_id,
            shift_date: range.shiftDate,
            starts_at: range.startsAt,
            ends_at: range.endsAt,
            break_minutes: source.break_minutes,
            role_name: source.role_name,
            assignment_status: source.assignment_status,
          })
          .select("id")
          .single();
        if (error) throw error;
        return (inserted as { id: string }).id;
      },
    });
    await markWeekDraft(supabase, workspaceId, week.id);
    return { rotaWeekId: week.id, shiftId };
  });

export const clearLiveRotaWeekFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => liveWeekInput.parse(input))
  .handler(async ({ data }) => {
    const context = await getLiveContext(data, { createWeek: true });
    const week = await ensureWeek(context);
    const { error } = await context.supabase
      .from("shifts")
      .delete()
      .eq("workspace_id", context.workspaceId)
      .eq("rota_week_id", week.id);
    if (error) throw error;
    await markWeekDraft(context.supabase, context.workspaceId, week.id);
    return { rotaWeekId: week.id };
  });

export const publishLiveRotaWeekFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => liveWeekInput.parse(input))
  .handler(async ({ data }) => {
    const context = await getLiveContext(data, { createWeek: false });
    if (!context.week) throw new Error("Save at least one shift before publishing");
    const week = requireEditableWeek(context.week);
    const { count, error: countError } = await context.supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", context.workspaceId)
      .eq("rota_week_id", week.id);
    if (countError) throw countError;
    if (!count) throw new Error("Cannot publish a rota week with no saved shifts");

    const { data: result, error } = await context.supabase.rpc("rpc_publish_rota_week", {
      p_workspace_id: context.workspaceId,
      p_rota_week_id: week.id,
    });
    if (error) throw error;
    return result as {
      snapshot_id: string;
      version: number;
      shift_count: number;
      notified_memberships: number;
    };
  });

export type LiveRotaShiftInput = DraftShiftInput;
