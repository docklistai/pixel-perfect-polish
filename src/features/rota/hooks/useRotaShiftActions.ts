import * as React from "react";
import { toast } from "sonner";
import type { useRotaDraftController } from "./useRotaDraftController";
import type { ShiftId } from "../types";

type RotaController = ReturnType<typeof useRotaDraftController>;

/**
 * Toast-emitting cell and bulk action handlers for the rota grid, plus the
 * open-shift fill summary. In live read-only mode every mutating action is
 * blocked with a clear message so a demo-store edit can never masquerade as a
 * saved live change. In demo mode the handlers behave exactly as before.
 */
export function useRotaShiftActions(rota: RotaController) {
  const [fillSummary, setFillSummary] = React.useState<string | null>(null);
  const readOnly = rota.readOnly;

  const block = React.useCallback(() => {
    toast.info("Not available in live mode yet", {
      description: "You're viewing the saved live rota — editing isn't available yet.",
    });
  }, []);

  const findShift = (shiftId: string) => rota.draftShifts.find((s) => s.id === shiftId);
  const colourLabel = (presetId: string) =>
    presetId.charAt(0).toUpperCase() + presetId.slice(1).toLowerCase();

  const handleApplySuggestions = () => {
    if (readOnly) return block();
    const suggestions = rota.applyOpenShiftSuggestions();
    setFillSummary(
      suggestions.length > 0
        ? `${suggestions.length} open shift${suggestions.length === 1 ? "" : "s"} filled. Review the assignments before publishing.`
        : "No open shifts could be filled from the current staff list.",
    );
  };

  const handleCopyLastWeek = () => {
    if (readOnly) return block();
    rota.copyPreviousWeek();
    toast.success("Pattern copied", {
      description: "Last week's pattern applied as a draft. Review before publishing.",
    });
  };

  const handleDuplicateShift = (shiftId: string) => {
    if (readOnly) return block();
    const newId = rota.duplicateShiftToNextDay(shiftId);
    if (!newId) return;
    toast.success("Shift duplicated", {
      description: "Copied to the next day (draft).",
      action: {
        label: "Undo",
        onClick: () => {
          rota.removeShiftNow(newId);
          toast.info("Undone", { description: "Duplicate removed." });
        },
      },
    });
  };

  const handleMarkShiftOpen = (shiftId: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId);
    rota.markShiftOpen(shiftId);
    toast.info("Marked as open", {
      description: "Shift now needs cover (draft).",
      ...(prev && prev.staffId
        ? {
            action: {
              label: "Undo",
              onClick: () => {
                rota.updateShift(shiftId, {
                  staffId: prev.staffId,
                  status: "scheduled",
                  tone: prev.tone === "open" ? "info" : prev.tone,
                });
                toast.info("Reverted", { description: "Shift restored." });
              },
            },
          }
        : {}),
    });
  };

  const handleClearShift = (shiftId: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId);
    if (!prev) return;
    const restored = {
      ...prev,
      status: prev.staffId ? ("scheduled" as const) : ("open" as const),
    };
    rota.removeShiftNow(shiftId);
    toast.warning("Shift cleared", {
      description: "Removed from this week's draft.",
      action: {
        label: "Undo",
        onClick: () => {
          rota.restoreShift(restored);
          toast.success("Restored", { description: "Shift restored." });
        },
      },
    });
  };

  const handleSetShiftDept = (shiftId: string, dept: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId)?.deptOverride;
    rota.updateShift(shiftId, { deptOverride: dept, edited: true });
    toast.info("Department changed", {
      description: `Shift set to ${dept} (draft).`,
      action: {
        label: "Undo",
        onClick: () => {
          rota.updateShift(shiftId, { deptOverride: prev });
          toast.info("Reverted", { description: "Department change undone." });
        },
      },
    });
  };

  const handleSetShiftColour = (shiftId: string, presetId: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId)?.colourOverride;
    rota.updateShift(shiftId, { colourOverride: presetId });
    toast.success("Colour overridden", {
      description: `Chip now shows in ${colourLabel(presetId)}.`,
      action: {
        label: "Undo",
        onClick: () => {
          rota.updateShift(shiftId, { colourOverride: prev });
          toast.info("Colour reset", { description: "Chip back to previous colour." });
        },
      },
    });
  };

  const handleResetShiftColour = (shiftId: string) => {
    if (readOnly) return block();
    const prev = findShift(shiftId);
    rota.updateShift(shiftId, { colourOverride: undefined, deptOverride: undefined });
    toast.info("Colour reset", {
      description: "Chip back to department default.",
      ...(prev
        ? {
            action: {
              label: "Undo",
              onClick: () => {
                rota.updateShift(shiftId, {
                  colourOverride: prev.colourOverride,
                  deptOverride: prev.deptOverride,
                });
                toast.info("Restored", { description: "Override restored." });
              },
            },
          }
        : {}),
    });
  };

  return {
    fillSummary,
    setFillSummary,
    block,
    handleApplySuggestions,
    handleCopyLastWeek,
    handleDuplicateShift,
    handleMarkShiftOpen: handleMarkShiftOpen as (shiftId: ShiftId) => void,
    handleClearShift,
    handleSetShiftDept,
    handleSetShiftColour,
    handleResetShiftColour,
  };
}
