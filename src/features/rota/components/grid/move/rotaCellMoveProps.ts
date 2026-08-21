import type * as React from "react";
import type { RotaCellKey } from "../selection/rotaSelectionModel";
import type { RotaMoveApi } from "./rotaMoveApi";
import type { DraftShift } from "../../../types";

/**
 * The drag-and-drop wiring for one grid cell.
 *
 * Native HTML5 drag, deliberately: the browser supplies the drag image, and
 * `dragenter` fires once per cell crossed rather than once per pixel, so a drag
 * across the week costs a handful of state changes instead of one per frame. It
 * is also not keyboard-reachable and not available to touch, which is exactly
 * why the menu and keyboard paths exist rather than being an afterthought.
 *
 * A cell is a drop target whenever a move is armed — including a cell that could
 * never be a drag SOURCE, such as one already holding two shifts.
 */
export interface RotaCellDragProps {
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  onDragEnter?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  onDragEnd?: React.DragEventHandler<HTMLDivElement>;
}

export function buildRotaCellDragProps({
  move,
  cellKey,
  shift,
  shiftsInCell,
  canDrag,
}: {
  move: RotaMoveApi;
  cellKey: RotaCellKey;
  shift: DraftShift | undefined;
  shiftsInCell: number;
  canDrag: boolean;
}): RotaCellDragProps {
  const props: RotaCellDragProps = {};

  if (canDrag && shift) {
    props.draggable = true;
    props.onDragStart = (event) => {
      // Firefox refuses to start a drag without payload, and the shift id is the
      // only honest thing to put there. The move itself is decided from state,
      // never from `dataTransfer` — a drop from another window carries no armed
      // shift and is simply ignored.
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", shift.id);
      move.arm(shift, cellKey, shiftsInCell);
    };
    // Fires after `onDrop` when the drag was taken, by which point nothing is
    // armed and this is a no-op. It matters for the abandoned drag: released
    // over no cell at all, this is the only signal that it is over.
    props.onDragEnd = () => move.cancel();
  }

  if (move.armedShiftId) {
    props.onDragEnter = (event) => {
      event.preventDefault();
      move.proposeTarget(cellKey);
    };
    props.onDragOver = (event) => {
      if (!move.acceptsDrop(cellKey)) {
        event.dataTransfer.dropEffect = "none";
        return;
      }
      // Only a prevented dragover marks a valid drop zone, so refusing to
      // prevent it is what makes an illegal cell reject the drop outright.
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    };
    props.onDrop = (event) => {
      event.preventDefault();
      move.commitTo(cellKey);
    };
  }

  return props;
}

/**
 * Move state as class names.
 *
 * Shape, never colour alone — these cells already carry today, leave,
 * availability and selection tints, and another tint would be indistinguishable
 * from all of them. See the `.rota-cell-move-*` rules in `styles.css`, which
 * restate every state under forced colours.
 */
export function rotaCellMoveClassName({
  isSource,
  tone,
  canDrag,
}: {
  isSource: boolean;
  tone: ReturnType<RotaMoveApi["targetTone"]>;
  canDrag: boolean;
}): string {
  return [
    canDrag ? "rota-cell-draggable" : "",
    isSource ? "rota-cell-move-source" : "",
    tone === "valid" ? "rota-cell-move-target" : "",
    tone === "warn" ? "rota-cell-move-warn" : "",
    tone === "invalid" ? "rota-cell-move-invalid" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
