import { createServerFn } from "@tanstack/react-start";
import { addIsoDays } from "../lib/liveRotaDates";
import { ensureWeek, getLiveContext } from "./rotaLiveMutationContext";
import { liveWeekInput } from "./rotaLiveMutationSchemas";
import { markWeekDraft } from "./rotaLiveShiftMapping";
import {
  applyLiveCopyRows,
  buildLiveCopyPreview,
  buildLiveCopyRows,
  type LiveCopyInsertShiftRow,
  type LiveCopySourceShiftRow,
} from "./copyPreviousLiveRotaWeek";

async function loadPreviousWeekSourceRows({
  context,
  previousWeekStart,
}: {
  context: Awaited<ReturnType<typeof getLiveContext>>;
  previousWeekStart: string;
}): Promise<LiveCopySourceShiftRow[]> {
  const { data: previousWeek, error: previousWeekError } = await context.supabase
    .from("rota_weeks")
    .select("id")
    .eq("workspace_id", context.workspaceId)
    .eq("location_id", context.location.id)
    .eq("week_start", previousWeekStart)
    .maybeSingle();
  if (previousWeekError) throw previousWeekError;
  if (!previousWeek) throw new Error("No previous week rota is available to copy.");

  const { data: previousShifts, error: shiftsError } = await context.supabase
    .from("shifts")
    .select(
      "location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status",
    )
    .eq("workspace_id", context.workspaceId)
    .eq("rota_week_id", (previousWeek as { id: string }).id)
    .order("shift_date", { ascending: true })
    .order("starts_at", { ascending: true });
  if (shiftsError) throw shiftsError;
  return ((previousShifts as LiveCopySourceShiftRow[] | null) ?? []).filter(Boolean);
}

export const copyPreviousLiveRotaWeekFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => liveWeekInput.parse(input))
  .handler(async ({ data }) => {
    const context = await getLiveContext(data, { createWeek: true });
    const week = await ensureWeek(context);
    const previousWeekStart = addIsoDays(context.weekStart, -7);
    const sourceRows = await loadPreviousWeekSourceRows({ context, previousWeekStart });
    const nextRows = buildLiveCopyRows({
      sourceRows,
      workspaceId: context.workspaceId,
      targetWeekId: week.id,
      targetLocationId: context.location.id,
      previousWeekStart,
      targetWeekStart: week.week_start,
      timezone: context.location.timezone,
    });

    const { data: currentShifts, error: currentError } = await context.supabase
      .from("shifts")
      .select(
        "id, workspace_id, rota_week_id, location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status",
      )
      .eq("workspace_id", context.workspaceId)
      .eq("rota_week_id", week.id)
      .order("shift_date", { ascending: true })
      .order("starts_at", { ascending: true });
    if (currentError) throw currentError;
    const currentRows = (currentShifts as LiveCopyInsertShiftRow[] | null) ?? [];

    await applyLiveCopyRows({
      nextRows,
      currentRows,
      deleteCurrentRows: async () => {
        const { error } = await context.supabase
          .from("shifts")
          .delete()
          .eq("workspace_id", context.workspaceId)
          .eq("rota_week_id", week.id);
        if (error) throw error;
      },
      insertRows: async (rows) => {
        const { error } = await context.supabase.from("shifts").insert(rows);
        if (error) throw error;
      },
      restoreRows: async (rows) => {
        const { error } = await context.supabase.from("shifts").insert(rows);
        if (error) throw error;
      },
    });

    await markWeekDraft(context.supabase, context.workspaceId, week.id);
    return { rotaWeekId: week.id, shiftCount: nextRows.length };
  });

export const previewCopyPreviousLiveRotaWeekFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => liveWeekInput.parse(input))
  .handler(async ({ data }) => {
    const context = await getLiveContext(data, { createWeek: false });
    const previousWeekStart = addIsoDays(context.weekStart, -7);
    const sourceRows = await loadPreviousWeekSourceRows({ context, previousWeekStart });
    const currentShiftCount = context.week
      ? await context.supabase
          .from("shifts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", context.workspaceId)
          .eq("rota_week_id", context.week.id)
          .then(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
          })
      : 0;

    return buildLiveCopyPreview({
      sourceRows,
      currentShiftCount,
      previousWeekStart,
      targetWeekStart: context.weekStart,
    });
  });
