import { describe, expect, it } from "vitest";
import { constraintAcknowledgementValue } from "./publishConstraintAcknowledgement";

describe("constraintAcknowledgementValue", () => {
  it("never claims acknowledgement when there are no constraint clashes", () => {
    expect(constraintAcknowledgementValue(0, true)).toBe(false);
  });

  it("requires an explicit review when constraint clashes exist", () => {
    expect(constraintAcknowledgementValue(2, false)).toBe(false);
    expect(constraintAcknowledgementValue(2, true)).toBe(true);
  });
});
