import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Labs feature flags (workspace_settings). Workspace-scoped and owner/manager
 * only: the active manager workspace is resolved server-side from the caller's
 * session and RLS on workspace_settings backs up tenant enforcement, so a staff
 * member has no read or write path here at all.
 *
 * Each experiment is its own typed boolean column — never a jsonb flag bag and
 * never a per-user flag. An ABSENT workspace_settings row means OFF: the row is
 * created lazily on first save, so a workspace that has never opened Settings
 * must read as every-experiment-off rather than as an error or a default-on.
 */

export type WorkspaceLabsFlags = {
  timePulse: boolean;
};

/** Every experiment off. The single source of the default, used when no row exists. */
export const LABS_FLAGS_OFF: WorkspaceLabsFlags = { timePulse: false };

interface LabsRow {
  labs_time_pulse_enabled: boolean;
}

const LABS_COLUMNS = "labs_time_pulse_enabled";

function mapLabs(row: LabsRow): WorkspaceLabsFlags {
  return { timePulse: row.labs_time_pulse_enabled };
}

export const fetchWorkspaceLabsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkspaceLabsFlags> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("workspace_settings")
      .select(LABS_COLUMNS)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;

    // No settings row yet — the workspace has never saved settings, which is
    // not an error and must read as every experiment off.
    return data ? mapLabs(data as LabsRow) : LABS_FLAGS_OFF;
  },
);

const saveLabsInput = z.object({
  timePulse: z.boolean(),
});

export type SaveWorkspaceLabsInput = z.infer<typeof saveLabsInput>;

/**
 * Upserts the flags. Only Labs columns are written, so saving an experiment
 * never disturbs the labour-planning values stored on the same row.
 */
export const saveWorkspaceLabsFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveLabsInput.parse(input))
  .handler(async ({ data }): Promise<WorkspaceLabsFlags> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data: saved, error } = await supabase
      .from("workspace_settings")
      .upsert(
        { workspace_id: workspaceId, labs_time_pulse_enabled: data.timePulse },
        { onConflict: "workspace_id" },
      )
      .select(LABS_COLUMNS)
      .single();
    if (error) throw error;

    return mapLabs(saved as LabsRow);
  });
