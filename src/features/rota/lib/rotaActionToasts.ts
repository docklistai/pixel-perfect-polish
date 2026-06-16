import { toast } from "sonner";
import type { DraftShift, ShiftId } from "../types";

type DraftUndoActions = {
  removeShiftNow: (id: ShiftId) => unknown;
  restoreShift: (shift: DraftShift) => unknown;
  updateShift: (id: ShiftId, patch: Partial<DraftShift>) => unknown;
};

function colourLabel(presetId: string) {
  return presetId.charAt(0).toUpperCase() + presetId.slice(1).toLowerCase();
}

export function toastDuplicateDraft(actions: DraftUndoActions, newId: ShiftId) {
  toast.success("Shift duplicated", {
    description: "Copied to the next day (draft).",
    action: {
      label: "Undo",
      onClick: () => {
        actions.removeShiftNow(newId);
        toast.info("Undone", { description: "Duplicate removed." });
      },
    },
  });
}

export function toastMarkedOpenDraft(
  actions: DraftUndoActions,
  shiftId: ShiftId,
  previous: DraftShift | undefined,
) {
  toast.info("Marked as open", {
    description: "Shift now needs cover (draft).",
    ...(previous?.staffId
      ? {
          action: {
            label: "Undo",
            onClick: () => {
              actions.updateShift(shiftId, {
                staffId: previous.staffId,
                status: "scheduled",
                tone: previous.tone === "open" ? "info" : previous.tone,
              });
              toast.info("Reverted", { description: "Shift restored." });
            },
          },
        }
      : {}),
  });
}

export function toastClearedDraft(actions: DraftUndoActions, restored: DraftShift) {
  toast.warning("Shift cleared", {
    description: "Removed from this week's draft.",
    action: {
      label: "Undo",
      onClick: () => {
        actions.restoreShift(restored);
        toast.success("Restored", { description: "Shift restored." });
      },
    },
  });
}

export function toastDepartmentDraft(
  actions: DraftUndoActions,
  shiftId: ShiftId,
  dept: string,
  previous: string | undefined,
) {
  toast.info("Department changed", {
    description: `Shift set to ${dept} (draft).`,
    action: {
      label: "Undo",
      onClick: () => {
        actions.updateShift(shiftId, { deptOverride: previous });
        toast.info("Reverted", { description: "Department change undone." });
      },
    },
  });
}

export function toastColourDraft(
  actions: DraftUndoActions,
  shiftId: ShiftId,
  presetId: string,
  previous: string | undefined,
) {
  toast.success("Colour overridden", {
    description: `Chip now shows in ${colourLabel(presetId)}.`,
    action: {
      label: "Undo",
      onClick: () => {
        actions.updateShift(shiftId, { colourOverride: previous });
        toast.info("Colour reset", { description: "Chip back to previous colour." });
      },
    },
  });
}

export function toastResetColourDraft(
  actions: DraftUndoActions,
  shiftId: ShiftId,
  previous: DraftShift | undefined,
) {
  toast.info("Colour reset", {
    description: "Chip back to department default.",
    ...(previous
      ? {
          action: {
            label: "Undo",
            onClick: () => {
              actions.updateShift(shiftId, {
                colourOverride: previous.colourOverride,
                deptOverride: previous.deptOverride,
              });
              toast.info("Restored", { description: "Override restored." });
            },
          },
        }
      : {}),
  });
}
