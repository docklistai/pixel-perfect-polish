import * as React from "react";
import { cellKeysEqual, type RotaCellKey } from "../selection/rotaSelectionModel";
import { resolveRotaCellTarget } from "../selection/rotaSelectionTargets";
import { focusRotaCell } from "../rotaCellFocus";
import { getRotaMoveSourceRefusal, planRotaShiftMove, rotaMoveTargetTone } from "./rotaMovePlan";
import {
  describeRotaMove,
  describeRotaMoveArmed,
  MOVE_CANCELLED_MESSAGE,
} from "./rotaMoveAnnouncements";
import { runRotaShiftMove } from "./runRotaShiftMove";
import { useRotaMoveKeyboard } from "./useRotaMoveKeyboard";
import { buildRotaMoveApi } from "./rotaMoveApi";
import type { ArmedMove, RotaMoveApi, RotaMoveContext, RotaMoveTargetTone } from "./rotaMoveApi";
import type { RotaCellSelectionApi } from "../types";
import type { DraftShift, ShiftId } from "../../../types";

/**
 * One armed shift, one proposed destination, one commit path.
 *
 * Pointer drag, the keyboard/menu path and the mobile tap path are three ways of
 * expressing the same intent, so they share this state machine rather than each
 * owning one — which is what stops them drifting into meaning different things.
 * See `runRotaShiftMove` for what a commit inherits by going through the grid's
 * ordinary shift update.
 */
export function useRotaShiftMove({
  pointerCapable,
  gridRef,
  announce,
  onShiftUpdate,
  resetKey,
  ...context
}: RotaMoveContext & {
  /** Same capability gate rectangular selection uses: width plus a fine pointer. */
  pointerCapable: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
  announce: (message: string) => void;
  onShiftUpdate?: (shiftId: ShiftId, patch: Partial<DraftShift>) => void | Promise<void>;
  /** Week, source and location identity. A change abandons any armed move. */
  resetKey: string;
}): { move: RotaMoveApi; handleCellKeyDown: RotaCellSelectionApi["onCellKeyDown"] } {
  const [armed, setArmed] = React.useState<ArmedMove | null>(null);
  const [target, setTarget] = React.useState<{
    key: RotaCellKey;
    tone: RotaMoveTargetTone;
  } | null>(null);

  // Snapshot: the callbacks below read fresh facts without taking a new identity.
  const latest = React.useRef({ ...context, armed, target });
  latest.current = { ...context, armed, target };

  // A different week, location or data source invalidates the armed shift the
  // same way it invalidates a selection rectangle.
  React.useEffect(() => {
    setArmed(null);
    setTarget(null);
  }, [resetKey]);

  const planFor = React.useCallback((cell: RotaCellKey) => {
    const now = latest.current;
    return planRotaShiftMove({
      ...now,
      source: now.armed,
      target: resolveRotaCellTarget({ cell, ...now }),
      dayCount: now.dayLabels.length,
    });
  }, []);

  const focusCell = React.useCallback(
    (cell: RotaCellKey) => {
      // The awaited refetch still has to paint; the cell is addressed by its
      // stable key either way, so one frame is enough.
      requestAnimationFrame(() => focusRotaCell(gridRef.current, cell));
    },
    [gridRef],
  );

  const cancel = React.useCallback(() => {
    const source = latest.current.armed;
    if (!source) return;
    setArmed(null);
    setTarget(null);
    announce(MOVE_CANCELLED_MESSAGE);
    focusCell(source.cell);
  }, [announce, focusCell]);

  const arm = React.useCallback(
    (shift: DraftShift, cell: RotaCellKey, shiftsInCell: number) => {
      const now = latest.current;
      const source: ArmedMove = { shift, cell, shiftsInCell };
      // Judged on its own first: an ambiguous, read-only, archived or busy
      // source is refused before anything is armed, so the manager is never left
      // carrying a shift that could never have landed anywhere.
      const refusal = getRotaMoveSourceRefusal({ ...now, source });
      if (refusal) return announce(refusal);
      setArmed(source);
      setTarget({ key: cell, tone: "none" });
      const label = resolveRotaCellTarget({ cell, ...now })?.label ?? "this cell";
      announce(describeRotaMoveArmed(shift, label));
    },
    [announce],
  );

  const proposeTarget = React.useCallback(
    (cell: RotaCellKey) => {
      const source = latest.current.armed;
      if (!source) return;
      const plan = planFor(cell);
      const tone = rotaMoveTargetTone(plan);
      const current = latest.current.target;
      // Nothing changed, so nothing to say. This is what stops the focus event
      // that follows arming — which proposes the source cell the shift is
      // already sitting in — from talking over the instructions just given.
      if (current && cellKeysEqual(current.key, cell) && current.tone === tone) return;
      setTarget({ key: cell, tone });
      announce(describeRotaMove(source.shift, plan));
    },
    [announce, planFor],
  );

  const commitTo = React.useCallback(
    (cell: RotaCellKey) => {
      const source = latest.current.armed;
      if (!source) return;
      const plan = planFor(cell);
      // A refusal keeps the move armed: the manager picked a cell that cannot
      // take this shift, not a cell they meant to abandon it on.
      if (plan.kind === "refused") return announce(plan.reason);
      setArmed(null);
      setTarget(null);
      if (plan.kind === "noop") {
        announce(MOVE_CANCELLED_MESSAGE);
        return focusCell(source.cell);
      }
      void runRotaShiftMove({
        source,
        target: cell,
        patch: plan.patch,
        targetLabel: plan.targetLabel,
        warning: plan.warning,
        onShiftUpdate,
        announce,
        focusCell,
      });
    },
    [announce, focusCell, onShiftUpdate, planFor],
  );

  const isArmed = React.useCallback(() => latest.current.armed !== null, []);
  const handleCellKeyDown = useRotaMoveKeyboard({ isArmed, onCommit: commitTo, onCancel: cancel });

  const actions = React.useMemo(
    () => ({ arm, proposeTarget, commitTo, cancel }),
    [arm, cancel, commitTo, proposeTarget],
  );
  const move = React.useMemo<RotaMoveApi>(
    () =>
      buildRotaMoveApi({
        armed,
        target,
        pointerReady:
          pointerCapable && !context.readOnly && context.weekIsEditable && !context.mutationPending,
        actions,
      }),
    [
      actions,
      armed,
      context.mutationPending,
      context.readOnly,
      context.weekIsEditable,
      pointerCapable,
      target,
    ],
  );

  return { move, handleCellKeyDown };
}
