import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  describePortalCodeIssueError,
  describePortalRecoveryIssueError,
} from "../lib/issuePortalCode";
import type { IssuePortalCodeResult } from "../types";

const issueStaffInputSchema = z.object({
  staffMemberId: z.string().uuid(),
});

const resetStaffAccessInputSchema = issueStaffInputSchema.extend({
  reason: z.string().trim().min(1).max(500),
});

const EXPECTED_PORTAL_CODE_STATES = new Set(["22023", "42501", "P0002", "55000"]);

function sqlState(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

async function safeIssueFailure(
  error: unknown,
  operation: string,
  describe: (state: string | null) => string,
): Promise<IssuePortalCodeResult> {
  const state = sqlState(error);
  const message = describe(state);
  if (state && EXPECTED_PORTAL_CODE_STATES.has(state)) return { ok: false, message };
  const { reportServerError } = await import("@/lib/safe-errors");
  const reported = reportServerError(error ?? new Error("Invalid portal-code response"), {
    operation,
    fallbackMessage: message,
  });
  return { ok: false, ...reported };
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
      return { ok: false, message: describePortalCodeIssueError("42501") };
    }

    const { data, error } = await supabase.rpc("rpc_issue_workspace_portal_code", {
      p_workspace_id: workspaceId,
    });

    if (error || typeof data !== "string")
      return safeIssueFailure(error, "issue_workspace_portal_code", describePortalCodeIssueError);
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
      return { ok: false, message: describePortalCodeIssueError("42501") };
    }

    const { data: code, error } = await supabase.rpc("rpc_issue_staff_portal_code", {
      p_workspace_id: workspaceId,
      p_staff_member_id: data.staffMemberId,
    });

    if (error || typeof code !== "string")
      return safeIssueFailure(error, "issue_staff_portal_code", describePortalCodeIssueError);
    return { ok: true, code };
  });

/**
 * Issues a reveal-once recovery code for an already-claimed active staff
 * membership. The database records the manager, reason, expiry and prior
 * identity reference, and supersedes earlier access material transactionally.
 */
export const resetStaffPortalAccessFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resetStaffAccessInputSchema.parse(input))
  .handler(async ({ data }): Promise<IssuePortalCodeResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();

    let workspaceId: string;
    try {
      workspaceId = await requireActiveManagerWorkspaceId(supabase);
    } catch {
      return { ok: false, message: describePortalRecoveryIssueError("42501") };
    }

    const { data: code, error } = await supabase.rpc("rpc_issue_staff_portal_recovery_code", {
      p_workspace_id: workspaceId,
      p_staff_member_id: data.staffMemberId,
      p_reason: data.reason,
    });

    if (error || typeof code !== "string")
      return safeIssueFailure(
        error,
        "issue_staff_portal_recovery_code",
        describePortalRecoveryIssueError,
      );
    return { ok: true, code };
  });
