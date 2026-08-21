import type { RotaCellKey } from "./selection/rotaSelectionModel";

/**
 * Moves DOM focus to one grid cell, addressed by its stable key.
 *
 * Cells already publish `data-rowkey` and `data-gridcol`, so focus follows the
 * model rather than a row position — which is what keeps it correct after a
 * refetch reorders or re-renders the rows underneath. Silently does nothing
 * when the cell is no longer rendered (filtered out, or its staff member gone),
 * because there is no honest place to put focus in that case and stealing it
 * elsewhere would be worse.
 */
export function focusRotaCell(grid: Element | null | undefined, cell: RotaCellKey): void {
  grid
    ?.querySelector<HTMLElement>(`[data-rowkey="${cell.row}"][data-gridcol="${cell.day}"]`)
    ?.focus();
}
