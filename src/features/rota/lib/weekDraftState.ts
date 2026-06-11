import { initialDraftShifts } from "../data/mockData";
import { demoPublishedRotaSnapshot } from "../data/publishedRotaSnapshot";
import type { DraftShift, PublishedRotaSnapshot } from "../types";
import { createInitialDraftShifts } from "./draftRota";

export type WeekDraftState = {
  shifts: DraftShift[];
  published: boolean;
  hasUnpublishedChanges: boolean;
  publishedSnapshot: PublishedRotaSnapshot | null;
};

function createPublishedCurrentWeek(): WeekDraftState {
  const shifts = createInitialDraftShifts(initialDraftShifts)
    .filter(
      (shift) =>
        !(shift.staffId === "daniel-mitchell" && shift.dayIndex === 4 && shift.start === "18:00"),
    )
    .map((shift) => {
      if (shift.staffId !== null) return shift;
      if (shift.role === "Bartender") {
        return {
          ...shift,
          staffId: "liam-oconnor",
          status: "scheduled" as const,
          tone: "warning" as const,
        };
      }
      return {
        ...shift,
        staffId: "noah-evans",
        status: "scheduled" as const,
        tone: "success" as const,
      };
    });

  return {
    shifts,
    published: true,
    hasUnpublishedChanges: false,
    publishedSnapshot: demoPublishedRotaSnapshot,
  };
}

export function createWeekDraft(weekOffset = 0): WeekDraftState {
  if (weekOffset <= 0) return createPublishedCurrentWeek();
  return {
    shifts: createInitialDraftShifts(initialDraftShifts),
    published: false,
    hasUnpublishedChanges: false,
    publishedSnapshot: null,
  };
}
