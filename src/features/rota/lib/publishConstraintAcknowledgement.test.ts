import { describe, expect, it } from "vitest";
import {
  acknowledgeableConstraintCount,
  constraintAcknowledgementLabel,
  constraintAcknowledgementValue,
} from "./publishConstraintAcknowledgement";

const none = {
  availabilityClashCount: 0,
  approvedLeaveClashCount: 0,
  overlappingShiftCount: 0,
};

describe("acknowledgeableConstraintCount", () => {
  it("counts an approved-leave-only clash, which the RPC also treats as acknowledgeable", () => {
    expect(acknowledgeableConstraintCount({ ...none, approvedLeaveClashCount: 1 })).toBe(1);
  });

  it("counts availability clashes on their own exactly as before", () => {
    expect(acknowledgeableConstraintCount({ ...none, availabilityClashCount: 2 })).toBe(2);
  });

  it("sums mixed clash types once each rather than double-counting", () => {
    expect(
      acknowledgeableConstraintCount({
        ...none,
        availabilityClashCount: 2,
        approvedLeaveClashCount: 3,
      }),
    ).toBe(5);
  });

  it("contributes nothing when no shifts overlap", () => {
    expect(acknowledgeableConstraintCount(none)).toBe(0);
  });

  it("counts an overlap-only clash, which rpc_publish_rota_week now also refuses", () => {
    expect(acknowledgeableConstraintCount({ ...none, overlappingShiftCount: 2 })).toBe(2);
  });

  it("counts overlapping shifts, not overlapping pairs — two mutually overlapping shifts are two", () => {
    // localConflictShiftIds returns a Set of shift ids, and the RPC emits one
    // clash row per shift. A single overlapping pair is therefore 2, not 1.
    expect(acknowledgeableConstraintCount({ ...none, overlappingShiftCount: 2 })).toBe(2);
  });

  it("sums overlaps alongside the existing constraint types without double-counting", () => {
    expect(
      acknowledgeableConstraintCount({
        availabilityClashCount: 1,
        approvedLeaveClashCount: 2,
        overlappingShiftCount: 3,
      }),
    ).toBe(6);
  });
});

describe("constraintAcknowledgementValue", () => {
  it("never claims an override when nothing clashes", () => {
    expect(constraintAcknowledgementValue(none, true)).toBe(false);
    expect(constraintAcknowledgementValue(none, false)).toBe(false);
  });

  it("sends the override for an approved-leave-only clash once the manager acknowledges", () => {
    const leaveOnly = { ...none, approvedLeaveClashCount: 1 };
    expect(constraintAcknowledgementValue(leaveOnly, false)).toBe(false);
    expect(constraintAcknowledgementValue(leaveOnly, true)).toBe(true);
  });

  it("keeps approved unavailability and recurring day-off behaviour unchanged", () => {
    const availabilityOnly = { ...none, availabilityClashCount: 2 };
    expect(constraintAcknowledgementValue(availabilityOnly, false)).toBe(false);
    expect(constraintAcknowledgementValue(availabilityOnly, true)).toBe(true);
  });

  it("treats mixed clash types as a single acknowledgement decision", () => {
    const mixed = { ...none, availabilityClashCount: 1, approvedLeaveClashCount: 1 };
    expect(constraintAcknowledgementValue(mixed, false)).toBe(false);
    expect(constraintAcknowledgementValue(mixed, true)).toBe(true);
  });

  it("sends the override for an overlap-only clash once the manager acknowledges", () => {
    // Without this the RPC would refuse a publication the dialog could never
    // acknowledge, hard-blocking the manager. This is the mirror contract.
    const overlapOnly = { ...none, overlappingShiftCount: 2 };
    expect(constraintAcknowledgementValue(overlapOnly, false)).toBe(false);
    expect(constraintAcknowledgementValue(overlapOnly, true)).toBe(true);
  });

  it("never claims an override for an overlap the detector did not find", () => {
    expect(constraintAcknowledgementValue({ ...none, overlappingShiftCount: 0 }, true)).toBe(false);
  });

  it("folds overlaps into the same single acknowledgement as the other kinds", () => {
    const all = {
      availabilityClashCount: 1,
      approvedLeaveClashCount: 1,
      overlappingShiftCount: 2,
    };
    expect(constraintAcknowledgementValue(all, false)).toBe(false);
    expect(constraintAcknowledgementValue(all, true)).toBe(true);
  });
});

describe("constraintAcknowledgementLabel", () => {
  it("names approved leave alongside the other acknowledgeable constraints", () => {
    const label = constraintAcknowledgementLabel("publish");
    expect(label).toContain("approved leave");
    expect(label).toContain("approved unavailability");
    expect(label).toContain("recurring day-off");
    expect(label).toContain("publish this manager-approved rota snapshot");
  });

  it("names overlapping shifts, since they are now an acknowledgeable override", () => {
    // Wording must match what is actually counted: unique shifts, not pairs.
    expect(constraintAcknowledgementLabel("publish")).toContain("overlapping shifts");
  });

  it("carries the republish wording through unchanged", () => {
    expect(constraintAcknowledgementLabel("republish")).toContain(
      "republish this manager-approved rota snapshot",
    );
  });
});
