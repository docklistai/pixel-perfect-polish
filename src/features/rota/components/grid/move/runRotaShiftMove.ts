import { describeRotaMoveResult, MOVE_FAILED_MESSAGE } from "./rotaMoveAnnouncements";
import type { RotaCellKey } from "../selection/rotaSelectionModel";
import type { ArmedMove } from "./rotaMoveApi";
import type { DraftShift, ShiftId } from "../../../types";

/**
 * Writes one move and reports what happened.
 *
 * Kept out of the state machine because it is the only part that awaits: the
 * update it calls is the grid's ordinary shift update, which already serialises
 * against other rota writes and refetches the authoritative week before it
 * resolves. So "success" here means the server has been re-read, not that a
 * request was sent.
 *
 * Failure needs no rollback. Nothing was moved optimistically, so the shift is
 * still exactly where the manager last saw it; the mutation runner owns the
 * error toast, and all that is left to restore is focus.
 */
export async function runRotaShiftMove({
  source,
  target,
  patch,
  targetLabel,
  warning,
  onShiftUpdate,
  announce,
  focusCell,
}: {
  source: ArmedMove;
  target: RotaCellKey;
  patch: Partial<DraftShift>;
  targetLabel: string;
  warning: string | null;
  onShiftUpdate?: (shiftId: ShiftId, patch: Partial<DraftShift>) => void | Promise<void>;
  announce: (message: string) => void;
  focusCell: (cell: RotaCellKey) => void;
}): Promise<void> {
  try {
    await onShiftUpdate?.(source.shift.id, patch);
    announce(describeRotaMoveResult(source.shift, targetLabel, warning));
    focusCell(target);
  } catch {
    announce(MOVE_FAILED_MESSAGE);
    focusCell(source.cell);
  }
}
