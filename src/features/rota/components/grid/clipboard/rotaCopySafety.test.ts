import { describe, expect, it } from "vitest";
import { findAmbiguousSlashCell } from "./rotaCopySafety";
import { makeShift } from "../bulk/bulkTestFactories";

describe("findAmbiguousSlashCell", () => {
  it("returns the exact selected cell containing an unsafe role", () => {
    const result = findAmbiguousSlashCell([
      [[makeShift({ role: "Bar" })], []],
      [[], [makeShift({ role: "Management / FOH" })]],
    ]);
    expect(result).toEqual({ row: 1, column: 1 });
  });

  it("allows ordinary and temporary roles", () => {
    expect(
      findAmbiguousSlashCell([[[makeShift({ role: "Training" }), makeShift({ role: "Cover" })]]]),
    ).toBeNull();
  });
});
