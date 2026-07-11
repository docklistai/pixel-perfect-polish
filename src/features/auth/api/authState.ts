import { createServerFn } from "@tanstack/react-start";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { AuthState, WorkspaceRole } from "../types";

/** Cookie naming the caller's active workspace when they belong to several. */
const ACTIVE_WORKSPACE_COOKIE = "docklist.workspace_id";

/**
 * Resolves the caller's auth + membership state from the session cookie.
 * Membership is looked up by user_id explicitly — manager RLS exposes every
 * membership in the workspace, so relying on RLS alone would be wrong here.
 *
 * With several active memberships we never default to one arbitrarily (e.g. the
 * oldest): we honour an explicit `docklist.workspace_id` cookie, fall back to
 * the sole membership when there is only one, and otherwise return a safe
 * `workspace-selection-required` state so role and tenant scoping stay explicit.
 *
 * The server modules are imported dynamically: they touch request cookies via
 * `@tanstack/react-start/server`, which must stay out of the client bundle.
 */
export const fetchAuthStateFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthState> => {
    if (!getSupabaseEnv()) return { status: "signed-out" };

    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { getCookies } = await import("@tanstack/react-start/server");
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "signed-out" };

    const { data: memberships } = await supabase
      .from("workspace_memberships")
      .select("id, workspace_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active");

    const activeMemberships = memberships ?? [];
    if (activeMemberships.length === 0) {
      return { status: "no-workspace", userId: user.id, email: user.email ?? null };
    }

    const explicitWorkspaceId = getCookies()[ACTIVE_WORKSPACE_COOKIE] ?? null;
    const membership =
      (explicitWorkspaceId &&
        activeMemberships.find((m) => m.workspace_id === explicitWorkspaceId)) ||
      (activeMemberships.length === 1 ? activeMemberships[0] : null);

    if (!membership) {
      // Names let the selection screen show real venues instead of ids. The
      // read stays scoped to the caller's own membership workspace ids.
      const { data: workspaceRows } = await supabase
        .from("workspaces")
        .select("id, name")
        .in(
          "id",
          activeMemberships.map((m) => m.workspace_id),
        );
      const nameById = new Map(
        (workspaceRows ?? []).map((row) => [row.id as string, row.name as string]),
      );
      return {
        status: "workspace-selection-required",
        userId: user.id,
        email: user.email ?? null,
        workspaces: activeMemberships.map((m) => ({
          workspaceId: m.workspace_id,
          name: nameById.get(m.workspace_id) ?? null,
          role: m.role as WorkspaceRole,
        })),
      };
    }

    const role = membership.role as WorkspaceRole;
    let staffMemberId: string | null = null;

    if (role === "staff") {
      const { data: staff } = await supabase
        .from("staff_members")
        .select("id")
        .eq("workspace_id", membership.workspace_id)
        .eq("membership_id", membership.id)
        .maybeSingle();
      staffMemberId = staff?.id ?? null;
      if (!staffMemberId) {
        return {
          status: "no-staff-profile",
          userId: user.id,
          email: user.email ?? null,
          workspaceId: membership.workspace_id,
          membershipId: membership.id,
        };
      }
    }

    return {
      status: "member",
      userId: user.id,
      email: user.email ?? null,
      workspaceId: membership.workspace_id,
      membershipId: membership.id,
      role,
      staffMemberId,
    };
  },
);
