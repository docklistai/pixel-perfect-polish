import { cellKeysEqual, type RotaCellKey } from "../selection/rotaSelectionModel";
import type {
  DraftShift,
  RotaGridOpenRow,
  RotaGridStaffRow,
  ShiftId,
  StaffMember,
} from "../../../types";

/**
 * The contract a grid cell has with an in-progress move, and how it is built.
 *
 * Kept apart from both the rules and the state machine because three surfaces
 * speak it: the pure planner decides with it, the hook holds it, and every grid
 * cell reads it to draw itself. A shared module is what keeps those three from
 * growing three slightly different ideas of what "armed" means.
 */

/** How a cell should present itself as a destination for the armed shift. */
export type RotaMoveTargetTone = "none" | "valid" | "warn" | "invalid";

/** The shift a manager has picked up, and where it came from. */
export interface ArmedMove {
  shift: DraftShift;
  cell: RotaCellKey;
  /** Shifts in the source cell. More than one has no unambiguous "the shift". */
  shiftsInCell: number;
}

/** Everything a move decision reads, snapshotted so callbacks stay stable. */
export interface RotaMoveContext {
  staffRows: readonly RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  dayLabels: readonly string[];
  assignableStaff: readonly StaffMember[];
  readOnly: boolean;
  weekIsEditable: boolean;
  /** A rota write is in flight; the runner would refuse a second one anyway. */
  mutationPending: boolean;
}

/** What a grid cell may ask and tell about an in-progress move. */
export interface RotaMoveApi {
  /** A pointer drag may be started at all: fine pointer, editable, idle. */
  pointerReady: boolean;
  armedShiftId: ShiftId | null;
  isSourceCell: (cell: RotaCellKey) => boolean;
  targetTone: (cell: RotaCellKey) => RotaMoveTargetTone;
  /** True when this cell is the current destination and would take a drop. */
  acceptsDrop: (cell: RotaCellKey) => boolean;
  arm: (shift: DraftShift, cell: RotaCellKey, shiftsInCell: number) => void;
  proposeTarget: (cell: RotaCellKey) => void;
  commitTo: (cell: RotaCellKey) => void;
  cancel: () => void;
}

/**
 * The cell-facing view of the current move.
 *
 * Every accessor is O(1) on purpose. A cell asks about itself while the grid
 * re-renders all of them, so anything that walked the roster here would turn one
 * hovered cell into quadratic work across the week.
 */
export function buildRotaMoveApi({
  armed,
  target,
  pointerReady,
  actions,
}: {
  armed: ArmedMove | null;
  target: { key: RotaCellKey; tone: RotaMoveTargetTone } | null;
  pointerReady: boolean;
  actions: Pick<RotaMoveApi, "arm" | "proposeTarget" | "commitTo" | "cancel">;
}): RotaMoveApi {
  return {
    pointerReady,
    armedShiftId: armed?.shift.id ?? null,
    isSourceCell: (cell) => Boolean(armed && cellKeysEqual(armed.cell, cell)),
    targetTone: (cell) => (target && cellKeysEqual(target.key, cell) ? target.tone : "none"),
    acceptsDrop: (cell) =>
      Boolean(target && cellKeysEqual(target.key, cell) && target.tone !== "invalid"),
    ...actions,
  };
}
