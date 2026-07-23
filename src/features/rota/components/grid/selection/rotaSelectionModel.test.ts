import { describe, expect, it } from "vitest";
import {
  OPEN_ROW_KEY,
  buildRotaRowKeys,
  collapseSelection,
  extendSelectionTo,
  nextCellKey,
  normaliseSelection,
  rectCellCount,
  rectContains,
  rectIsSingleCell,
  resolveSelectionRect,
  selectSingleCell,
  selectionIsResolvable,
  staffRowKey,
  type RotaSelection,
} from "./rotaSelectionModel";

const DAYS = 7;

function staffRow(id: string) {
  return { staff: { id } };
}

const ROWS = [staffRow("a"), staffRow("b"), staffRow("c")];
const KEYS = buildRotaRowKeys(ROWS);

function selection(
  anchorRow: string,
  anchorDay: number,
  focusRow: string,
  focusDay: number,
): RotaSelection {
  return { anchor: { row: anchorRow, day: anchorDay }, focus: { row: focusRow, day: focusDay } };
}

describe("buildRotaRowKeys", () => {
  it("keys staff rows by id and always ends with the open row", () => {
    expect(KEYS).toEqual(["staff:a", "staff:b", "staff:c", OPEN_ROW_KEY]);
  });

  it("keeps the open row selectable when every staff row is filtered out", () => {
    expect(buildRotaRowKeys([])).toEqual([OPEN_ROW_KEY]);
  });

  it("distinguishes staff who share a display name", () => {
    // Both are "Sam Taylor" on screen; only the id separates them.
    const keys = buildRotaRowKeys([staffRow("id-1"), staffRow("id-2")]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("resolveSelectionRect", () => {
  it("normalises a rectangle dragged up and to the left", () => {
    const rect = resolveSelectionRect(selection("staff:c", 5, "staff:a", 1), KEYS, DAYS);
    expect(rect).toEqual({ topRow: 0, bottomRow: 2, leftDay: 1, rightDay: 5 });
  });

  it("normalises a rectangle dragged down and to the right", () => {
    const rect = resolveSelectionRect(selection("staff:a", 1, "staff:c", 5), KEYS, DAYS);
    expect(rect).toEqual({ topRow: 0, bottomRow: 2, leftDay: 1, rightDay: 5 });
  });

  it("includes the open row when the rectangle reaches it", () => {
    const rect = resolveSelectionRect(selection("staff:b", 0, OPEN_ROW_KEY, 0), KEYS, DAYS);
    expect(rect).toEqual({ topRow: 1, bottomRow: 3, leftDay: 0, rightDay: 0 });
    expect(rectContains(rect, KEYS.indexOf(OPEN_ROW_KEY), 0)).toBe(true);
  });

  it("selects the open row alone", () => {
    const rect = resolveSelectionRect(
      selection(OPEN_ROW_KEY, 2, OPEN_ROW_KEY, 4),
      buildRotaRowKeys([]),
      DAYS,
    );
    expect(rect).toEqual({ topRow: 0, bottomRow: 0, leftDay: 2, rightDay: 4 });
  });

  it("returns null for a selection whose row was filtered away", () => {
    const filtered = buildRotaRowKeys([staffRow("a"), staffRow("c")]);
    expect(resolveSelectionRect(selection("staff:b", 0, "staff:c", 1), filtered, DAYS)).toBeNull();
  });

  it("returns null when no selection is held", () => {
    expect(resolveSelectionRect(null, KEYS, DAYS)).toBeNull();
  });

  it("counts the cells inside the rectangle", () => {
    const rect = resolveSelectionRect(selection("staff:a", 0, "staff:c", 3), KEYS, DAYS)!;
    expect(rectCellCount(rect)).toBe(12);
    expect(rectIsSingleCell(rect)).toBe(false);
  });
});

describe("rectContains", () => {
  const rect = resolveSelectionRect(selection("staff:a", 1, "staff:b", 3), KEYS, DAYS)!;

  it("includes cells inside the rectangle", () => {
    expect(rectContains(rect, 1, 2)).toBe(true);
  });

  it("excludes rows and days outside it", () => {
    expect(rectContains(rect, 2, 2)).toBe(false);
    expect(rectContains(rect, 1, 4)).toBe(false);
    expect(rectContains(rect, 1, 0)).toBe(false);
  });

  it("excludes everything when there is no rectangle", () => {
    expect(rectContains(null, 0, 0)).toBe(false);
  });
});

describe("normaliseSelection", () => {
  it("keeps a selection whose ends both still resolve", () => {
    const current = selection("staff:a", 0, "staff:c", 2);
    expect(normaliseSelection(current, KEYS, DAYS)).toBe(current);
  });

  it("drops a selection whose anchor row disappeared", () => {
    const filtered = buildRotaRowKeys([staffRow("b"), staffRow("c")]);
    expect(normaliseSelection(selection("staff:a", 0, "staff:c", 2), filtered, DAYS)).toBeNull();
  });

  it("drops a selection whose focus row disappeared", () => {
    const filtered = buildRotaRowKeys([staffRow("a"), staffRow("b")]);
    expect(normaliseSelection(selection("staff:a", 0, "staff:c", 2), filtered, DAYS)).toBeNull();
  });

  it("drops a selection reaching past the available days", () => {
    expect(normaliseSelection(selection("staff:a", 0, "staff:a", 6), KEYS, 5)).toBeNull();
  });

  it("passes null straight through", () => {
    expect(normaliseSelection(null, KEYS, DAYS)).toBeNull();
  });

  it("reports resolvability without mutating the selection", () => {
    expect(selectionIsResolvable(selection("staff:a", 0, "staff:b", 1), KEYS, DAYS)).toBe(true);
    expect(selectionIsResolvable(selection("staff:z", 0, "staff:b", 1), KEYS, DAYS)).toBe(false);
  });
});

describe("selectSingleCell / extendSelectionTo / collapseSelection", () => {
  it("puts both ends on one cell", () => {
    const single = selectSingleCell({ row: "staff:b", day: 3 });
    expect(single.anchor).toEqual(single.focus);
    expect(rectIsSingleCell(resolveSelectionRect(single, KEYS, DAYS))).toBe(true);
  });

  it("pins the anchor and moves only the focus when extending", () => {
    const extended = extendSelectionTo(selection("staff:a", 1, "staff:a", 1), {
      row: "staff:c",
      day: 4,
    });
    expect(extended.anchor).toEqual({ row: "staff:a", day: 1 });
    expect(extended.focus).toEqual({ row: "staff:c", day: 4 });
  });

  it("starts a fresh selection when extending from nothing", () => {
    const extended = extendSelectionTo(null, { row: "staff:b", day: 2 });
    expect(extended.anchor).toEqual(extended.focus);
  });

  it("collapses a range onto its focus cell", () => {
    const collapsed = collapseSelection(selection("staff:a", 0, "staff:c", 5));
    expect(collapsed).toEqual(selectSingleCell({ row: "staff:c", day: 5 }));
  });

  it("collapses null to null", () => {
    expect(collapseSelection(null)).toBeNull();
  });
});

describe("nextCellKey", () => {
  it("moves between days", () => {
    expect(nextCellKey({ row: "staff:b", day: 2 }, "ArrowRight", KEYS, DAYS)).toEqual({
      row: "staff:b",
      day: 3,
    });
    expect(nextCellKey({ row: "staff:b", day: 2 }, "ArrowLeft", KEYS, DAYS)).toEqual({
      row: "staff:b",
      day: 1,
    });
  });

  it("moves between rows and reaches the open row", () => {
    expect(nextCellKey({ row: "staff:c", day: 2 }, "ArrowDown", KEYS, DAYS)).toEqual({
      row: OPEN_ROW_KEY,
      day: 2,
    });
    expect(nextCellKey({ row: "staff:b", day: 2 }, "ArrowUp", KEYS, DAYS)).toEqual({
      row: "staff:a",
      day: 2,
    });
  });

  it("clamps at every edge instead of wrapping", () => {
    expect(nextCellKey({ row: "staff:a", day: 0 }, "ArrowUp", KEYS, DAYS)).toEqual({
      row: "staff:a",
      day: 0,
    });
    expect(nextCellKey({ row: "staff:a", day: 0 }, "ArrowLeft", KEYS, DAYS)).toEqual({
      row: "staff:a",
      day: 0,
    });
    expect(nextCellKey({ row: OPEN_ROW_KEY, day: 6 }, "ArrowDown", KEYS, DAYS)).toEqual({
      row: OPEN_ROW_KEY,
      day: 6,
    });
    expect(nextCellKey({ row: OPEN_ROW_KEY, day: 6 }, "ArrowRight", KEYS, DAYS)).toEqual({
      row: OPEN_ROW_KEY,
      day: 6,
    });
  });

  it("leaves an unknown row where it is rather than jumping to row zero", () => {
    const gone = { row: staffRowKey("removed"), day: 3 };
    expect(nextCellKey(gone, "ArrowDown", KEYS, DAYS)).toEqual(gone);
  });

  it("extends a rectangle step by step with Shift+Arrow", () => {
    let current: RotaSelection = selectSingleCell({ row: "staff:a", day: 1 });
    for (const key of ["ArrowRight", "ArrowRight", "ArrowDown"] as const) {
      current = extendSelectionTo(current, nextCellKey(current.focus, key, KEYS, DAYS));
    }
    expect(resolveSelectionRect(current, KEYS, DAYS)).toEqual({
      topRow: 0,
      bottomRow: 1,
      leftDay: 1,
      rightDay: 3,
    });
  });
});
