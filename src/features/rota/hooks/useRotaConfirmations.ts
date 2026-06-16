import * as React from "react";
import type { ShiftId } from "../types";

type MaybePromise<T> = T | Promise<T>;

export type RotaConfirmation =
  | { kind: "template"; title: string; description: string; confirmLabel: string }
  | { kind: "clear"; title: string; description: string; confirmLabel: string }
  | { kind: "remove"; shiftId: ShiftId; title: string; description: string; confirmLabel: string };

/**
 * Confirm-before-destructive-action flow for the rota week draft. Owns the
 * pending confirmation and runs the matching draft mutation on confirm; the
 * mutations themselves stay in useRotaWeekDrafts.
 */
export function useRotaConfirmations({
  draftIsPristine,
  applyStandardTemplate,
  clearWeek,
  removeShiftNow,
}: {
  /** True when the draft has no unpublished edits and has never been published. */
  draftIsPristine: boolean;
  applyStandardTemplate: () => MaybePromise<void>;
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

  const requestApplyStandardTemplate = () => {
    if (draftIsPristine) {
      applyStandardTemplate();
      return;
    }
    setConfirmation({
      kind: "template",
      title: "Apply standard cover?",
      description: "This replaces this week's draft with the standard pattern.",
      confirmLabel: "Apply template",
    });
  };

  // Generate dialog already shows a preview-and-confirm step,
  // so it can apply directly without a second ConfirmDialog.

  const requestClearWeek = () => {
    setConfirmation({
      kind: "clear",
      title: "Clear this week?",
      description: "This removes every shift from the current week only.",
      confirmLabel: "Clear week",
    });
  };

  const confirmPendingAction = async () => {
    if (confirmation?.kind === "template") await applyStandardTemplate();
    if (confirmation?.kind === "clear") await clearWeek();
    if (confirmation?.kind === "remove") await removeShiftNow(confirmation.shiftId);
    setConfirmation(null);
  };

  return {
    confirmation,
    requestRemoveShift,
    requestApplyStandardTemplate,
    requestClearWeek,
    confirmPendingAction,
    clearConfirmation: () => setConfirmation(null),
  };
}
