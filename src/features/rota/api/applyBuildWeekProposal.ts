import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toSafeBusinessMessage } from "@/lib/safe-errors";

/**
 * Applies one reviewed Build the Week proposal through `rpc_apply_build_week_proposal`.
 *
 * The proposal is passed back exactly as it was issued. This function adds
 * nothing to it and re-plans nothing — the database validates the fingerprint,
 * the digest and every operation, then applies all of them or none.
 *
 * Refusals arrive as SQLSTATE 55000 with hand-authored text, which
 * `toSafeBusinessMessage` passes through verbatim. That is the whole reason the
 * RPC never raises 40001 for a deliberate refusal: PostgREST retries 40001 to a
 * gateway timeout, and its message is replaced with generic copy on the way back.
 */

const applySchema = z.object({
  rotaWeekId: z.string().uuid(),
  inputFingerprint: z.string().min(1).max(64),
  proposalDigest: z.string().min(1).max(64),
  // Passed back byte-for-byte from the proposal. The RPC folds this into the
  // input fingerprint, so any field the client reassembles rather than echoes
  // turns a valid proposal into a staleness refusal.
  //
  // "headed-import" reuses this apply path deliberately: an imported schedule
  // produces the same operation kinds and is validated by the same RPC, so
  // there is one write contract rather than two sets of rules to keep in step.
  source: z.object({
    kind: z.enum(["template", "previous-week-pattern", "current-week", "headed-import"]),
    id: z.string().nullable(),
    contentVersion: z.string(),
    plannerRuleVersion: z.string(),
  }),
  // Passed straight through. The digest is what proves it was not altered, so
  // re-validating its shape here would add nothing the database does not do.
  operations: z.array(z.unknown()).min(1).max(500),
});

/** What a caller must hand back to apply a proposal it was issued. */
export type ApplyBuildWeekProposalInput = z.infer<typeof applySchema>;

export type ApplyBuildWeekResult =
  | {
      ok: true;
      createdOpen: number;
      createdAssigned: number;
      assignedExisting: number;
      operations: number;
    }
  | { ok: false; message: string };

export const applyBuildWeekProposalFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => applySchema.parse(input))
  .handler(async ({ data }): Promise<ApplyBuildWeekResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data: result, error } = await supabase.rpc("rpc_apply_build_week_proposal", {
      p_workspace_id: workspaceId,
      p_rota_week_id: data.rotaWeekId,
      p_input_fingerprint: data.inputFingerprint,
      p_proposal_digest: data.proposalDigest,
      p_source: data.source,
      p_operations: data.operations,
    });

    if (error) {
      return {
        ok: false,
        message: toSafeBusinessMessage(
          error,
          "This week was not built. Nothing was applied — try again.",
        ),
      };
    }

    const applied = result as {
      created_open?: number;
      created_assigned?: number;
      assigned_existing?: number;
      operations?: number;
    } | null;

    return {
      ok: true,
      createdOpen: applied?.created_open ?? 0,
      createdAssigned: applied?.created_assigned ?? 0,
      assignedExisting: applied?.assigned_existing ?? 0,
      operations: applied?.operations ?? 0,
    };
  });
