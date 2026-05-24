import { initialDraftShifts } from "../data/mockData";
import type { DraftShift, PublishedRotaSnapshot } from "../types";
import { createInitialDraftShifts } from "./draftRota";

export type WeekDraftState = {
  shifts: DraftShift[];
  published: boolean;
  hasUnpublishedChanges: boolean;
  publishedSnapshot: PublishedRotaSnapshot | null;
};

export function createWeekDraft(): WeekDraftState {
  return {
    shifts: createInitialDraftShifts(initialDraftShifts),
    published: false,
    hasUnpublishedChanges: false,
    publishedSnapshot: null,
  };
}
