import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { IssuePortalCodeResult } from "../types";

const issueStaffInputSchema = z.object({
  staffMemberId: z.string().uuid(),
});

/**
 * Maps a Postgres error raised by the issue RPCs to an honest, non-leaking
 * manager-facing message. Codes are never validated or generated in the
 * frontend — the database is the sole authority for who may receive a code.
 */
function describeIssueError(sqlState: string | null): string {
  switch (sqlState) {
    case "42501":
      return "You don't have permission to issue access codes for this workspace.";
    case "P0002":
      return "That staff member isn't in this workspace.";
    case "55000":
      return "This staff member can't receive a code yet — they may already have an account, or have no portal membership to bind to. Seed their membership first.";
    default:
      return "We couldn't issue a code. Please try again, or check the staff member with your team.";
  }
}

/**
 * Issues (or rotates) the workspace portal code for the signed-in manager's
 * active workspace. Runs as a server function bound to the caller's session;
 * the active workspace is resolved server-side, never trusted from the client.
 * The plaintext code is returned exactly once — it is a digest-only bearer
 * credential in the database and cannot be retrieved again.
 */
export const issueWorkspacePortalCodeFn = createServerFn({ method: "POST" }).handler(
  async (): Promise<IssuePortalCodeResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();

    let workspaceId: string;
    try {
      workspaceId = await requireActiveManagerWorkspaceId(supabase);
    } catch {
      return { ok: false, message: describeIssueError("42501") };
    }

    const { data, error } = await supabase.rpc("rpc_issue_workspace_portal_code", {
      p_workspace_id: workspaceId,
    });

    if (error || typeof data !== "string") {
      return { ok: false, message: describeIssueError(error?.code ?? null) };
    }
    return { ok: true, code: data };
  },
);

/**
 * Issues a single-use personal portal code for one staff member in the active
 * workspace. The workspace is resolved server-side; the RPC refuses to reissue
 * for a membership already linked to an account. Plaintext is returned once.
 */
export const issueStaffPortalCodeFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => issueStaffInputSchema.parse(input))
  .handler(async ({ data }): Promise<IssuePortalCodeResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();

    let workspaceId: string;
    try {
      workspaceId = await requireActiveManagerWorkspaceId(supabase);
    } catch {
      return { ok: false, message: describeIssueError("42501") };
    }

    const { data: code, error } = await supabase.rpc("rpc_issue_staff_portal_code", {
      p_workspace_id: workspaceId,
      p_staff_member_id: data.staffMemberId,
    });

    if (error || typeof code !== "string") {
      return { ok: false, message: describeIssueError(error?.code ?? null) };
    }
    return { ok: true, code };
  });
