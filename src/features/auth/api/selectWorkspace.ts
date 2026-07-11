import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ACTIVE_WORKSPACE_COOKIE = "docklist.workspace_id";

const selectWorkspaceInput = z.object({ workspaceId: z.string().uuid() });

export type SelectWorkspaceResult = { ok: true } | { ok: false; message: string };

/**
 * Resolves the workspace-selection-required state: verifies the caller has an
 * active membership in the requested workspace before pinning it in the
 * active-workspace cookie. The membership check runs server-side against the
 * session user — the browser's claim is never trusted on its own.
 */
export const selectActiveWorkspaceFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => selectWorkspaceInput.parse(input))
  .handler(async ({ data }): Promise<SelectWorkspaceResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { setCookie } = await import("@tanstack/react-start/server");
    const supabase = getSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, message: "Your session has expired. Please sign in again." };
    }

    const { data: membership, error } = await supabase
      .from("workspace_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("workspace_id", data.workspaceId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !membership) {
      return {
        ok: false,
        message: "You don't have active access to that workspace. Pick another or sign out.",
      };
    }

    setCookie(ACTIVE_WORKSPACE_COOKIE, data.workspaceId, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 365,
    });

    return { ok: true };
  });
