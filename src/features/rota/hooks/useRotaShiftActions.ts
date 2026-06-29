import * as React from "react";
import { toast } from "sonner";
import type { useRotaDraftController } from "./useRotaDraftController";
import type { DraftShift, ShiftId } from "../types";
import {
  toastClearedDraft,
  toastColourDraft,
  toastDepartmentDraft,
  toastDuplicateDraft,
  toastMarkedOpenDraft,
  toastResetColourDraft,
} from "../lib/rotaActionToasts";
import { buildRepeatShiftFeedback, type RepeatShiftResult } from "../lib/repeatShift";
import { isShiftCopyAssignable } from "../lib/assignableStaff";
import { executeDuplicateShiftCopy, executeRepeatShiftCopy } from "../lib/shiftCopyActions";
import { applyLiveOpenShiftSuggestions } from "../lib/rotaSuggestions";
import { requestLiveCopyPreviousWeekConfirmation } from "../lib/copyPreviousWeekAction";

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

  const handleApplySuggestions = async () => {
    if (readOnly) return block();
    if (isLive) {
      const suggestions = await applyLiveOpenShiftSuggestions({
        shifts: rota.draftShifts,
        staff: rota.assignableStaff,
        leaveRequests: rota.leaveRequests,
        dayIsoDates: rota.dayIsoDates,
        updateShift: rota.updateShift,
      });
      setFillSummary(
        suggestions.length > 0
          ? `${suggestions.length} open shift${suggestions.length === 1 ? "" : "s"} filled in the live draft. Review before publishing.`
          : "No open shifts could be filled from the current staff list.",
      );
      return;
    }
    const suggestions = rota.applyOpenShiftSuggestions();
    setFillSummary(
      suggestions.length > 0
        ? `${suggestions.length} open shift${suggestions.length === 1 ? "" : "s"} filled. Review the assignments before publishing.`
        : "No open shifts could be filled from the current staff list.",
    );
  };

  const handleCopyLastWeek = async () => {
    if (readOnly) return block();
    if (isLive) {
      if (!rota.previewCopyPreviousWeek) {
        blockDraftOnly();
        return;
      }
      try {
        await requestLiveCopyPreviousWeekConfirmation({
          previewCopyPreviousWeek: rota.previewCopyPreviousWeek,
          requestCopyPreviousWeek: rota.requestCopyPreviousWeek,
        });
      } catch {
        // Live preview owns the failure toast.
      }
      return;
    }
    try {
      await rota.copyPreviousWeek();
      toast.success("Pattern copied", {
        description: "Last week's pattern applied as a draft. Review before publishing.",
      });
    } catch {
      // Live persistence owns the failure toast.
    }
  };

  const handleDuplicateShift = async (shiftId: string) => {
    if (readOnly) return block();
    const outcome = await executeDuplicateShiftCopy(
      findShift(shiftId),
      rota.assignableStaff,
      rota.duplicateShiftToNextDay,
    ).catch(() => null);
    if (!outcome) return;
    if (outcome.status === "blocked") {
      toast.info("Shift not duplicated", { description: outcome.reason });
      return;
    }
    if (!outcome.shiftId) return;
    if (isLive) return;
    toastDuplicateDraft(rota, outcome.shiftId);
  };

  const handleRepeatShift = async (
    shiftId: string,
    dayIndexes: number[],
  ): Promise<RepeatShiftResult | null> => {
    if (readOnly) {
      block();
      return null;
    }
    const outcome = await executeRepeatShiftCopy({
      source: findShift(shiftId),
      dayIndexes,
      shifts: rota.draftShifts,
      assignableStaff: rota.assignableStaff,
      addShift: rota.addShift,
    });
    if (outcome.status === "blocked") {
      toast.info("Shift not repeated", { description: outcome.reason });
      return null;
    }
    const result = outcome.result;
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
    canCopyShiftAssignment: (shift: Pick<DraftShift, "staffId">) =>
      isShiftCopyAssignable(shift, rota.assignableStaff),
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
