import { describe, expect, it } from "vitest";
import {
  acknowledgeableConstraintCount,
  constraintAcknowledgementLabel,
  constraintAcknowledgementValue,
} from "./publishConstraintAcknowledgement";

const none = { availabilityClashCount: 0, approvedLeaveClashCount: 0 };

describe("acknowledgeableConstraintCount", () => {
  it("counts an approved-leave-only clash, which the RPC also treats as acknowledgeable", () => {
    expect(
      acknowledgeableConstraintCount({ availabilityClashCount: 0, approvedLeaveClashCount: 1 }),
    ).toBe(1);
  });

  it("counts availability clashes on their own exactly as before", () => {
    expect(
      acknowledgeableConstraintCount({ availabilityClashCount: 2, approvedLeaveClashCount: 0 }),
    ).toBe(2);
  });

  it("sums mixed clash types once each rather than double-counting", () => {
    expect(
      acknowledgeableConstraintCount({ availabilityClashCount: 2, approvedLeaveClashCount: 3 }),
    ).toBe(5);
  });
});

describe("constraintAcknowledgementValue", () => {
  it("never claims an override when nothing clashes", () => {
    expect(constraintAcknowledgementValue(none, true)).toBe(false);
    expect(constraintAcknowledgementValue(none, false)).toBe(false);
  });

  it("sends the override for an approved-leave-only clash once the manager acknowledges", () => {
    const leaveOnly = { availabilityClashCount: 0, approvedLeaveClashCount: 1 };
    expect(constraintAcknowledgementValue(leaveOnly, false)).toBe(false);
    expect(constraintAcknowledgementValue(leaveOnly, true)).toBe(true);
  });

  it("keeps approved unavailability and recurring day-off behaviour unchanged", () => {
    const availabilityOnly = { availabilityClashCount: 2, approvedLeaveClashCount: 0 };
    expect(constraintAcknowledgementValue(availabilityOnly, false)).toBe(false);
    expect(constraintAcknowledgementValue(availabilityOnly, true)).toBe(true);
  });

  it("treats mixed clash types as a single acknowledgement decision", () => {
    const mixed = { availabilityClashCount: 1, approvedLeaveClashCount: 1 };
    expect(constraintAcknowledgementValue(mixed, false)).toBe(false);
    expect(constraintAcknowledgementValue(mixed, true)).toBe(true);
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

  it("carries the republish wording through unchanged", () => {
    expect(constraintAcknowledgementLabel("republish")).toContain(
      "republish this manager-approved rota snapshot",
    );
  });
});
