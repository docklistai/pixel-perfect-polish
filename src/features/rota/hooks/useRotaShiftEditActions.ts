import type { useRotaDraftController } from "./useRotaDraftController";
import type { ShiftId } from "../types";
import {
  toastClearedDraft,
  toastColourDraft,
  toastDepartmentDraft,
  toastMarkedOpenDraft,
  toastResetColourDraft,
} from "../lib/rotaActionToasts";

type RotaController = ReturnType<typeof useRotaDraftController>;

/**
 * Editing one shift in place: mark open, clear, set department, set or reset
 * colour.
 *
 * Every handler here has the same shape — refuse when read-only, remember the
 * previous value, await the write, then offer an undo toast only on the demo
 * draft, because live writes are already reversible through the rota history.
 * They were split out of `useRotaShiftActions` so that hook is left with the
 * copy/duplicate/repeat family, whose handlers each answer a different question.
 */
export function useRotaShiftEditActions(rota: RotaController, block: () => void) {
  const readOnly = rota.readOnly;
  const isLive = rota.source === "live";
  const findShift = (shiftId: string) => rota.draftShifts.find((s) => s.id === shiftId);

  const handleMarkShiftOpen = async (shiftId: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId);
    try {
      await rota.markShiftOpen(shiftId);
    } catch {
      return;
    }
    if (isLive) return;
    toastMarkedOpenDraft(rota, shiftId, prev);
  };

  const handleClearShift = async (shiftId: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId);
    if (!prev) return;
    const restored = {
      ...prev,
      status: prev.staffId ? ("scheduled" as const) : ("open" as const),
    };
    try {
      await rota.removeShiftNow(shiftId);
    } catch {
      return;
    }
    if (isLive) return;
    toastClearedDraft(rota, restored);
  };

  const handleSetShiftDept = async (shiftId: string, dept: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId)?.deptOverride;
    try {
      await rota.updateShift(shiftId, { deptOverride: dept, edited: true });
    } catch {
      return;
    }
    if (isLive) return;
    toastDepartmentDraft(rota, shiftId, dept, prev);
  };

  const handleSetShiftColour = async (shiftId: string, presetId: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId)?.colourOverride;
    try {
      await rota.updateShift(shiftId, { colourOverride: presetId });
    } catch {
      return;
    }
    if (isLive) return;
    toastColourDraft(rota, shiftId, presetId, prev);
  };

  const handleResetShiftColour = async (shiftId: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId);
    try {
      await rota.updateShift(shiftId, { colourOverride: undefined, deptOverride: undefined });
    } catch {
      return;
    }
    if (isLive) return;
    toastResetColourDraft(rota, shiftId, prev);
  };

  return {
    handleMarkShiftOpen: handleMarkShiftOpen as (shiftId: ShiftId) => Promise<void>,
    handleClearShift,
    handleSetShiftDept,
    handleSetShiftColour,
    handleResetShiftColour,
  };
}
