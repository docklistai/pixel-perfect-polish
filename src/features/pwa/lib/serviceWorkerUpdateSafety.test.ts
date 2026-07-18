import { describe, expect, it } from "vitest";
import { updateBoundaryBlockReason } from "./serviceWorkerUpdateSafety";

describe("updateBoundaryBlockReason", () => {
  it("permits an explicit update only at an idle boundary", () => {
    expect(
      updateBoundaryBlockReason({
        activeMutations: 0,
        hasDirtyForm: false,
        hasOpenDialog: false,
        hasFocusedEditor: false,
        hasExplicitBlocker: false,
      }),
    ).toBeNull();
  });

  it.each([
    ["activeMutations", 1, /finish/i],
    ["hasDirtyForm", true, /form/i],
    ["hasOpenDialog", true, /dialog/i],
    ["hasFocusedEditor", true, /field/i],
    ["hasExplicitBlocker", true, /work/i],
  ] as const)("blocks updates while %s is active", (field, value, expected) => {
    const state = {
      activeMutations: 0,
      hasDirtyForm: false,
      hasOpenDialog: false,
      hasFocusedEditor: false,
      hasExplicitBlocker: false,
      [field]: value,
    };
    expect(updateBoundaryBlockReason(state)).toMatch(expected);
  });
});
