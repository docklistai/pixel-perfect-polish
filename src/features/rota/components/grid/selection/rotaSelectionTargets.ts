import { OPEN_ROW_KEY, type RotaRowKey, type RotaSelectionRect } from "./rotaSelectionModel";
import type { RotaBulkTarget } from "../bulk/rotaBulkPlan";
import type { RotaGridOpenRow, RotaGridStaffRow } from "../../../types";

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
    const isOpen = rowKey === OPEN_ROW_KEY;
    const staffRow = isOpen ? null : staffRows[rowIndex];
    if (!isOpen && !staffRow) continue;

    const targets: RotaBulkTarget[] = [];
    for (let day = rect.leftDay; day <= rect.rightDay; day += 1) {
      const cell = (isOpen ? openRow.cells : staffRow!.cells)[day];
      if (!cell) continue;
      targets.push({
        key: { row: rowKey, day },
        label: `${isOpen ? "Open shifts" : staffRow!.staff.name}, ${dayLabels[day] ?? ""}`,
        staffId: isOpen ? null : staffRow!.staff.id,
        staffRole: isOpen ? undefined : staffRow!.staff.role,
        openRow: isOpen,
        cell,
      });
    }
    if (targets.length > 0) rows.push(targets);
  }

  return rows;
}
