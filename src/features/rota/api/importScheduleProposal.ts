import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  importHeadedSchedule,
  type HeadedScheduleImportResult,
} from "@/features/scheduling/parsing/headedScheduleImport";
import { signatureKey } from "../lib/scheduling/shiftSignature";
import { PLANNER_RULE_VERSION, type ProposalOperation } from "../lib/scheduling/buildWeekProposal";
import { addIsoDays } from "../lib/liveRotaDates";
import { loadImportFacts } from "./importScheduleFacts";
import type { BuildWeekApplySource } from "./buildWeekApplySource";

/**
 * Turns a pasted headed schedule into a reviewable proposal.
 *
 * Deliberately produces the **same operation list** Build the Week produces, so
 * an import is applied by the same atomic RPC, validated the same way, and
 * audited the same way. A second write path would be a second set of rules to
 * keep in step; there is only one.
 *
 * The week does not have to exist. Importing onto a fresh week is the most
 * common moment to import at all, so a missing week is previewed against its own
 * absence: the proposal is stamped over (location, week start, "no week"), and
 * the apply creates the week and the shifts in one transaction or neither.
 *
 * Read-only. Nothing here writes, and every source row comes back in the preview
 * whether or not it can be imported.
 */

const inputSchema = z.object({
  weekOffset: z.number().int().min(-260).max(260),
  locationId: z.string().uuid().optional(),
  text: z.string().min(1).max(200_000),
  dateOrder: z.enum(["iso", "day-first", "month-first"]),
});

export type ImportScheduleResult =
  | {
      ok: true;
      /** Null when the week does not exist yet and applying will create it. */
      rotaWeekId: string | null;
      /** Both are echoed to apply so a fresh week is created at the right place. */
      locationId: string;
      weekStart: string;
      inputFingerprint: string;
      proposalDigest: string;
      /** Echoed back to apply unchanged; the fingerprint covers it. */
      applySource: BuildWeekApplySource;
      operations: ProposalOperation[];
      preview: HeadedScheduleImportResult;
    }
  | { ok: false; message: string; preview?: HeadedScheduleImportResult };

export const importScheduleProposalFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ImportScheduleResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { getLiveContext } = await import("./rotaLiveMutationContext");
    const supabase = getSupabaseServerClient();

    const context = await getLiveContext(
      { weekOffset: data.weekOffset, ...(data.locationId ? { locationId: data.locationId } : {}) },
      { createWeek: false },
    );
    // A published or archived week is refused; a missing one is not. Creating it
    // is part of what applying this proposal does.
    if (context.week && context.week.status !== "draft") {
      return {
        ok: false,
        message:
          context.week.status === "archived"
            ? "This week is archived, so nothing can be imported into it."
            : "This week is published. Move it back to draft before importing into it.",
      };
    }

    const weekIsoDates = Array.from({ length: 7 }, (_, index) =>
      addIsoDays(context.weekStart, index),
    );

    const facts = await loadImportFacts({
      supabase,
      workspaceId: context.workspaceId,
      rotaWeekId: context.week?.id ?? null,
      timezone: context.location.timezone,
    });
    if (!facts.defaultDepartmentId) {
      return { ok: false, message: "Add a department to this workspace before importing shifts." };
    }

    const preview = importHeadedSchedule(data.text, {
      dateOrder: data.dateOrder,
      weekIsoDates,
      locationId: context.location.id,
      staff: facts.staff,
      departments: facts.departments,
      defaultDepartmentId: facts.defaultDepartmentId,
      existingSignatureKeys: facts.existingSignatureKeys,
      knownRoleNames: facts.knownRoleNames,
    });

    if (!preview.ok) {
      return {
        ok: false,
        message: previewRefusalMessage(preview),
        preview,
      };
    }

    // Imported rows become the same operation kinds Build produces. The sort is
    // for a stable digest between preview and apply, not for lock safety: since
    // phase 48 the apply derives its own canonical lock order from the parsed
    // operations rather than trusting the order they arrive in.
    const operations: ProposalOperation[] = preview.rows
      .filter((row) => row.ok && row.shift)
      .map((row) =>
        row.shift!.staffId === null
          ? {
              kind: "create-open" as const,
              signature: row.shift!.signature,
              roleName: row.shift!.roleName,
              reason: `Imported from row ${row.row}`,
            }
          : {
              kind: "create-assigned" as const,
              signature: row.shift!.signature,
              roleName: row.shift!.roleName,
              staffId: row.shift!.staffId,
              reason: `Imported from row ${row.row}`,
            },
      )
      .sort((a, b) => {
        const staffA = a.kind === "create-assigned" ? a.staffId : "";
        const staffB = b.kind === "create-assigned" ? b.staffId : "";
        if (staffA !== staffB) return staffA < staffB ? -1 : 1;
        return signatureKey(a.signature) < signatureKey(b.signature) ? -1 : 1;
      });

    const applySource: BuildWeekApplySource = {
      kind: "headed-import",
      id: null,
      contentVersion: `rows:${operations.length}`,
      plannerRuleVersion: PLANNER_RULE_VERSION,
    };

    // Two stamps, one contract. An existing week is fingerprinted by its row;
    // a missing one by its absence, which is what makes a week appearing before
    // apply a refusal rather than a silent merge into somebody else's draft.
    // Both keep the internals revoked behind a manager-guarded wrapper.
    const stamp = context.week
      ? await supabase.rpc("rpc_build_week_proposal_stamp", {
          p_workspace_id: context.workspaceId,
          p_rota_week_id: context.week.id,
          p_source: applySource,
          p_operations: operations,
        })
      : await supabase.rpc("rpc_import_schedule_proposal_stamp", {
          p_workspace_id: context.workspaceId,
          p_location_id: context.location.id,
          p_week_start: context.weekStart,
          p_source: applySource,
          p_operations: operations,
        });
    if (stamp.error) {
      const { toSafeBusinessMessage } = await import("@/lib/safe-errors");
      return {
        ok: false,
        message: toSafeBusinessMessage(
          stamp.error,
          "This week could not be prepared for import. Reopen the week and preview again.",
        ),
        preview,
      };
    }
    const { fingerprint, digest } = stamp.data as { fingerprint: string; digest: string };

    return {
      ok: true,
      rotaWeekId: context.week?.id ?? null,
      locationId: context.location.id,
      weekStart: context.weekStart,
      inputFingerprint: fingerprint,
      proposalDigest: digest,
      applySource,
      operations,
      preview,
    };
  });

/**
 * Why a parsed paste cannot be imported, in the manager's terms.
 *
 * A refusal always says what happens to the rows that *were* readable, because
 * "3 of 40 rows are wrong" and "nothing can be imported" are very different
 * situations and the old message could not tell them apart.
 */
function previewRefusalMessage(preview: HeadedScheduleImportResult): string {
  const blocking = preview.diagnostics.find((entry) => entry.severity === "error");
  if (blocking) return blocking.message;
  if (preview.validCount === 0 && preview.errorCount > 0) {
    return `None of the ${preview.errorCount} rows in that paste could be read. Each row below says why.`;
  }
  return "Nothing in that paste could be imported.";
}
