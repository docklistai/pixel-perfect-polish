import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { planBuildWeek } from "../lib/scheduling/buildWeekPlanner";
import {
  PLANNER_RULE_VERSION,
  type BuildWeekProposalBody,
} from "../lib/scheduling/buildWeekProposal";
import { addIsoDays } from "../lib/liveRotaDates";
import {
  SHIFT_COLUMNS,
  STAFF_COLUMNS,
  toExistingFact,
  toStaffFact,
  type ShiftRow,
  type StaffRow,
} from "./buildWeekFacts";
import { loadAvailabilityFacts, loadExternalCommitments } from "./buildWeekAvailability";
import { resolveDemand } from "./buildWeekDemandResolution";
import type { BuildWeekApplySource } from "./buildWeekApplySource";

/**
 * Builds one Build the Week proposal. Read-only: nothing here writes.
 *
 * The planner runs **here**, server-side, and never on the client. That is what
 * makes preview and apply the same object rather than two computations that
 * could drift: the browser receives a finished proposal and hands it back
 * untouched.
 *
 * The fingerprint is obtained from the database, not computed in TypeScript, so
 * there is exactly one implementation of it and no cross-language
 * canonicalisation to keep in step.
 */

const inputSchema = z.object({
  weekOffset: z.number().int().min(-260).max(260),
  locationId: z.string().uuid().optional(),
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("template"), templateId: z.string().uuid() }),
    z.object({ kind: z.literal("previous-week-pattern") }),
    z.object({ kind: z.literal("current-week") }),
  ]),
});

export type BuildWeekProposalResult =
  | {
      ok: true;
      rotaWeekId: string;
      weekStart: string;
      locationId: string;
      inputFingerprint: string;
      proposalDigest: string;
      plannerRuleVersion: string;
      source: { kind: string; id?: string; label: string };
      /**
       * The exact source object the fingerprint was stamped over.
       *
       * Apply must send this back byte-for-byte: the fingerprint covers
       * `p_source`, so a client that rebuilds it from parts — or omits
       * `contentVersion` — recomputes a different fingerprint and the RPC
       * refuses the apply as stale.
       */
      applySource: BuildWeekApplySource;
      proposal: BuildWeekProposalBody;
    }
  | { ok: false; message: string };

export const buildWeekProposalFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<BuildWeekProposalResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { getLiveContext } = await import("./rotaLiveMutationContext");
    const supabase = getSupabaseServerClient();

    const context = await getLiveContext(
      { weekOffset: data.weekOffset, ...(data.locationId ? { locationId: data.locationId } : {}) },
      { createWeek: false },
    );
    if (!context.week) {
      return {
        ok: false,
        message: "Save at least one shift, or apply a template, before building this week.",
      };
    }
    const week = context.week;
    if (week.status !== "draft") {
      return {
        ok: false,
        message: "Build only runs on a draft week. Edit this published week directly.",
      };
    }

    const timezone = context.location.timezone;
    const dayIsoDates = Array.from({ length: 7 }, (_, index) =>
      addIsoDays(context.weekStart, index),
    );

    const [shiftsRes, staffRes] = await Promise.all([
      supabase
        .from("shifts")
        .select(SHIFT_COLUMNS)
        .eq("workspace_id", context.workspaceId)
        .eq("rota_week_id", week.id)
        .order("id", { ascending: true }),
      supabase
        .from("staff_members")
        .select(STAFF_COLUMNS)
        .eq("workspace_id", context.workspaceId)
        .order("id", { ascending: true }),
    ]);
    if (shiftsRes.error) throw shiftsRes.error;
    if (staffRes.error) throw staffRes.error;

    const existingRows = (shiftsRes.data as ShiftRow[] | null) ?? [];
    const existingShifts = existingRows.map((row) => toExistingFact(row, timezone));
    const staff = ((staffRes.data as StaffRow[] | null) ?? []).map(toStaffFact);

    const [availability, externalCommitments] = await Promise.all([
      loadAvailabilityFacts(supabase, context.workspaceId, context.weekStart, dayIsoDates),
      loadExternalCommitments(supabase, context.workspaceId, week.id, context.weekStart, timezone),
    ]);

    const built = await resolveDemand({
      supabase,
      workspaceId: context.workspaceId,
      source: data.source,
      dayIsoDates,
      locationId: context.location.id,
      weekStart: context.weekStart,
      existingShifts,
      existingRows,
      timezone,
    });
    if (!built.ok) return built;

    const proposal = planBuildWeek({
      dayIsoDates,
      locationId: context.location.id,
      source: built.source,
      demand: built.demand,
      existingShifts,
      staff,
      availability,
      externalCommitments,
    });

    // Both the fingerprint and the digest come from the database, so the apply
    // RPC re-derives them with the same code rather than a parallel one.
    const applySource: BuildWeekApplySource = {
      kind: built.source.kind,
      id: built.source.id ?? null,
      contentVersion: built.contentVersion,
      plannerRuleVersion: PLANNER_RULE_VERSION,
    };
    // One manager-guarded call. The internal fingerprint/digest functions are
    // revoked from `authenticated` on purpose: the fingerprint reads across a
    // whole workspace and takes the workspace id as a parameter, so exposing it
    // directly would let any signed-in user probe another workspace.
    const { data: stamp, error: stampError } = await supabase.rpc("rpc_build_week_proposal_stamp", {
      p_workspace_id: context.workspaceId,
      p_rota_week_id: week.id,
      p_source: applySource,
      p_operations: proposal.operations,
    });
    if (stampError) throw stampError;
    const { fingerprint, digest } = stamp as { fingerprint: string; digest: string };

    return {
      ok: true,
      rotaWeekId: week.id,
      weekStart: context.weekStart,
      locationId: context.location.id,
      inputFingerprint: fingerprint,
      proposalDigest: digest,
      plannerRuleVersion: PLANNER_RULE_VERSION,
      source: built.source,
      applySource,
      proposal,
    };
  });
