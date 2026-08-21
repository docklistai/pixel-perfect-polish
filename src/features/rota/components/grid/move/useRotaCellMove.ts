import * as React from "react";
import { buildRotaCellDragProps, rotaCellMoveClassName } from "./rotaCellMoveProps";
import { getRotaMoveSourceRefusal } from "./rotaMovePlan";
import type { RotaMoveApi } from "./rotaMoveApi";
import type { RotaCellKey } from "../selection/rotaSelectionModel";
import type { ShiftMenuHandlers } from "../types";
import type { DraftShift } from "../../../types";

/**
 * Everything one grid cell needs to take part in a move.
 *
 * Split out of the cell so the component stays a description of what it renders.
 * Note what is NOT decided here: whether a given destination is legal is the
 * planner's job, asked once per proposed target rather than once per cell, which
 * is what keeps a drag across the week linear instead of quadratic.
 */
export function useRotaCellMove({
  move,
  cellKey,
  shifts,
  firstShift,
  isEditing,
  readOnly,
  baseMenuHandlers,
}: {
  move: RotaMoveApi;
  cellKey: RotaCellKey;
  shifts: readonly DraftShift[];
  firstShift: DraftShift | undefined;
  isEditing: boolean;
  readOnly: boolean;
  baseMenuHandlers: ShiftMenuHandlers;
}) {
  const shiftsInCell = shifts.length;
  // A cell holding a split shift has no unambiguous "the shift" to pick up by
  // pointer, and an editor open in it owns its own pointer gestures.
  const canDrag = Boolean(move.pointerReady && firstShift && shiftsInCell === 1 && !isEditing);
  const isMoveSource = move.isSourceCell(cellKey);
  const moveTone = move.targetTone(cellKey);
  const isArmed = move.armedShiftId !== null;

  const dragProps = buildRotaCellDragProps({
    move,
    cellKey,
    shift: firstShift,
    shiftsInCell,
    canDrag,
  });

  // The menu offers a move on every device, including where no pointer drag
  // exists, so it answers the source rules directly rather than borrowing the
  // pointer gate. Archive and pending state are refused at arm time by the
  // state machine itself, which holds the live answer to both.
  const moveBlockedReason = firstShift
    ? getRotaMoveSourceRefusal({
        source: { shift: firstShift, cell: cellKey, shiftsInCell },
        readOnly,
        weekIsEditable: true,
        mutationPending: false,
      })
    : null;

  const menuHandlers = React.useMemo<ShiftMenuHandlers>(
    () => ({
      ...baseMenuHandlers,
      moveBlockedReason,
      onMove: () => {
        if (firstShift) move.arm(firstShift, cellKey, shiftsInCell);
      },
    }),
    [baseMenuHandlers, cellKey, firstShift, move, moveBlockedReason, shiftsInCell],
  );

  return {
    isArmed,
    isMoveSource,
    dragProps,
    menuHandlers,
    className: rotaCellMoveClassName({ isSource: isMoveSource, tone: moveTone, canDrag }),
    /** Non-null only while a move is armed, for the cell's accessible name. */
    moveState: isMoveSource ? ("source" as const) : isArmed ? moveTone : undefined,
    proposeTarget: () => move.proposeTarget(cellKey),
    commitHere: () => move.commitTo(cellKey),
  };
}
