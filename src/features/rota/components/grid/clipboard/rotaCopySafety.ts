import type { DraftShift } from "../../../types";
import { roleHasAmbiguousSlash } from "../bulk/rotaSlashRoleGuard";

export type AmbiguousSlashCell = { row: number; column: number };

/** Finds the first selected cell that cannot safely round-trip through TSV. */
export function findAmbiguousSlashCell(rows: readonly (readonly DraftShift[][])[]) {
  for (let row = 0; row < rows.length; row += 1) {
    for (let column = 0; column < (rows[row]?.length ?? 0); column += 1) {
      if (rows[row]?.[column]?.some((shift) => roleHasAmbiguousSlash(shift.role))) {
        return { row, column } satisfies AmbiguousSlashCell;
      }
    }
  }
  return null;
}
