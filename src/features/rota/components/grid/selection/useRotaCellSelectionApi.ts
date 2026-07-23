import * as React from "react";
import type { RotaGridSelection } from "./useRotaGridSelection";
import type { RotaCellSelectionApi } from "../types";

/**
 * Adapts the grid's selection state into the narrow contract a cell consumes.
 *
 * Cells ask only about themselves and report raw interactions; deciding whether
 * a click starts a new rectangle or extends the current one belongs here, not in
 * the cell.
 */
export function useRotaCellSelectionApi(
  selection: RotaGridSelection,
  onCellKeyDown: RotaCellSelectionApi["onCellKeyDown"],
): RotaCellSelectionApi {
  return React.useMemo(
    () => ({
      enabled: selection.enabled,
      isSelected: (cell) => selection.isSelected(cell.row, cell.day),
      isAnchor: (cell) => selection.isAnchor(cell.row, cell.day),
      onCellMouseDown: (event, cell) => {
        if (event.shiftKey) selection.extendTo(cell);
        else selection.selectCell(cell);
      },
      // Entering the grid seeds a collapsed selection; it never disturbs a range
      // that keyboard extension is currently building.
      onCellFocus: (cell) => selection.ensureFocused(cell),
      onCellKeyDown,
    }),
    [onCellKeyDown, selection],
  );
}
