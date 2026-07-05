import { describe, expect, it } from "vitest";
import { cellLeaveTitle } from "./cellLeaveTitle";

describe("cellLeaveTitle", () => {
  it("keeps the pending tooltip on occupied cells so assigned shifts still show the overlap", () => {
    expect(cellLeaveTitle("pending", true)).toBe("Pending leave request");
    expect(cellLeaveTitle("pending", false)).toBe("Pending leave request");
  });

  it("limits the approved tooltip to empty cells (occupied approved cells surface as conflicts)", () => {
    expect(cellLeaveTitle("approved", false)).toBe("Approved leave");
    expect(cellLeaveTitle("approved", true)).toBeUndefined();
  });

  it("returns no tooltip without a leave state", () => {
    expect(cellLeaveTitle(undefined, false)).toBeUndefined();
    expect(cellLeaveTitle(undefined, true)).toBeUndefined();
  });
});
