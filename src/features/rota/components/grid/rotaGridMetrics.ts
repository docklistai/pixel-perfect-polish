import type { RotaGridCell } from "../../types";

/** Total shifts sitting on the unassigned "open shifts" row. */
export function countOpenShifts(cells: readonly RotaGridCell[]): number {
  return cells.reduce((total, cell) => total + cell.shifts.length, 0);
}
