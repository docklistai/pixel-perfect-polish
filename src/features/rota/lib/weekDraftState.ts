import { initialDraftShifts } from "../data/mockData";
import type { DraftShift } from "../types";
import { createInitialDraftShifts } from "./draftRota";

export type WeekDraftState = {
  shifts: DraftShift[];
  published: boolean;
  hasUnpublishedChanges: boolean;
};

export function createWeekDraft(): WeekDraftState {
  return {
    shifts: createInitialDraftShifts(initialDraftShifts),
    published: false,
    hasUnpublishedChanges: false,
  };
}
