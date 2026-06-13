import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ClaimPortalAccessResult } from "../types";

const claimInputSchema = z.object({
  workspaceCode: z.string().trim().min(1),
  staffCode: z.string().trim().min(1),
});

function describeClaimError(sqlState: string | null): string {
  switch (sqlState) {
    case "55000":
      return "That access code is already in use or can't be claimed. Ask your manager to issue you a new code.";
    case "22023":
      return "Enter both your workspace code and your personal access code.";
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

    const { error } = await supabase.rpc("rpc_claim_staff_portal_access", {
      p_workspace_code: data.workspaceCode,
      p_staff_code: data.staffCode,
    });

    if (error) {
      // A fresh anonymous identity that failed to claim is useless; drop the
      // session so the visitor returns to a clean signed-out state.
      if (createdAnonymousSession) {
        await supabase.auth.signOut();
      }
      return { ok: false, message: describeClaimError(error.code ?? null) };
    }

    return { ok: true };
  });
