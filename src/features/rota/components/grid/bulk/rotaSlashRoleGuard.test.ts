import { describe, expect, it } from "vitest";
import { findSlashRoleBlockers, roleHasAmbiguousSlash } from "./rotaSlashRoleGuard";
import { buildRotaPastePlan } from "./rotaPastePlan";
import { buildRotaFillPlan } from "./rotaFillPlan";
import { makeCell, makeShift, makeTarget, makeTargetGrid } from "./bulkTestFactories";

describe("roleHasAmbiguousSlash", () => {
  it("flags a role containing a slash", () => {
    expect(roleHasAmbiguousSlash("Bar / Kitchen")).toBe(true);
    expect(roleHasAmbiguousSlash("Bar")).toBe(false);
    expect(roleHasAmbiguousSlash(null)).toBe(false);
  });
});

describe("findSlashRoleBlockers", () => {
  it("identifies the exact cell whose existing role is ambiguous", () => {
    const blockers = findSlashRoleBlockers([
      makeTarget({ label: "Sam, Mon", cell: makeCell([makeShift({ role: "Bar/Grill" })]) }),
      makeTarget({ label: "Sam, Tue", cell: makeCell([makeShift({ role: "Bar" })]) }),
    ]);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]!.label).toBe("Sam, Mon");
    expect(blockers[0]!.message).toMatch(/reserved for split shifts/i);
  });
});

describe("slash role blocking in operations", () => {
  it("paste blocks a target cell that already holds a slash role", () => {
    const plan = buildRotaPastePlan({
      geometry: { rows: makeTargetGrid([[makeCell([makeShift({ role: "Bar/Grill" })])]]) },
      pasted: [["10-6 Bar"]],
    });
    expect(plan.blockers).toHaveLength(1);
    expect(plan.blockers[0]!.message).toMatch(/reserved for split shifts/i);
  });

  it("fill carries a slash role through, because it never passes through text", () => {
    // The slash restriction exists only because "/" separates the halves of a
    // split shift in the cell grammar. Fill reads the source shifts directly, so
    // a role named "Bar/Grill" survives instead of being refused.
    const plan = buildRotaFillPlan({
      rows: makeTargetGrid([[makeCell([makeShift({ role: "Bar/Grill" })])], [makeCell()]]),
      direction: "down",
    });
    expect(plan.blockers).toEqual([]);
    expect(plan.counts.created).toBe(1);
    const created = plan.cells[0]!.ops[0]!;
    expect(created.kind).toBe("create");
    expect(created.kind === "create" && created.input.role).toBe("Bar/Grill");
  });

  it("paste still refuses a slash role, because clipboard text really is TSV", () => {
    const plan = buildRotaPastePlan({
      geometry: { rows: makeTargetGrid([[makeCell()]]) },
      pasted: [["9-17 Bar / Kitchen"]],
    });
    expect(plan.blockers).toHaveLength(1);
    expect(plan.blockers[0]!.message).toMatch(/reserved for split shifts/i);
  });
});

describe("pasted text containing a slash role", () => {
  const plan = (text: string) =>
    buildRotaPastePlan({
      geometry: { rows: makeTargetGrid([[makeCell()]]) },
      pasted: [[text]],
      workspaceRoles: ["Bar", "Kitchen"],
    });

  it("explains the slash instead of repeating the time format", () => {
    const blockers = plan("9-17 Bar / Kitchen").blockers;
    expect(blockers).toHaveLength(1);
    expect(blockers[0]!.message).toMatch(/reserved for split shifts/i);
    expect(blockers[0]!.label).toBeTruthy();
  });

  it("writes nothing for that cell", () => {
    expect(plan("9-17 Bar / Kitchen").counts.shifts).toBe(0);
  });

  it("keeps the time message for a split whose halves are both times", () => {
    const blockers = plan("9-12 / 25-99").blockers;
    expect(blockers).toHaveLength(1);
    expect(blockers[0]!.message).toMatch(/use times like/i);
    expect(blockers[0]!.message).not.toMatch(/reserved for split shifts/i);
  });

  it("leaves a valid split shift alone", () => {
    const p = plan("09:00-12:00 / 17:00-22:00 Bar");
    expect(p.blockers).toEqual([]);
    expect(p.counts.created).toBe(2);
  });
});
