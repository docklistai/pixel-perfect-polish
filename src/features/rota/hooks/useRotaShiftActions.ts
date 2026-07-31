import * as React from "react";
import { toast } from "sonner";
import type { useRotaDraftController } from "./useRotaDraftController";
import type { DraftShift } from "../types";
import { useRotaShiftEditActions } from "./useRotaShiftEditActions";
import { toastDuplicateDraft } from "../lib/rotaActionToasts";
import { buildRepeatShiftFeedback, type RepeatShiftResult } from "../lib/repeatShift";
import { getShiftDuplicateBlockedReason } from "../lib/duplicateShiftRules";
import { executeDuplicateShiftCopy, executeRepeatShiftCopy } from "../lib/shiftCopyActions";
import { requestLiveCopyPreviousWeekConfirmation } from "../lib/copyPreviousWeekAction";

type RotaController = ReturnType<typeof useRotaDraftController>;

export function useRotaShiftActions(rota: RotaController) {
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

  const editActions = useRotaShiftEditActions(rota, block);

  const findShift = (shiftId: string) => rota.draftShifts.find((s) => s.id === shiftId);

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

  return {
    block,
    blockDraftOnly,
    duplicateBlockedReason: (shift: Pick<DraftShift, "staffId" | "dayIndex">) =>
      getShiftDuplicateBlockedReason(shift, rota.assignableStaff),
    handleCopyLastWeek,
    handleDuplicateShift,
    handleRepeatShift,
    ...editActions,
  };
}
