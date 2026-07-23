import { describe, expect, it } from "vitest";
import { buildRotaClearPlan } from "./rotaClearPlan";
import { bulkNeedsConfirmation } from "./rotaBulkConfirmation";
import { makeCell, makeShift, makeTarget } from "./bulkTestFactories";

describe("buildRotaClearPlan", () => {
  it("removes every shift in the selected cells", () => {
    const plan = buildRotaClearPlan([
      makeTarget({ cell: makeCell([makeShift({ id: "s1" })]) }),
      makeTarget({ key: { row: "staff:a", day: 1 }, cell: makeCell([makeShift({ id: "s2" })]) }),
    ]);
    expect(plan.counts.cleared).toBe(2);
    expect(plan.cells.flatMap((c) => c.ops)).toEqual([
      { kind: "remove", shiftId: "s1" },
      { kind: "remove", shiftId: "s2" },
    ]);
  });

  it("counts affected cells and affected shifts separately", () => {
    const plan = buildRotaClearPlan([
      makeTarget({
        cell: makeCell([
          makeShift({ id: "a", start: "09:00" }),
          makeShift({ id: "b", start: "17:00" }),
        ]),
      }),
      makeTarget({ key: { row: "staff:a", day: 1 }, cell: makeCell() }),
    ]);
    expect(plan.counts.cells).toBe(1);
    expect(plan.counts.shifts).toBe(2);
  });

  it("states it records no leave and returns the week to draft", () => {
    const plan = buildRotaClearPlan([makeTarget({ cell: makeCell([makeShift()]) })]);
    expect(plan.notes.join(" ")).toMatch(/does not record leave/i);
    expect(plan.notes.join(" ")).toMatch(/returns to Draft/i);
  });

  it("triggers confirmation above 10 shifts even when cells are few", () => {
    const shifts = Array.from({ length: 11 }, (_, i) => makeShift({ id: `s${i}` }));
    const plan = buildRotaClearPlan([makeTarget({ cell: makeCell(shifts) })]);
    expect(plan.counts.cells).toBe(1);
    expect(plan.counts.shifts).toBe(11);
    expect(bulkNeedsConfirmation(plan)).toBe(true);
  });

  it("does not trigger confirmation for a small clear", () => {
    const plan = buildRotaClearPlan([makeTarget({ cell: makeCell([makeShift()]) })]);
    expect(bulkNeedsConfirmation(plan)).toBe(false);
  });
});
