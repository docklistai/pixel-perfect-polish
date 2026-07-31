import { countBySignature, signatureKey, type ShiftSignature } from "./shiftSignature";
import type { StaffSchedulingFact } from "./eligibility";
import type { OpenSlot } from "./buildWeekAssignment";
import type {
  DemandGroup,
  DemandRequirement,
  ExistingShiftFact,
  ProposalWarning,
} from "./buildWeekProposal";

/**
 * Reconciling what the week needs against what it already has.
 *
 * This is counting, not matching. Demand is a multiset of normalized signatures,
 * and a shortfall is `required - existing` per signature — never a row-by-row
 * pairing. That is what lets a venue legitimately need three identical Saturday
 * closes without a rebuild deciding two of them are duplicates.
 *
 * Surplus is reported and never removed: the signature alone cannot tell a
 * deliberate manual addition from an accident, so Build says so and leaves it.
 */

export type DemandReconciliation = {
  /** Slots this proposal would create, in a deterministic order. */
  createdSlots: OpenSlot[];
  /** Every requirement with its shortfall, before the display filter. */
  missingDemand: DemandGroup[];
  /** Unstaffable-role and excess-demand warnings, in that order. */
  warnings: ProposalWarning[];
};

export function reconcileDemand({
  demand,
  existingShifts,
  staff,
}: {
  demand: readonly DemandRequirement[];
  existingShifts: readonly ExistingShiftFact[];
  staff: readonly StaffSchedulingFact[];
}): DemandReconciliation {
  const existingBuckets = countBySignature(existingShifts, (shift) => shift.signature);
  const createdSlots: OpenSlot[] = [];
  const missingDemand: DemandGroup[] = [];
  const warnings: ProposalWarning[] = [];

  const demandByKey = new Map<
    string,
    { signature: ShiftSignature; required: number; roleName: string }
  >();
  for (const requirement of demand) {
    const key = signatureKey(requirement.signature);
    const current = demandByKey.get(key);
    if (current) current.required += requirement.required;
    else
      demandByKey.set(key, {
        signature: requirement.signature,
        required: requirement.required,
        roleName: requirement.roleName,
      });
  }

  for (const [key, requirement] of [...demandByKey.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const existing = existingBuckets.get(key)?.count ?? 0;
    const deficit = Math.max(0, requirement.required - existing);
    missingDemand.push({
      signature: requirement.signature,
      create: deficit,
      existing,
      required: requirement.required,
    });
    for (let index = 0; index < deficit; index += 1) {
      createdSlots.push({
        signature: requirement.signature,
        roleName: requirement.roleName,
        order: `1|${key}|${String(index).padStart(4, "0")}`,
      });
    }
    if (
      !staff.some((member) => member.active && member.roleKey === requirement.signature.roleKey)
    ) {
      warnings.push({
        code: "unstaffable-role",
        message: `No active staff hold the ${requirement.signature.roleKey} role, so these shifts can only be created open.`,
        signature: requirement.signature,
      });
    }
  }

  // Excess existing demand is reported, never removed.
  for (const [key, bucket] of existingBuckets) {
    const required = demandByKey.get(key)?.required ?? 0;
    const surplus = bucket.count - required;
    if (surplus <= 0) continue;
    warnings.push({
      code: "excess-demand",
      message:
        `This week has ${bucket.count} of this shift where the source asks for ${required}. ` +
        `${surplus} extra ${surplus === 1 ? "is" : "are"} kept — Build never removes a shift.`,
      signature: bucket.signature,
    });
  }

  return { createdSlots, missingDemand, warnings };
}
