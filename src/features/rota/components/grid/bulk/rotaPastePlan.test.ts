import { describe, expect, it } from "vitest";
import { buildRotaPastePlan, pastedBlockRect } from "./rotaPastePlan";
import { makeCell, makeShift, makeTargetGrid } from "./bulkTestFactories";

const ROLES = ["Bar", "Kitchen"];

function pastePlan(cells: Parameters<typeof makeTargetGrid>[0], pasted: string[][], options = {}) {
  return buildRotaPastePlan({
    geometry: { rows: makeTargetGrid(cells, options) },
    pasted,
    workspaceRoles: ROLES,
  });
}

describe("buildRotaPastePlan — shape", () => {
  it("creates a shift in an empty target cell", () => {
    const plan = pastePlan([[makeCell()]], [["9-5 Bar"]]);
    expect(plan.blockers).toEqual([]);
    expect(plan.counts.created).toBe(1);
    const op = plan.cells[0]!.ops[0]!;
    expect(op.kind).toBe("create");
  });

  it("fills the whole selection from a single copied cell", () => {
    const plan = pastePlan(
      [
        [makeCell(), makeCell()],
        [makeCell(), makeCell()],
      ],
      [["9-5 Bar"]],
    );
    expect(plan.counts.created).toBe(4);
    expect(plan.notes.some((n) => /repeated across all 4/i.test(n))).toBe(true);
  });

  it("anchors a rectangular block at the active cell", () => {
    const plan = pastePlan(
      [
        [makeCell(), makeCell()],
        [makeCell(), makeCell()],
      ],
      [
        ["9-5 Bar", "10-4 Kitchen"],
        ["", "12-8 Bar"],
      ],
    );
    expect(plan.counts.created).toBe(3);
    expect(plan.blockers).toEqual([]);
  });

  it("blocks the whole paste when the block is taller than the selection", () => {
    const plan = pastePlan([[makeCell()]], [["9-5 Bar"], ["10-4 Bar"]]);
    expect(plan.blockers).toHaveLength(1);
    expect(plan.blockers[0]!.message).toMatch(/rows/i);
    expect(plan.counts.shifts).toBe(0);
  });

  it("blocks the whole paste when the block is wider than the selection", () => {
    const plan = pastePlan([[makeCell(), makeCell()]], [["9-5 Bar", "10-4 Bar", "12-8 Bar"]]);
    expect(plan.blockers).toHaveLength(1);
    expect(plan.blockers[0]!.message).toMatch(/columns/i);
  });
});

describe("buildRotaPastePlan — content", () => {
  it("clears the target when the pasted field is empty", () => {
    const plan = pastePlan([[makeCell([makeShift({ id: "gone" })])]], [[""]]);
    expect(plan.cells[0]!.ops).toEqual([{ kind: "remove", shiftId: "gone" }]);
  });

  it("round-trips a split shift", () => {
    const plan = pastePlan([[makeCell()]], [["09:00-12:00 / 17:00-22:00 Bar"]]);
    const ops = plan.cells[0]!.ops;
    expect(ops).toHaveLength(2);
    expect(ops.every((op) => op.kind === "create")).toBe(true);
  });

  it("accepts a temporary role and surfaces it as a warning", () => {
    const plan = pastePlan([[makeCell()]], [["9-5 Training"]]);
    expect(plan.blockers).toEqual([]);
    expect(plan.counts.created).toBe(1);
    expect(plan.cells[0]!.warnings.join(" ")).toMatch(/temporary/i);
  });

  it("blocks a cell whose parsed content is not a valid time", () => {
    const plan = pastePlan([[makeCell()]], [["not a shift"]]);
    expect(plan.blockers).toHaveLength(1);
    expect(plan.counts.shifts).toBe(0);
  });

  it("blocks a recognised but unrecordable command such as holiday", () => {
    const plan = pastePlan([[makeCell()]], [["holiday"]]);
    expect(plan.blockers).toHaveLength(1);
    expect(plan.blockers[0]!.message).toMatch(/not saved/i);
  });

  it("one invalid cell blocks the entire apply", () => {
    const plan = pastePlan([[makeCell(), makeCell()]], [["9-5 Bar", "garbage"]]);
    expect(plan.blockers).toHaveLength(1);
  });
});

describe("buildRotaPastePlan — department and open/assigned", () => {
  it("states departments follow the target, not the copied cell", () => {
    const plan = pastePlan([[makeCell()]], [["9-5 Bar"]]);
    expect(plan.notes.some((n) => /follow the target/i.test(n))).toBe(true);
  });

  it("keeps an existing shift's own department by not sending one on update", () => {
    const plan = pastePlan(
      [[makeCell([makeShift({ id: "s", departmentId: "dept-events" })])]],
      [["10-6 Bar"]],
    );
    const op = plan.cells[0]!.ops[0]!;
    expect(op.kind).toBe("update");
    if (op.kind === "update") expect("departmentId" in op.patch).toBe(false);
  });

  it("creates an open shift when pasting into the open row", () => {
    const plan = pastePlan([[makeCell()]], [["9-5 Bar"]], { rowKeys: ["open"] });
    const op = plan.cells[0]!.ops[0]!;
    expect(op.kind).toBe("create");
    if (op.kind === "create") expect(op.input.staffId).toBeNull();
    expect(plan.cells[0]!.warnings.join(" ")).toMatch(/open/i);
  });

  it("warns when a staff shift is being turned open by the pasted text", () => {
    const plan = pastePlan([[makeCell([makeShift({ id: "s" })])]], [["open 9-5 Bar"]]);
    expect(plan.cells[0]!.warnings.join(" ")).toMatch(/unassigned|open/i);
  });
});

describe("pastedBlockRect — where a copied block lands", () => {
  const single = { topRow: 2, bottomRow: 2, leftDay: 1, rightDay: 1 };

  it("grows a one-cell selection to the shape of the copied block", () => {
    expect(pastedBlockRect(single, 3, 2)).toEqual({
      topRow: 2,
      bottomRow: 4,
      leftDay: 1,
      rightDay: 2,
    });
  });

  it("keeps the selection as it stands for a single copied cell, so it fills", () => {
    const range = { topRow: 0, bottomRow: 3, leftDay: 0, rightDay: 4 };
    expect(pastedBlockRect(range, 1, 1)).toEqual(range);
  });

  it("never shrinks a selection larger than the copied block", () => {
    const range = { topRow: 0, bottomRow: 5, leftDay: 0, rightDay: 6 };
    expect(pastedBlockRect(range, 2, 2)).toEqual(range);
  });

  it("anchors at the top-left, not the focus corner", () => {
    expect(pastedBlockRect(single, 2, 4)).toMatchObject({ topRow: 2, leftDay: 1 });
  });

  it("passes null through when nothing is selected", () => {
    expect(pastedBlockRect(null, 2, 2)).toBeNull();
  });
});
