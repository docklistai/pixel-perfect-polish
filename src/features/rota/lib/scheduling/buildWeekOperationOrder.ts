import { signatureKey } from "./shiftSignature";
import type { ProposalOperation } from "./buildWeekProposal";

/**
 * Apply order: existing-shift assignments first, then creations, each by staff id
 * ascending with unassigned first.
 *
 * The staff ordering is not cosmetic. The database takes a per-staff eligibility
 * lock on any write that assigns somebody (phase 31), and every multi-person
 * writer acquires those locks in ascending staff order. Emitting operations in
 * that order is what keeps this apply inside the existing deadlock-free protocol.
 *
 * It lives in its own file for the same reason: this is a database-protocol
 * constraint, not a presentation choice, and it must not be reordered by someone
 * tidying the planner.
 */
export function sortOperations(operations: readonly ProposalOperation[]): ProposalOperation[] {
  const staffOf = (op: ProposalOperation): string => (op.kind === "create-open" ? "" : op.staffId);
  const rank = (op: ProposalOperation): number => (op.kind === "assign-open" ? 0 : 1);
  const signatureOf = (op: ProposalOperation): string =>
    op.kind === "assign-open" ? signatureKey(op.expected) : signatureKey(op.signature);

  return [...operations].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const staffA = staffOf(a);
    const staffB = staffOf(b);
    if (staffA !== staffB) return staffA < staffB ? -1 : 1;
    const signatureA = signatureOf(a);
    const signatureB = signatureOf(b);
    if (signatureA !== signatureB) return signatureA < signatureB ? -1 : 1;
    const idA = a.kind === "assign-open" ? a.shiftId : "";
    const idB = b.kind === "assign-open" ? b.shiftId : "";
    return idA < idB ? -1 : idA > idB ? 1 : 0;
  });
}
