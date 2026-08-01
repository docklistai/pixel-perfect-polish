import { signatureKey } from "./shiftSignature";
import type { ProposalOperation } from "./buildWeekProposal";

/**
 * Apply order: existing-shift assignments first, then creations, each by staff id
 * ascending with unassigned first.
 *
 * This order is presentation and determinism, NOT a database-safety mechanism.
 * Phase 47 relied on it for lock ordering, which was wrong twice over: nothing
 * in SQL validated the order, and ranking assign-open ahead of creations meant
 * the sequence was ascending only within a rank group. Phase 48 removed that
 * dependency — rpc_apply_build_week_proposal now collects every affected staff
 * member from the parsed operations and locks the whole set once, in canonical
 * ascending order, before it validates or writes anything. Reordering this list
 * can no longer cause a deadlock.
 *
 * What it still buys: the same inputs always produce the same sequence, so the
 * proposal digest is stable between preview and apply, and operations are
 * applied in the order the manager reviewed them.
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
