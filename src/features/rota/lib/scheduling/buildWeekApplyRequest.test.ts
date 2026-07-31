import { describe, expect, it } from "vitest";
import { buildApplyRequestFor } from "./buildWeekApplyRequest";
import { buildShiftSignature } from "./shiftSignature";
import { PLANNER_RULE_VERSION } from "./buildWeekProposal";
import type { BuildWeekProposalResult } from "../../api/buildWeekProposal";

/**
 * The proposal round trip.
 *
 * The database re-derives the input fingerprint from the `source` the client
 * sends and the digest from the `operations` it sends. Both must therefore make
 * the trip back **unchanged**. The regression this guards against is real: the
 * Build drawer once sent `contentVersion: ""` — because the server did not
 * return the value it had stamped — and the result was that every single Build
 * apply came back "This week changed while the proposal was open", with nothing
 * a manager could do about it, since rebuilding produced the same payload.
 *
 * Identity (`toBe`) rather than deep equality is asserted deliberately: an equal
 * copy would pass a value check while still proving nothing about whether the
 * caller reconstructed the object.
 */

function issuedProposal(): Extract<BuildWeekProposalResult, { ok: true }> {
  const signature = buildShiftSignature({
    workDate: "2026-08-03",
    start: "09:00",
    end: "17:00",
    role: "Head Chef",
    departmentId: "dept-kitchen",
    locationId: "loc-1",
    breakMinutes: 30,
  });
  return {
    ok: true,
    rotaWeekId: "week-1",
    weekStart: "2026-08-03",
    locationId: "loc-1",
    inputFingerprint: "fingerprint-abc",
    proposalDigest: "digest-xyz",
    plannerRuleVersion: PLANNER_RULE_VERSION,
    source: { kind: "template", id: "template-1", label: "Summer week" },
    applySource: {
      kind: "template",
      id: "template-1",
      contentVersion: "slots:14",
      plannerRuleVersion: PLANNER_RULE_VERSION,
    },
    proposal: {
      operations: [
        {
          kind: "create-assigned",
          signature,
          roleName: "Head Chef",
          staffId: "staff-1",
          reason: "Holds the role.",
        },
      ],
      sections: {
        missingDemand: [],
        proposedAssignments: [],
        preserved: { assignedShifts: 0, openShifts: 0, openShiftsBeingAssigned: 0 },
        unresolvedOpen: [],
      },
      warnings: [],
      explanations: [],
    },
  };
}

describe("the reviewed proposal is applied exactly as it was issued", () => {
  const proposal = issuedProposal();
  const request = buildApplyRequestFor(proposal);

  it("sends the stamped source object itself, not a rebuilt one", () => {
    expect(request.source).toBe(proposal.applySource);
  });

  it("keeps contentVersion, which the fingerprint is taken over", () => {
    // The exact field the defect dropped. An empty string here made the RPC
    // recompute a different fingerprint and refuse every apply as stale.
    expect(request.source.contentVersion).toBe("slots:14");
    expect(request.source.contentVersion).not.toBe("");
  });

  it("carries every other source field through untouched", () => {
    expect(request.source).toEqual({
      kind: "template",
      id: "template-1",
      contentVersion: "slots:14",
      plannerRuleVersion: PLANNER_RULE_VERSION,
    });
  });

  it("sends the reviewed operations array itself, in its emitted order", () => {
    expect(request.operations).toBe(proposal.proposal.operations);
    expect(request.operations).toHaveLength(1);
  });

  it("echoes the fingerprint, digest and week the server issued", () => {
    expect(request.inputFingerprint).toBe(proposal.inputFingerprint);
    expect(request.proposalDigest).toBe(proposal.proposalDigest);
    expect(request.rotaWeekId).toBe(proposal.rotaWeekId);
  });

  it("adds nothing of its own", () => {
    expect(Object.keys(request).sort()).toEqual([
      "inputFingerprint",
      "operations",
      "proposalDigest",
      "rotaWeekId",
      "source",
    ]);
  });

  it("uses the source the proposal was stamped with, not its display source", () => {
    // `source` is for the review header and carries a human label; `applySource`
    // is the object the database hashed. Sending the display one would fail.
    expect(request.source).not.toBe(proposal.source);
    expect("label" in request.source).toBe(false);
  });
});
