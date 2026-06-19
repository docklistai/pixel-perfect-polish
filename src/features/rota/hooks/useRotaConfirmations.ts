import * as React from "react";
import type { ShiftId } from "../types";

type MaybePromise<T> = T | Promise<T>;

export type RotaConfirmation =
  | { kind: "clear"; title: string; description: string; confirmLabel: string }
  | { kind: "remove"; shiftId: ShiftId; title: string; description: string; confirmLabel: string };

/**
 * Confirm-before-destructive-action flow for the rota week draft. Owns the
 * pending confirmation and runs the matching draft mutation on confirm; the
 * mutations themselves stay in useRotaWeekDrafts.
 */
export function useRotaConfirmations({
  clearWeek,
  removeShiftNow,
}: {
  clearWeek: () => MaybePromise<void>;
  removeShiftNow: (id: ShiftId) => MaybePromise<void>;
}) {
  const [confirmation, setConfirmation] = React.useState<RotaConfirmation | null>(null);

  const requestRemoveShift = (id: ShiftId) => {
    setConfirmation({
      kind: "remove",
      shiftId: id,
      title: "Remove this shift?",
      description: "This removes the shift from this week's draft.",
      confirmLabel: "Remove shift",
    });
  };

  const requestClearWeek = () => {
    setConfirmation({
      kind: "clear",
      title: "Clear this week?",
      description: "This removes every shift from the current week only.",
      confirmLabel: "Clear week",
    });
  };

  const confirmPendingAction = async () => {
    if (confirmation?.kind === "clear") await clearWeek();
    if (confirmation?.kind === "remove") await removeShiftNow(confirmation.shiftId);
    setConfirmation(null);
  };

  return {
    confirmation,
    requestRemoveShift,
    requestClearWeek,
    confirmPendingAction,
    clearConfirmation: () => setConfirmation(null),
  };
}
