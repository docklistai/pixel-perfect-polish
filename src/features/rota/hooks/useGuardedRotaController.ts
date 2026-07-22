import * as React from "react";
import type { useRotaDraftController } from "./useRotaDraftController";

type RotaController = ReturnType<typeof useRotaDraftController>;

/**
 * Blocks every direct controller mutation while the rota is read-only so an
 * edit from a drawer or the grid can never write to the demo store while live
 * data is on screen. Returns the controller unchanged when editing is allowed.
 */
export function buildGuardedRotaController(
  rota: RotaController,
  readOnly: boolean,
  onBlocked: () => void,
): RotaController {
  if (!readOnly) return rota;
  const blocked = () => onBlocked();
  const blockedAsync = async () => onBlocked();
  return {
    ...rota,
    confirmation: null,
    addShift: blocked,
    duplicateShiftAsOpen: blocked,
    duplicateShiftToNextDay: () => {
      onBlocked();
      return null;
    },
    removeShiftNow: blocked,
    restoreShift: blocked,
    updateShift: blocked,
    previewCopyPreviousWeek: async () => {
      onBlocked();
      throw new Error("Live rota is unavailable.");
    },
    copyPreviousWeek: blocked,
    requestCopyPreviousWeek: blocked,
    applyOpenShiftSuggestions: () => {
      onBlocked();
      return { suggestions: [], unfilled: [] };
    },
    handlePublish: blocked,
    requestRemoveShift: blocked,
    requestClearWeek: blocked,
    confirmPendingAction: blockedAsync,
    markShiftOpen: blocked,
  };
}

export function useGuardedRotaController(
  rota: RotaController,
  readOnly: boolean,
  onBlocked: () => void,
): RotaController {
  return React.useMemo(
    () => buildGuardedRotaController(rota, readOnly, onBlocked),
    [rota, readOnly, onBlocked],
  );
}
