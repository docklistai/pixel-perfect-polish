import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ClaimFailureReason, ClaimPortalAccessResult } from "../types";

const claimInputSchema = z.object({
  workspaceCode: z.string().trim().min(1),
  staffCode: z.string().trim().min(1),
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
    if (!existingUser) {
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError || !anonData.user) {
        return { ok: false, message: "We couldn't start a secure session. Please try again." };
      }
      createdAnonymousSession = true;
    }

    const { data: rpcData, error } = await supabase.rpc("rpc_claim_staff_portal_access", {
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
      return { ok: false, message: describeClaimError(error.code ?? null) };
    }

    const result = rpcData as ClaimRpcResult | null;
    if (!result || !result.ok) {
      await abandonAnonSession();
      return { ok: false, message: describeClaimReason(result?.reason ?? null) };
    }

    return { ok: true };
  });
