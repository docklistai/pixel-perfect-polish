import type { ApplyBuildWeekProposalInput } from "../../api/applyBuildWeekProposal";
import type { BuildWeekProposalResult } from "../../api/buildWeekProposal";

/**
 * The apply payload for one issued Build the Week proposal.
 *
 * Every field is echoed from the proposal, never rebuilt. The database folds
 * `source` into the input fingerprint and takes the digest over `operations`, so
 * a caller that reassembles either one recomputes a value that will not match —
 * and the RPC refuses the apply as stale. That is not a hypothetical: an earlier
 * version of the Build drawer sent `contentVersion: ""` because the server never
 * returned it, which made *every* Build apply fail with "This week changed while
 * the proposal was open."
 *
 * Extracted from the hook so this is a pure function with a test, rather than a
 * correctness-critical object literal inside a React callback that the repo's
 * node-only test setup cannot reach.
 */
export function buildApplyRequestFor(
  proposal: Extract<BuildWeekProposalResult, { ok: true }>,
): ApplyBuildWeekProposalInput {
  return {
    rotaWeekId: proposal.rotaWeekId,
    inputFingerprint: proposal.inputFingerprint,
    proposalDigest: proposal.proposalDigest,
    source: proposal.applySource,
    operations: proposal.proposal.operations,
  };
}
