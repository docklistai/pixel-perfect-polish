import { teamRpcError, type TeamJsonObject, type TeamMutationResult } from "./teamRpcResult";

/**
 * Single call path for every Team write. The workspace is resolved on the
 * server from the caller's active manager membership and appended here, so no
 * caller — including our own components — can name a workspace it does not own.
 */
export async function callTeamRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<TeamMutationResult> {
  const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
  const { requireActiveManagerWorkspaceId } =
    await import("@/features/auth/api/activeManagerWorkspace");
  const supabase = getSupabaseServerClient();
  let workspaceId: string;
  try {
    workspaceId = await requireActiveManagerWorkspaceId(supabase);
  } catch {
    return { ok: false, message: teamRpcError({ code: "42501" }) };
  }
  const { data, error } = await supabase.rpc(name, { ...args, p_workspace_id: workspaceId });
  if (error) return { ok: false, message: teamRpcError(error) };
  return { ok: true, data: (data ?? {}) as TeamJsonObject };
}
