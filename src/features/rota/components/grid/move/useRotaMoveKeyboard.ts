import * as React from "react";
import type { RotaCellSelectionApi } from "../types";
import type { RotaCellKey } from "../selection/rotaSelectionModel";

/**
 * Keys an armed move claims, routed ahead of bulk shortcuts and the selection
 * ladder.
 *
 * Ordering is the whole point. Escape has to cancel the move before it collapses
 * or clears a selection rectangle, and Enter/Space have to place the shift
 * before the cell's own shortcut opens the shift drawer. Both are only claimed
 * while a move is actually armed, so with nothing in hand every key behaves
 * exactly as it always has.
 *
 * Arrows are deliberately not claimed: the grid's existing navigation already
 * moves focus, and whichever cell receives it reports itself as the proposed
 * destination. Re-implementing movement here would be a second, divergent idea
 * of what "the next cell" means.
 */
export function useRotaMoveKeyboard({
  isArmed,
  onCommit,
  onCancel,
}: {
  isArmed: () => boolean;
  onCommit: (cell: RotaCellKey) => void;
  onCancel: () => void;
}): RotaCellSelectionApi["onCellKeyDown"] {
  return React.useCallback(
    (event, cell) => {
      if (!isArmed()) return false;
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return true;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onCommit(cell);
        return true;
      }
      return false;
    },
    [isArmed, onCancel, onCommit],
  );
}
