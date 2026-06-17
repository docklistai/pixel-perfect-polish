import { createServerFn } from "@tanstack/react-start";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { WorkspaceRole } from "../types";

/**
 * Identity for the live manager shell: the real workspace name plus the
 * signed-in manager's email and role. Read-only, workspace-scoped, bound to the
 * caller's session. Any failure (signed out, not a manager, unconfigured)
 * resolves to neutral nulls so the shell falls back to honest placeholders
 * rather than throwing — it never shows another tenant's identity.
 */
export interface ManagerIdentity {
  workspaceName: string | null;
  email: string | null;
  role: WorkspaceRole | null;
}

const NEUTRAL: ManagerIdentity = { workspaceName: null, email: null, role: null };

export const fetchManagerIdentityFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ManagerIdentity> => {
    if (!getSupabaseEnv()) return NEUTRAL;

    try {
      const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
      const { requireActiveManagerWorkspaceId } = await import("./activeManagerWorkspace");
      const supabase = getSupabaseServerClient();

      const workspaceId = await requireActiveManagerWorkspaceId(supabase);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [{ data: workspace }, { data: membership }] = await Promise.all([
        supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
        supabase
          .from("workspace_memberships")
          .select("role")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user?.id ?? "")
          .maybeSingle(),
      ]);

      return {
        workspaceName: (workspace as { name: string } | null)?.name ?? null,
        email: user?.email ?? null,
        role: ((membership as { role: WorkspaceRole } | null)?.role ??
          null) as WorkspaceRole | null,
      };
    } catch {
      return NEUTRAL;
    }
  },
);
