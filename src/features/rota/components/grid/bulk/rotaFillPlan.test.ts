import { describe, expect, it } from "vitest";
import { buildRotaFillPlan } from "./rotaFillPlan";
import { makeCell, makeShift, makeTargetGrid } from "./bulkTestFactories";

const ROLES = ["Bar", "Kitchen"];

describe("buildRotaFillPlan — down", () => {
  it("repeats the top row into the rows below", () => {
    const plan = buildRotaFillPlan({
      rows: makeTargetGrid([
        [makeCell([makeShift({ id: "src", start: "09:00", end: "17:00", role: "Bar" })])],
        [makeCell()],
        [makeCell()],
      ]),
      direction: "down",
      workspaceRoles: ROLES,
    });
    expect(plan.counts.created).toBe(2);
    expect(plan.blockers).toEqual([]);
  });

  it("does not touch the source row itself", () => {
    const plan = buildRotaFillPlan({
      rows: makeTargetGrid([[makeCell([makeShift({ id: "src" })])], [makeCell()]]),
      direction: "down",
      workspaceRoles: ROLES,
    });
    // Only the follower row is planned.
    expect(plan.cells).toHaveLength(1);
  });

  it("clears targets when the source is empty, after warning", () => {
    const plan = buildRotaFillPlan({
      rows: makeTargetGrid([[makeCell()], [makeCell([makeShift({ id: "wipe" })])]]),
      direction: "down",
      workspaceRoles: ROLES,
    });
    expect(plan.counts.cleared).toBe(1);
    expect(plan.notes.some((n) => /clear every target/i.test(n))).toBe(true);
  });

  it("blocks when there is no row below the source", () => {
    const plan = buildRotaFillPlan({
      rows: makeTargetGrid([[makeCell([makeShift()])]]),
      direction: "down",
      workspaceRoles: ROLES,
    });
    expect(plan.blockers).toHaveLength(1);
  });
});

describe("buildRotaFillPlan — right", () => {
  it("repeats the left column into the columns to its right", () => {
    const plan = buildRotaFillPlan({
      rows: makeTargetGrid([
        [makeCell([makeShift({ id: "src", role: "Bar" })]), makeCell(), makeCell()],
      ]),
      direction: "right",
      workspaceRoles: ROLES,
    });
    expect(plan.counts.created).toBe(2);
  });
});

describe("buildRotaFillPlan — open/assigned conversion", () => {
  it("filling a staff shift down into the open row creates open shifts", () => {
    const plan = buildRotaFillPlan({
      rows: makeTargetGrid([[makeCell([makeShift({ id: "src", role: "Bar" })])], [makeCell()]], {
        rowKeys: ["staff:0", "open"],
      }),
      direction: "down",
      workspaceRoles: ROLES,
    });
    const op = plan.cells[0]!.ops[0]!;
    expect(op.kind).toBe("create");
    if (op.kind === "create") expect(op.input.staffId).toBeNull();
  });

  it("filling an open shift down onto a staff row assigns it to that staff member", () => {
    const plan = buildRotaFillPlan({
      rows: makeTargetGrid(
        [
          [makeCell([makeShift({ id: "src", staffId: null, status: "open", role: "Bar" })])],
          [makeCell()],
        ],
        { rowKeys: ["open", "staff:1"] },
      ),
      direction: "down",
      workspaceRoles: ROLES,
    });
    const op = plan.cells[0]!.ops[0]!;
    expect(op.kind).toBe("create");
    if (op.kind === "create") expect(op.input.staffId).toBe("staff-1");
  });
});

describe("buildRotaFillPlan — blocking", () => {
  it("one invalid target does not arise from fill, but a slash source blocks all", () => {
    const plan = buildRotaFillPlan({
      rows: makeTargetGrid([[makeCell([makeShift({ role: "Bar/Grill" })])], [makeCell()]]),
      direction: "down",
      workspaceRoles: ROLES,
    });
    expect(plan.blockers.length).toBeGreaterThan(0);
  });
});
