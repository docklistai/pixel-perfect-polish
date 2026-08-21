import {
  OPEN_ROW_KEY,
  staffRowKey,
  type RotaCellKey,
  type RotaRowKey,
  type RotaSelectionRect,
} from "./rotaSelectionModel";
import type { RotaBulkTarget } from "../bulk/rotaBulkPlan";
import type { RotaGridOpenRow, RotaGridStaffRow } from "../../../types";

/**
 * One addressable grid cell, described the way every operation reads it.
 *
 * Bulk plans reach cells by iterating a rectangle and a shift move reaches one
 * cell by its stable key, but both need the same four facts about the target —
 * who it belongs to, whether it is the open row, what it is called, and what is
 * already in it. Building that shape in one place is what stops a move warning
 * about leave differently from a paste.
 *
 * Returns null when the row or the day does not exist in the current view, which
 * is the honest answer for a filtered-out staff member.
 */
export function buildRotaCellTarget({
  rowKey,
  day,
  staffRow,
  openRow,
  dayLabels,
}: {
  rowKey: RotaRowKey;
  day: number;
  /** The resolved staff row, or null when `rowKey` is the open-shifts row. */
  staffRow: RotaGridStaffRow | null | undefined;
  openRow: RotaGridOpenRow;
  dayLabels: readonly string[];
}): RotaBulkTarget | null {
  const isOpen = rowKey === OPEN_ROW_KEY;
  if (!isOpen && !staffRow) return null;
  const cell = (isOpen ? openRow.cells : staffRow!.cells)[day];
  if (!cell) return null;
  return {
    key: { row: rowKey, day },
    label: `${isOpen ? "Open shifts" : staffRow!.staff.name}, ${dayLabels[day] ?? ""}`,
    staffId: isOpen ? null : staffRow!.staff.id,
    staffRole: isOpen ? undefined : staffRow!.staff.role,
    openRow: isOpen,
    cell,
  };
}

/**
 * The target for one cell key.
 *
 * Rows are found by identity, never by position: a single cell is addressed
 * long after the rectangle that produced it is gone, and the visible row order
 * can change underneath it when the roster refetches or a filter is applied.
 */
export function resolveRotaCellTarget({
  cell,
  staffRows,
  openRow,
  dayLabels,
}: {
  cell: RotaCellKey;
  staffRows: readonly RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  dayLabels: readonly string[];
}): RotaBulkTarget | null {
  return buildRotaCellTarget({
    rowKey: cell.row,
    day: cell.day,
    staffRow:
      cell.row === OPEN_ROW_KEY
        ? null
        : staffRows.find((row) => staffRowKey(row.staff.id) === cell.row),
    openRow,
    dayLabels,
  });
}

/**
 * The selected rectangle as rows of addressable targets, in the order they
 * appear on screen.
 *
 * Row order is the visible order, so a plan built from this reads the same way
 * the grid does — and a row that is filtered out simply is not here, which is
 * what stops a bulk operation reaching a cell the manager cannot see.
 */
export function buildRotaBulkTargets({
  rect,
  rowKeys,
  staffRows,
  openRow,
  dayLabels,
}: {
  rect: RotaSelectionRect | null;
  rowKeys: readonly RotaRowKey[];
  staffRows: readonly RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  dayLabels: readonly string[];
}): RotaBulkTarget[][] {
  if (!rect) return [];
  const rows: RotaBulkTarget[][] = [];

  for (let rowIndex = rect.topRow; rowIndex <= rect.bottomRow; rowIndex += 1) {
    const rowKey = rowKeys[rowIndex];
    if (rowKey === undefined) continue;
    const staffRow = rowKey === OPEN_ROW_KEY ? null : staffRows[rowIndex];

    const targets: RotaBulkTarget[] = [];
    for (let day = rect.leftDay; day <= rect.rightDay; day += 1) {
      const target = buildRotaCellTarget({ rowKey, day, staffRow, openRow, dayLabels });
      if (target) targets.push(target);
    }
    if (targets.length > 0) rows.push(targets);
  }

  return rows;
}
