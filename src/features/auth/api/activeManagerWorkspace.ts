import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceRole } from "../types";

const ACTIVE_WORKSPACE_COOKIE = "docklist.workspace_id";

/**
 * Resolves the active owner/manager workspace from the authenticated session.
 * Client-supplied workspace ids are never used as the authority for live reads.
 */
export async function requireActiveManagerWorkspaceId(supabase: SupabaseClient): Promise<string> {
  const { getCookies } = await import("@tanstack/react-start/server");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Manager authentication required");

  const { data: memberships, error } = await supabase
    .from("workspace_memberships")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) throw error;

  const activeMemberships = (memberships as { workspace_id: string; role: WorkspaceRole }[]) ?? [];
  const explicitWorkspaceId = getCookies()[ACTIVE_WORKSPACE_COOKIE] ?? null;
  const activeMembership =
    (explicitWorkspaceId &&
      activeMemberships.find((membership) => membership.workspace_id === explicitWorkspaceId)) ||
    (activeMemberships.length === 1 ? activeMemberships[0] : null);

  if (
    !activeMembership ||
    (activeMembership.role !== "owner" && activeMembership.role !== "manager")
  ) {
    throw new Error("Active manager workspace required");
  }
  return activeMembership.workspace_id;
}
