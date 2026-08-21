import { describe, expect, it } from "vitest";
import {
  buildPublishDiff,
  describePublishDiffShift,
  draftShiftToDiffShift,
  formatShiftTimeRange,
  type PublishDiffShift,
} from "./publishDiff";
import type { DraftShift } from "../types";

const DAY_LABELS = ["Mon 4", "Tue 5", "Wed 6", "Thu 7", "Fri 8", "Sat 9", "Sun 10"];

function shift(overrides: Partial<PublishDiffShift> = {}): PublishDiffShift {
  return {
    id: "shift-1",
    dayIndex: 3,
    staffId: "staff-1",
    staffName: "Sam Ellis",
    role: "Bartender",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    departmentName: "Bar",
    ...overrides,
  };
}

function build(draft: PublishDiffShift[], published: PublishDiffShift[], isFirstPublish = false) {
  return buildPublishDiff({ draft, published, isFirstPublish, dayLabels: DAY_LABELS });
}

describe("buildPublishDiff — first publish", () => {
  it("reports every current shift as added when nothing was published before", () => {
    const diff = build([shift(), shift({ id: "shift-2", staffId: "staff-2" })], [], true);

    expect(diff.isFirstPublish).toBe(true);
    expect(diff.isUnchanged).toBe(false);
    expect(diff.totals).toEqual({ added: 2, removed: 0, changed: 0 });
    expect(diff.entries.every((entry) => entry.kind === "added")).toBe(true);
    expect(diff.affectedStaffCount).toBe(2);
  });

  it("treats a first publish of an empty week as unchanged rather than inventing entries", () => {
    const diff = build([], [], true);

    expect(diff.isUnchanged).toBe(true);
    expect(diff.totals).toEqual({ added: 0, removed: 0, changed: 0 });
  });
});

describe("buildPublishDiff — no change", () => {
  it("returns no entries when the draft matches the snapshot exactly", () => {
    const diff = build([shift()], [shift()]);

    expect(diff.isUnchanged).toBe(true);
    expect(diff.entries).toEqual([]);
    expect(diff.affectedStaffCount).toBe(0);
  });

  it("ignores a staff name that resolved differently but kept the same id", () => {
    const diff = build([shift({ staffName: "Samuel Ellis" })], [shift({ staffName: "Sam Ellis" })]);

    expect(diff.isUnchanged).toBe(true);
  });
});

describe("buildPublishDiff — added and removed", () => {
  it("reports a shift present only in the draft as added", () => {
    const diff = build([shift(), shift({ id: "shift-2" })], [shift()]);

    expect(diff.totals).toEqual({ added: 1, removed: 0, changed: 0 });
    expect(diff.entries[0]).toMatchObject({ kind: "added", shift: { id: "shift-2" } });
  });

  it("reports a shift present only in the snapshot as removed", () => {
    const diff = build([shift()], [shift(), shift({ id: "shift-2", staffId: "staff-2" })]);

    expect(diff.totals).toEqual({ added: 0, removed: 1, changed: 0 });
    expect(diff.entries[0]).toMatchObject({ kind: "removed", shift: { id: "shift-2" } });
    expect(diff.affectedStaffCount).toBe(1);
  });

  it("does not pair an add with a remove when identity differs", () => {
    const diff = build([shift({ id: "new" })], [shift({ id: "old" })]);

    expect(diff.totals).toEqual({ added: 1, removed: 1, changed: 0 });
  });
});

describe("buildPublishDiff — changed", () => {
  it("reports a time change with both ranges", () => {
    const diff = build([shift({ start: "10:00", end: "18:00" })], [shift()]);

    expect(diff.totals).toEqual({ added: 0, removed: 0, changed: 1 });
    const entry = diff.entries[0];
    expect(entry.kind).toBe("changed");
    if (entry.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes).toEqual([{ label: "Time", from: "09:00–17:00", to: "10:00–18:00" }]);
  });

  it("reports a reassignment by name", () => {
    const diff = build([shift({ staffId: "staff-2", staffName: "Ana Ruiz" })], [shift()]);

    const entry = diff.entries[0];
    if (entry.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes).toEqual([{ label: "Assignment", from: "Sam Ellis", to: "Ana Ruiz" }]);
    expect(diff.affectedStaffCount).toBe(2);
  });

  it("reports assigned to open", () => {
    const diff = build([shift({ staffId: null, staffName: null })], [shift()]);

    const entry = diff.entries[0];
    if (entry.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes).toEqual([{ label: "Assignment", from: "Sam Ellis", to: "Open shift" }]);
    expect(diff.affectedStaffCount).toBe(1);
  });

  it("reports open to assigned", () => {
    const diff = build([shift()], [shift({ staffId: null, staffName: null })]);

    const entry = diff.entries[0];
    if (entry.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes).toEqual([{ label: "Assignment", from: "Open shift", to: "Sam Ellis" }]);
  });

  it("reports role and department changes separately", () => {
    const diff = build([shift({ role: "Supervisor", departmentName: "Floor" })], [shift()]);

    const entry = diff.entries[0];
    if (entry.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes).toEqual([
      { label: "Role", from: "Bartender", to: "Supervisor" },
      { label: "Department", from: "Bar", to: "Floor" },
    ]);
  });

  it("reports a day move using the injected labels", () => {
    const diff = build([shift({ dayIndex: 5 })], [shift()]);

    const entry = diff.entries[0];
    if (entry.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes).toEqual([{ label: "Day", from: "Thu 7", to: "Sat 9" }]);
  });

  it("reports every differing field on one entry", () => {
    const diff = build(
      [shift({ staffId: "staff-2", staffName: "Ana Ruiz", start: "12:00", breakMinutes: 60 })],
      [shift()],
    );

    const entry = diff.entries[0];
    if (entry.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes.map((change) => change.label)).toEqual(["Assignment", "Time", "Break"]);
  });
});

describe("formatShiftTimeRange", () => {
  it("formats a same-day shift plainly", () => {
    expect(formatShiftTimeRange("09:00", "17:00")).toBe("09:00–17:00");
  });

  it("marks an overnight shift that wraps past midnight", () => {
    expect(formatShiftTimeRange("22:00", "06:00")).toBe("22:00–06:00 (+1)");
  });

  it("marks a shift ending exactly at midnight as overnight", () => {
    expect(formatShiftTimeRange("16:00", "00:00")).toBe("16:00–00:00 (+1)");
  });
});

describe("describePublishDiffShift", () => {
  it("names the staff member, day, time and role", () => {
    expect(describePublishDiffShift(shift(), DAY_LABELS)).toBe(
      "Sam Ellis — Thu 7 09:00–17:00 · Bartender · Bar",
    );
  });

  it("calls an unassigned shift an open shift", () => {
    expect(describePublishDiffShift(shift({ staffId: null, staffName: null }), DAY_LABELS)).toBe(
      "Open shift — Thu 7 09:00–17:00 · Bartender · Bar",
    );
  });

  it("does not repeat the department when it matches the role", () => {
    expect(describePublishDiffShift(shift({ departmentName: "Bartender" }), DAY_LABELS)).toBe(
      "Sam Ellis — Thu 7 09:00–17:00 · Bartender",
    );
  });

  it("describes an overnight shift as overnight", () => {
    expect(describePublishDiffShift(shift({ start: "22:00", end: "06:00" }), DAY_LABELS)).toBe(
      "Sam Ellis — Thu 7 22:00–06:00 (+1) · Bartender · Bar",
    );
  });

  it("falls back to a day number when labels are missing", () => {
    expect(describePublishDiffShift(shift({ dayIndex: 6 }), [])).toContain("Day 7");
  });
});

describe("draftShiftToDiffShift", () => {
  const draft: DraftShift = {
    id: "shift-9",
    dayIndex: 2,
    staffId: "staff-3",
    role: "Chef",
    start: "08:00",
    end: "16:00",
    breakMinutes: 45,
    tone: "info",
    status: "scheduled",
    departmentName: "Kitchen",
  } as DraftShift;

  it("resolves the staff name from the supplied lookup", () => {
    const result = draftShiftToDiffShift(draft, new Map([["staff-3", "Jo Baker"]]));

    expect(result).toMatchObject({
      id: "shift-9",
      staffName: "Jo Baker",
      departmentName: "Kitchen",
    });
  });

  it("leaves the name null when the staff member is not in the lookup", () => {
    expect(draftShiftToDiffShift(draft, new Map()).staffName).toBeNull();
  });

  it("never looks up a name for an open shift", () => {
    const open = { ...draft, staffId: null } as DraftShift;

    expect(draftShiftToDiffShift(open, new Map([["staff-3", "Jo Baker"]])).staffName).toBeNull();
  });
});

/**
 * A drag move must read as one changed shift.
 *
 * The identity that makes this work is `published_rota_shifts.source_shift_id`,
 * which is the `shifts.id` the row was published from — and an UPDATE never
 * changes it. Had the move been implemented as a create plus a delete, every
 * drag would have shown the manager an unrelated removal and addition, and the
 * affected-staff count would have double-counted the same person.
 */
describe("buildPublishDiff — a moved shift", () => {
  const published = shift({
    id: "shift-1",
    dayIndex: 3,
    staffId: "staff-1",
    staffName: "Sam Ellis",
  });

  it("reports a day move as one changed shift carrying a Day row", () => {
    const diff = build([{ ...published, dayIndex: 5 }], [published]);

    expect(diff.totals).toEqual({ added: 0, removed: 0, changed: 1 });
    const entry = diff.entries[0];
    expect(entry?.kind).toBe("changed");
    if (entry?.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes).toEqual([{ label: "Day", from: "Thu 7", to: "Sat 9" }]);
    expect(diff.affectedStaffCount).toBe(1);
  });

  it("reports a reassignment as one changed shift carrying an Assignment row", () => {
    const diff = build([{ ...published, staffId: "staff-2", staffName: "Jo Baker" }], [published]);

    expect(diff.totals).toEqual({ added: 0, removed: 0, changed: 1 });
    const entry = diff.entries[0];
    if (entry?.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes).toEqual([{ label: "Assignment", from: "Sam Ellis", to: "Jo Baker" }]);
    // Both the person losing the shift and the person gaining it are affected.
    expect(diff.affectedStaffCount).toBe(2);
  });

  it("reports a diagonal move as one entry with both rows, never an add and a remove", () => {
    const diff = build(
      [{ ...published, dayIndex: 0, staffId: "staff-2", staffName: "Jo Baker" }],
      [published],
    );

    expect(diff.totals).toEqual({ added: 0, removed: 0, changed: 1 });
    const entry = diff.entries[0];
    if (entry?.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes.map((change) => change.label)).toEqual(["Assignment", "Day"]);
  });

  it("says a shift moved to the open row is unassigned rather than removed", () => {
    const diff = build([{ ...published, staffId: null, staffName: null }], [published]);

    expect(diff.totals).toEqual({ added: 0, removed: 0, changed: 1 });
    const entry = diff.entries[0];
    if (entry?.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes[0]?.label).toBe("Assignment");
  });

  it("never reports times, break or role as changed by a move", () => {
    const diff = build([{ ...published, dayIndex: 6 }], [published]);
    const entry = diff.entries[0];
    if (entry?.kind !== "changed") throw new Error("expected a changed entry");
    expect(entry.changes.map((change) => change.label)).not.toContain("Time");
    expect(entry.changes.map((change) => change.label)).not.toContain("Break");
    expect(entry.changes.map((change) => change.label)).not.toContain("Role");
  });
});
