import {
  rectCellCount,
  rectDayCount,
  rectRowCount,
  type RotaSelectionRect,
} from "./rotaSelectionModel";
import type { DraftShift, RotaGridCell } from "../../../types";

export type RotaSelectionSummary = {
  /** Selected cells as rows of shifts, top to bottom then left to right. */
  rows: DraftShift[][][];
  cellCount: number;
  shiftCount: number;
  staffRowCount: number;
  dayCount: number;
  includesOpenRow: boolean;
};

/**
 * Reads the selected rectangle out of the visible rows.
 *
 * This is the one place the rectangle is turned into content, so the copy
 * payload and the screen-reader announcement can never disagree about what is
 * selected. The open-shift row is always the last visible row, which is what
 * makes `includesOpenRow` a position check rather than a key lookup.
 */
export function buildRotaSelectionSummary(
  rect: RotaSelectionRect | null,
  rowCells: readonly (readonly RotaGridCell[])[],
  rowCount: number,
): RotaSelectionSummary | null {
  if (!rect) return null;
  const rows: DraftShift[][][] = [];
  let shiftCount = 0;
  for (let row = rect.topRow; row <= rect.bottomRow; row += 1) {
    const cells: DraftShift[][] = [];
    for (let day = rect.leftDay; day <= rect.rightDay; day += 1) {
      const shifts = rowCells[row]?.[day]?.shifts ?? [];
      shiftCount += shifts.length;
      cells.push(shifts);
    }
    rows.push(cells);
  }
  const includesOpenRow = rect.bottomRow === rowCount - 1;
  return {
    rows,
    shiftCount,
    cellCount: rectCellCount(rect),
    staffRowCount: rectRowCount(rect) - (includesOpenRow ? 1 : 0),
    dayCount: rectDayCount(rect),
    includesOpenRow,
  };
}
