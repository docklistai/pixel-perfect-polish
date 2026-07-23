/**
 * Pure rectangular-selection model for the rota grid.
 *
 * Selection is stored as two *stable cell identities* — never DOM indexes.
 * A row is identified by `staff:<staffId>` or the literal `open`; a column is
 * the day index 0–6, which is fixed for every rota week. Positions are resolved
 * against the currently visible row order at render time, so a filtered-out or
 * departed staff member can never contribute a hidden selected cell: their key
 * simply is not in `rowKeys`, and a selection that depends on it is dropped.
 *
 * Duplicate staff names are safe because the key carries the id, not the name.
 */

export const OPEN_ROW_KEY = "open";

export type RotaRowKey = string;

/** One addressable grid cell: a stable row identity plus a day column. */
export type RotaCellKey = { row: RotaRowKey; day: number };

/** Anchor stays put while the focus end moves; the rectangle spans both. */
export type RotaSelection = { anchor: RotaCellKey; focus: RotaCellKey };

export type RotaSelectionRect = {
  topRow: number;
  bottomRow: number;
  leftDay: number;
  rightDay: number;
};

export type RotaSelectionArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

export function staffRowKey(staffId: string): RotaRowKey {
  return `staff:${staffId}`;
}

/**
 * Visible row identities, top to bottom. The open-shift row is always last and
 * always present, so it stays selectable even when every staff row is filtered
 * out.
 */
export function buildRotaRowKeys(staffRows: readonly { staff: { id: string } }[]): RotaRowKey[] {
  return [...staffRows.map((row) => staffRowKey(row.staff.id)), OPEN_ROW_KEY];
}

export function cellKeysEqual(a: RotaCellKey, b: RotaCellKey): boolean {
  return a.row === b.row && a.day === b.day;
}

function clampDay(day: number, dayCount: number): number {
  if (dayCount <= 0) return 0;
  return Math.min(Math.max(day, 0), dayCount - 1);
}

/** True when both ends of the selection still exist in the visible grid. */
export function selectionIsResolvable(
  selection: RotaSelection,
  rowKeys: readonly RotaRowKey[],
  dayCount: number,
): boolean {
  return (
    rowKeys.includes(selection.anchor.row) &&
    rowKeys.includes(selection.focus.row) &&
    selection.anchor.day >= 0 &&
    selection.anchor.day < dayCount &&
    selection.focus.day >= 0 &&
    selection.focus.day < dayCount
  );
}

/**
 * Drops a selection whose anchor or focus no longer resolves. Returning null
 * rather than repairing is deliberate: a half-resolvable rectangle would either
 * silently change which rows it covers or leave an endpoint off-screen.
 */
export function normaliseSelection(
  selection: RotaSelection | null,
  rowKeys: readonly RotaRowKey[],
  dayCount: number,
): RotaSelection | null {
  if (!selection) return null;
  return selectionIsResolvable(selection, rowKeys, dayCount) ? selection : null;
}

/** The rectangle in visible-row/day index space, or null when unresolvable. */
export function resolveSelectionRect(
  selection: RotaSelection | null,
  rowKeys: readonly RotaRowKey[],
  dayCount: number,
): RotaSelectionRect | null {
  if (!selection || !selectionIsResolvable(selection, rowKeys, dayCount)) return null;
  const anchorRow = rowKeys.indexOf(selection.anchor.row);
  const focusRow = rowKeys.indexOf(selection.focus.row);
  return {
    topRow: Math.min(anchorRow, focusRow),
    bottomRow: Math.max(anchorRow, focusRow),
    leftDay: Math.min(selection.anchor.day, selection.focus.day),
    rightDay: Math.max(selection.anchor.day, selection.focus.day),
  };
}

export function rectContains(
  rect: RotaSelectionRect | null,
  rowIndex: number,
  dayIndex: number,
): boolean {
  if (!rect) return false;
  return (
    rowIndex >= rect.topRow &&
    rowIndex <= rect.bottomRow &&
    dayIndex >= rect.leftDay &&
    dayIndex <= rect.rightDay
  );
}

export function rectRowCount(rect: RotaSelectionRect): number {
  return rect.bottomRow - rect.topRow + 1;
}

export function rectDayCount(rect: RotaSelectionRect): number {
  return rect.rightDay - rect.leftDay + 1;
}

export function rectCellCount(rect: RotaSelectionRect): number {
  return rectRowCount(rect) * rectDayCount(rect);
}

export function rectIsSingleCell(rect: RotaSelectionRect | null): boolean {
  return rect !== null && rectCellCount(rect) === 1;
}

/** A fresh single-cell selection: both ends on the same cell. */
export function selectSingleCell(cell: RotaCellKey): RotaSelection {
  return { anchor: cell, focus: cell };
}

/** Shift-click / Shift+Arrow: the anchor is pinned, only the focus end moves. */
export function extendSelectionTo(
  selection: RotaSelection | null,
  cell: RotaCellKey,
): RotaSelection {
  if (!selection) return selectSingleCell(cell);
  return { anchor: selection.anchor, focus: cell };
}

/** Escape step one: keep the active cell, discard the range around it. */
export function collapseSelection(selection: RotaSelection | null): RotaSelection | null {
  if (!selection) return null;
  return selectSingleCell(selection.focus);
}

/**
 * The neighbour of `cell` in the given direction, clamped at every edge so a
 * selection can never run off the grid. An unknown row key returns the cell
 * unchanged rather than jumping to row zero.
 */
export function nextCellKey(
  cell: RotaCellKey,
  key: RotaSelectionArrowKey,
  rowKeys: readonly RotaRowKey[],
  dayCount: number,
): RotaCellKey {
  const rowIndex = rowKeys.indexOf(cell.row);
  if (rowIndex === -1) return cell;
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const day = clampDay(cell.day + (key === "ArrowRight" ? 1 : -1), dayCount);
    return { row: cell.row, day };
  }
  const nextRow = Math.min(
    Math.max(rowIndex + (key === "ArrowDown" ? 1 : -1), 0),
    rowKeys.length - 1,
  );
  return { row: rowKeys[nextRow]!, day: clampDay(cell.day, dayCount) };
}
