import { createServerFn } from "@tanstack/react-start";
import { toSafeBusinessMessage } from "@/lib/safe-errors";
import { addIsoDays } from "../lib/liveRotaDates";
import { getLiveContext } from "./rotaLiveMutationContext";
import { liveWeekInput } from "./rotaLiveMutationSchemas";
import { buildLiveCopyPreview, type LiveCopySourceShiftRow } from "./copyPreviousLiveRotaWeek";

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

  const { data: latestSnapshot, error: snapshotError } = await context.supabase
    .from("published_rota_snapshots")
    .select("id")
    .eq("workspace_id", context.workspaceId)
    .eq("rota_week_id", (previousWeek as { id: string }).id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshotError) throw snapshotError;
  if (!latestSnapshot) {
    throw new Error(
      "Previous week has no published rota to copy. Only published rotas can be copied.",
    );
  }

  const { data: previousShifts, error: shiftsError } = await context.supabase
    .from("published_rota_shifts")
    .select(
      "location_id, department_id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status",
    )
    .eq("workspace_id", context.workspaceId)
    .eq("snapshot_id", (latestSnapshot as { id: string }).id)
    .order("shift_date", { ascending: true })
    .order("starts_at", { ascending: true });
  if (shiftsError) throw shiftsError;
  const rows = ((previousShifts as LiveCopySourceShiftRow[] | null) ?? []).filter(Boolean);
  if (rows.length === 0) {
    throw new Error("Previous week published rota has no shifts to copy.");
  }
  return rows;
}

/**
 * Copy the previous week's rota into the requested week through one atomic,
 * workspace-authorised database transaction (`rpc_copy_previous_rota_week`).
 * The database either applies the whole copy or leaves the existing draft
 * untouched — there is no client-side delete/insert/restore choreography.
 */
export const copyPreviousLiveRotaWeekFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => liveWeekInput.parse(input))
  .handler(async ({ data }) => {
    const context = await getLiveContext(data, { createWeek: false });

    const { data: result, error } = await context.supabase.rpc("rpc_copy_previous_rota_week", {
      p_workspace_id: context.workspaceId,
      p_location_id: context.location.id,
      p_target_week_start: context.weekStart,
    });

    if (error) {
      throw new Error(
        toSafeBusinessMessage(error, "Previous week was not copied. Your draft is unchanged."),
      );
    }

    const copyResult = result as { rota_week_id: string; shifts_created: number };
    return { rotaWeekId: copyResult.rota_week_id, shiftCount: copyResult.shifts_created };
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
