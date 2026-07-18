import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ClaimFailureReason, ClaimPortalAccessResult } from "../types";

const claimInputSchema = z.object({
  workspaceCode: z.string().trim().min(1),
  staffCode: z.string().trim().min(1),
  mode: z.enum(["initial", "recovery"]),
});

type ClaimRpcResult = { ok: boolean; reason?: ClaimFailureReason };

// Raised SQL errors: the RPC only raises for null auth.uid() and empty codes;
// everything else now comes back as a `{ ok:false, reason }` row.
function describeClaimError(sqlState: string | null): string {
  switch (sqlState) {
    case "22023":
      return "Enter both your workspace code and your personal access code.";
    default:
      return "We couldn't match those codes. Check both codes with your manager and try again.";
  }
}

// Non-raising claim outcomes returned by the RPC's jsonb contract.
function describeClaimReason(reason: ClaimFailureReason | null): string {
  switch (reason) {
    case "locked":
      return "Too many attempts on this workspace. Please wait a few minutes and try again.";
    case "expired":
      return "That access code has expired. Ask your manager to issue you a new code.";
    case "claimed":
      return "That access code has already been claimed. Ask your manager to issue you a new code.";
    case "used":
      return "That reset code has already been used. Ask your manager for a new reset code.";
    case "revoked":
    case "superseded":
      return "That reset code is no longer active. Ask your manager for a new reset code.";
    case "inactive":
      return "Your staff access is inactive. Ask your manager to check your staff record.";
    case "anonymous_required":
      return "Use this reset from a signed-out browser or a private window.";
    case "same_identity":
      return "This reset must be completed on the new device or browser that needs access.";
    case "already_member":
      return "You already have access to this workspace. Try signing in instead.";
    default:
      return "We couldn't match those codes. Check both codes with your manager and try again.";
  }
}

/**
 * Claims staff portal access: ensures a real Supabase-authenticated identity
 * (anonymous sign-in if needed), then asks the database to validate the codes
 * and bind the identity. Codes are never validated in the frontend.
 */
export const claimPortalAccessFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => claimInputSchema.parse(input))
  .handler(async ({ data }): Promise<ClaimPortalAccessResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser();

    let createdAnonymousSession = false;
    if (data.mode === "recovery" && existingUser && !existingUser.is_anonymous) {
      return {
        ok: false,
        message: "Use this reset from a signed-out browser or a private window.",
      };
    }

    // Recovery deliberately uses a fresh anonymous identity. Rotating an
    // orphaned anonymous session here also prevents the previous device from
    // consuming its own reset code; the database independently rejects that.
    if (data.mode === "recovery" && existingUser?.is_anonymous) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        const { reportServerError } = await import("@/lib/safe-errors");
        const failure = reportServerError(signOutError, {
          operation: "prepare_staff_portal_recovery_session",
          fallbackMessage: "We couldn't start a secure reset session. Please try again.",
        });
        return { ok: false, ...failure };
      }
    }

    if (!existingUser || data.mode === "recovery") {
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError || !anonData.user) {
        const { reportServerError } = await import("@/lib/safe-errors");
        const failure = reportServerError(anonError ?? new Error("Missing anonymous user"), {
          operation: "start_staff_portal_claim_session",
          fallbackMessage: "We couldn't start a secure session. Please try again.",
        });
        return { ok: false, ...failure };
      }
      createdAnonymousSession = true;
    }

    const { data: rpcData, error } =
      data.mode === "recovery"
        ? await supabase.rpc("rpc_claim_staff_portal_recovery", {
            p_workspace_code: data.workspaceCode,
            p_recovery_code: data.staffCode,
          })
        : await supabase.rpc("rpc_claim_staff_portal_access", {
            p_workspace_code: data.workspaceCode,
            p_staff_code: data.staffCode,
          });

    // A fresh anonymous identity that failed to claim is useless; drop the
    // session so the visitor returns to a clean signed-out state.
    const abandonAnonSession = async () => {
      if (createdAnonymousSession) {
        await supabase.auth.signOut();
      }
    };

    if (error) {
      await abandonAnonSession();
      if (error.code === "22023") {
        return { ok: false, message: describeClaimError(error.code) };
      }
      const { reportServerError } = await import("@/lib/safe-errors");
      const failure = reportServerError(error, {
        operation:
          data.mode === "recovery" ? "claim_staff_portal_recovery" : "claim_staff_portal_access",
        fallbackMessage: describeClaimError(error.code ?? null),
      });
      return { ok: false, ...failure };
    }

    const result = rpcData as ClaimRpcResult | null;
    if (!result || !result.ok) {
      await abandonAnonSession();
      return { ok: false, message: describeClaimReason(result?.reason ?? null) };
    }

    return { ok: true };
  });
