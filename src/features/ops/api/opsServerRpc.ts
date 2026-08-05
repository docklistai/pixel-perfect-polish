import { opsRpcError, type OpsJsonObject, type OpsMutationResult } from "./opsRpcResult";

export async function callOpsRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<OpsMutationResult> {
  const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
  const { requireActiveManagerWorkspaceId } =
    await import("@/features/auth/api/activeManagerWorkspace");
  const supabase = getSupabaseServerClient();
  let workspaceId: string;
  try {
    workspaceId = await requireActiveManagerWorkspaceId(supabase);
  } catch {
    return { ok: false, message: opsRpcError({ code: "42501" }) };
  }
  const { data, error } = await supabase.rpc(name, { ...args, p_workspace_id: workspaceId });
  if (error) return { ok: false, message: opsRpcError(error) };
  return { ok: true, data: (data ?? {}) as OpsJsonObject };
}
