import { compareSignatures, signatureKey } from "./shiftSignature";
import { describeExclusionCounts } from "./eligibility";
import { chooseCandidate, committedFrom, timesOf, type OpenSlot } from "./buildWeekAssignment";
import { reconcileDemand } from "./buildWeekDemandReconciliation";
import { existingAssignmentClashWarnings, preservedSummary } from "./buildWeekPreservation";
import { sortOperations } from "./buildWeekOperationOrder";
import {
  PLANNER_RULE_VERSION,
  type BuildWeekPlannerInput,
  type BuildWeekProposalBody,
  type ProposalOperation,
  type ProposedAssignment,
  type UnresolvedOpenShift,
} from "./buildWeekProposal";

/**
 * The one pure deterministic planner.
 *
 * No clock, no network, no randomness. The same inputs always produce a
 * byte-identical proposal, which is what lets the server issue a fingerprint over
 * the inputs and trust that the operations the manager reviewed are the only ones
 * that could have been produced from them.
 *
 * Reconciliation is by **counted normalized signature**, never by matching rows
 * to each other. A venue that legitimately needs three identical Saturday closes
 * gets three, and a rebuild does not treat two of them as duplicates to remove.
 *
 * What this never does, by construction rather than by rule:
 * - delete a shift (no operation kind can express it);
 * - alter an assigned shift (likewise);
 * - remove excess demand (excess becomes a warning).
 *
 * This file is the *shape* of a build. The pieces it orchestrates each own one
 * decision: `buildWeekDemandReconciliation` counts what is missing,
 * `buildWeekAssignment` chooses who takes a slot, `buildWeekPreservation` says
 * what was left alone, and `buildWeekOperationOrder` fixes the emit order — which
 * is a database lock-protocol constraint, not a presentation choice.
 */
export function planBuildWeek(input: BuildWeekPlannerInput): BuildWeekProposalBody {
  const operations: ProposalOperation[] = [];
  const unresolvedOpen: UnresolvedOpenShift[] = [];
  const proposedAssignments: ProposedAssignment[] = [];
  const externalCommitments = input.externalCommitments ?? [];
  const staffById = new Map(input.staff.map((member) => [member.id, member]));

  const demand = reconcileDemand({
    demand: input.demand,
    existingShifts: input.existingShifts,
    staff: input.staff,
  });

  // Existing open shifts are assignment candidates whether or not they match a
  // demand bucket: filling the week is the point.
  const existingOpenSlots: OpenSlot[] = input.existingShifts
    .filter((shift) => shift.staffId === null)
    .map((shift) => ({
      signature: shift.signature,
      roleName: shift.signature.roleKey,
      shiftId: shift.id,
      order: `0|${signatureKey(shift.signature)}|${shift.id}`,
    }));

  // Assignment pass, in a total order so the result never depends on input
  // sequence. Existing shifts are offered before created ones.
  const committed = committedFrom(input.existingShifts);
  const slots = [...existingOpenSlots, ...demand.createdSlots].sort((a, b) =>
    a.order < b.order ? -1 : a.order > b.order ? 1 : 0,
  );

  for (const slot of slots) {
    const outcome = chooseCandidate({
      slot,
      staff: input.staff,
      committed,
      externalCommitments,
      availability: input.availability,
    });
    const isExisting = slot.shiftId !== undefined;

    if ("staff" in outcome) {
      const member = outcome.staff;
      const reason = "Holds the role, and is free of leave, availability blocks and other shifts.";
      if (isExisting) {
        operations.push({
          kind: "assign-open",
          shiftId: slot.shiftId!,
          staffId: member.id,
          expected: slot.signature,
          reason,
        });
      } else {
        operations.push({
          kind: "create-assigned",
          signature: slot.signature,
          roleName: slot.roleName,
          staffId: member.id,
          reason,
        });
      }
      proposedAssignments.push({
        staffId: member.id,
        staffName: member.name,
        signature: slot.signature,
        ...(slot.shiftId !== undefined ? { shiftId: slot.shiftId } : {}),
        reason,
      });
      // The person is now busy for the rest of this pass, exactly as if they had
      // been rostered by hand.
      committed.push({
        shiftId: slot.shiftId ?? `planned:${slot.order}`,
        staffId: member.id,
        times: timesOf(slot.signature),
      });
      continue;
    }

    if (!isExisting) {
      operations.push({
        kind: "create-open",
        signature: slot.signature,
        roleName: slot.roleName,
        reason: "Demand this week does not cover; nobody eligible is free.",
      });
    }
    unresolvedOpen.push({
      signature: slot.signature,
      ...(slot.shiftId !== undefined ? { shiftId: slot.shiftId } : {}),
      reason: describeExclusionCounts(
        slot.signature.roleKey,
        outcome.roleHolders,
        outcome.exclusions,
      ),
      exclusions: [...outcome.exclusions.entries()]
        .map(([kind, count]) => ({ kind, count }))
        .sort((a, b) => (a.kind < b.kind ? -1 : 1)),
    });
  }

  return {
    operations: sortOperations(operations),
    sections: {
      missingDemand: demand.missingDemand
        .filter((group) => group.create > 0)
        .sort((a, b) => compareSignatures(a.signature, b.signature)),
      proposedAssignments,
      preserved: preservedSummary(
        input.existingShifts,
        operations.filter((op) => op.kind === "assign-open").length,
      ),
      unresolvedOpen,
    },
    warnings: [
      ...demand.warnings,
      ...existingAssignmentClashWarnings(input.existingShifts, staffById, input.availability),
    ],
    explanations: [
      "Demand is matched by shift shape and counted, so identical shifts stay possible.",
      "Existing shifts are never removed or reassigned — only genuinely missing demand is created.",
      "Assignment needs an exact role match, and skips approved or pending leave, recurring days off, marked unavailability and any overlapping shift.",
      "Contracted hours and department are used only to choose between people who are all eligible.",
      `Planner rules: ${PLANNER_RULE_VERSION}. Nothing is published — this stays a draft.`,
    ],
  };
}
