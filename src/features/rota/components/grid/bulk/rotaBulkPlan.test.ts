import { describe, expect, it } from "vitest";
import { buildFreshPlanSignature, buildPlanSignature } from "./rotaBulkPlan";
import { makeCell, makeShift, makeTarget } from "./bulkTestFactories";

function signature(status: "scheduled" | "open", staffId: string | null) {
  return buildPlanSignature([
    makeTarget({
      staffId,
      cell: makeCell([makeShift({ id: "same", status, staffId })]),
    }),
  ]);
}

describe("buildPlanSignature", () => {
  it("detects scheduled to open drift", () => {
    expect(signature("scheduled", "staff-1")).not.toBe(signature("open", null));
  });

  it("detects open to scheduled drift", () => {
    expect(signature("open", null)).not.toBe(signature("scheduled", "staff-1"));
  });

  it("detects a status-only change with every other field unchanged", () => {
    expect(signature("scheduled", "staff-1")).not.toBe(signature("open", "staff-1"));
  });

  it("fingerprints status from the authoritative refetch rather than the stale target cell", () => {
    const target = makeTarget({
      cell: makeCell([makeShift({ id: "same", status: "scheduled", staffId: "staff-1" })]),
    });
    const stale = buildPlanSignature([target]);
    const fresh = buildFreshPlanSignature(
      [target],
      [makeShift({ id: "same", status: "open", staffId: "staff-1" })],
    );
    expect(fresh).not.toBe(stale);
  });
});
