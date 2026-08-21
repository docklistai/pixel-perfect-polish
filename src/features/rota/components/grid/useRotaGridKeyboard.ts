import * as React from "react";
import { nextCellKey, cellKeysEqual, type RotaCellKey } from "./selection/rotaSelectionModel";
import { focusRotaCell } from "./rotaCellFocus";
import type { RotaGridSelection } from "./selection/useRotaGridSelection";

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Grid-level key routing: arrow movement, Shift+Arrow range extension and the
 * Escape ladder. Cell-local shortcuts (Enter, F2, M) stay in the cell.
 *
 * Movement is decided in key space and only then applied to the DOM, so the
 * focused element is a consequence of the model rather than its source. When
 * rectangular selection is off — mobile, coarse pointer — arrows still move
 * exactly as they always have; only the selection updates are skipped.
 */
export function useRotaGridKeyboard({
  selection,
  dayCount,
  hasStaffRows,
}: {
  selection: RotaGridSelection;
  dayCount: number;
  /** Without staff rows the empty-state panel sits above the open-shift row. */
  hasStaffRows: boolean;
}) {
  const { enabled, rowKeys, isCollapsed, selectCell, extendTo, collapse, clear } = selection;
  const hasSelection = selection.selection !== null;

  return React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, cell: RotaCellKey): boolean => {
      const grid = event.currentTarget.closest("[data-rota-grid]");

      if (event.key === "Escape") {
        if (!enabled || !hasSelection) return false;
        event.preventDefault();
        // Editing is already out of the way by the time a cell sees Escape, so
        // the ladder continues: shrink the range, then drop it entirely.
        if (isCollapsed) clear();
        else collapse();
        return true;
      }

      if (!ARROW_KEYS.has(event.key)) return false;
      event.preventDefault();

      const target = nextCellKey(
        cell,
        event.key as "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
        rowKeys,
        dayCount,
      );

      // With no staff rows the row above the open shifts is the empty-state
      // panel, which is a real focusable gridcell but not a selectable one.
      if (event.key === "ArrowUp" && !hasStaffRows && cellKeysEqual(target, cell)) {
        grid?.querySelector<HTMLElement>('[data-gridrow="0"][data-gridcol="0"]')?.focus();
        return true;
      }

      if (enabled) {
        if (event.shiftKey) extendTo(target);
        else selectCell(target);
      }
      focusRotaCell(grid, target);
      return true;
    },
    [
      clear,
      collapse,
      dayCount,
      enabled,
      extendTo,
      hasSelection,
      hasStaffRows,
      isCollapsed,
      rowKeys,
      selectCell,
    ],
  );
}
