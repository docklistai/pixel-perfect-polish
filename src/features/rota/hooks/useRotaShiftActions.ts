import * as React from "react";
import { toast } from "sonner";
import type { useRotaDraftController } from "./useRotaDraftController";
import type { ShiftId } from "../types";
import {
  toastClearedDraft,
  toastColourDraft,
  toastDepartmentDraft,
  toastDuplicateDraft,
  toastMarkedOpenDraft,
  toastResetColourDraft,
} from "../lib/rotaActionToasts";
import {
  buildRepeatShiftFeedback,
  executeRepeatShiftPlan,
  planRepeatShift,
  type RepeatShiftResult,
} from "../lib/repeatShift";

type RotaController = ReturnType<typeof useRotaDraftController>;

export function useRotaShiftActions(rota: RotaController) {
  const [fillSummary, setFillSummary] = React.useState<string | null>(null);
  const readOnly = rota.readOnly;
  const isLive = rota.source === "live";

  const block = React.useCallback(() => {
    toast.info("Live rota unavailable", {
      description: "The workspace rota is still loading or couldn't be loaded.",
    });
  }, []);
  const blockDraftOnly = React.useCallback(() => {
    toast.info("Not available for live rota", {
      description: "This draft-only shortcut is not persisted to live rota data yet.",
    });
  }, []);

  const findShift = (shiftId: string) => rota.draftShifts.find((s) => s.id === shiftId);

  const handleApplySuggestions = () => {
    if (readOnly) return block();
    if (isLive) return blockDraftOnly();
    const suggestions = rota.applyOpenShiftSuggestions();
    setFillSummary(
      suggestions.length > 0
        ? `${suggestions.length} open shift${suggestions.length === 1 ? "" : "s"} filled. Review the assignments before publishing.`
        : "No open shifts could be filled from the current staff list.",
    );
  };

  const handleCopyLastWeek = () => {
    if (readOnly) return block();
    if (isLive) return blockDraftOnly();
    rota.copyPreviousWeek();
    toast.success("Pattern copied", {
      description: "Last week's pattern applied as a draft. Review before publishing.",
    });
  };

  const handleDuplicateShift = async (shiftId: string) => {
    if (readOnly) return block();
    const newId = await Promise.resolve(rota.duplicateShiftToNextDay(shiftId)).catch(() => null);
    if (!newId) return;
    if (isLive) return;
    toastDuplicateDraft(rota, newId);
  };

  const handleRepeatShift = async (
    shiftId: string,
    dayIndexes: number[],
  ): Promise<RepeatShiftResult | null> => {
    if (readOnly) {
      block();
      return null;
    }
    const sourceShift = findShift(shiftId);
    if (!sourceShift) {
      toast.error("Shift repeat failed", {
        description: "The source shift is no longer available.",
      });
      return null;
    }

    const plan = planRepeatShift(sourceShift, dayIndexes, rota.draftShifts);
    const result = await executeRepeatShiftPlan(plan, rota.addShift);
    const feedback = buildRepeatShiftFeedback(result);
    toast[feedback.tone](feedback.title, { description: feedback.description });
    return result;
  };

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

  const handleSetShiftDept = (shiftId: string, dept: string) => {
    if (readOnly) return block();
    if (isLive) return blockDraftOnly();
    const prev = findShift(shiftId)?.deptOverride;
    rota.updateShift(shiftId, { deptOverride: dept, edited: true });
    toastDepartmentDraft(rota, shiftId, dept, prev);
  };

  const handleSetShiftColour = (shiftId: string, presetId: string) => {
    if (readOnly) return block();
    if (isLive) return blockDraftOnly();
    const prev = findShift(shiftId)?.colourOverride;
    rota.updateShift(shiftId, { colourOverride: presetId });
    toastColourDraft(rota, shiftId, presetId, prev);
  };

  const handleResetShiftColour = (shiftId: string) => {
    if (readOnly) return block();
    if (isLive) return blockDraftOnly();
    const prev = findShift(shiftId);
    rota.updateShift(shiftId, { colourOverride: undefined, deptOverride: undefined });
    toastResetColourDraft(rota, shiftId, prev);
  };

  return {
    fillSummary,
    setFillSummary,
    block,
    blockDraftOnly,
    handleApplySuggestions,
    handleCopyLastWeek,
    handleDuplicateShift,
    handleRepeatShift,
    handleMarkShiftOpen: handleMarkShiftOpen as (shiftId: ShiftId) => Promise<void>,
    handleClearShift,
    handleSetShiftDept,
    handleSetShiftColour,
    handleResetShiftColour,
  };
}
