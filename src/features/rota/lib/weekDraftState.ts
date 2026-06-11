import { initialDraftShifts, staff } from "../data/mockData";
import type { DraftShift, PublishedRotaSnapshot } from "../types";
import { createInitialDraftShifts } from "./draftRota";
import { buildPublishedRotaSnapshot } from "./publishedSnapshot";
import { getWeekLabel } from "./weekHelpers";

export type WeekDraftState = {
  shifts: DraftShift[];
  published: boolean;
  hasUnpublishedChanges: boolean;
  publishedSnapshot: PublishedRotaSnapshot | null;
};

/** Demo anchor: the current week's rota went out on Monday afternoon. */
const CURRENT_WEEK_PUBLISHED_AT = "2026-06-08T16:42:00.000Z";

function createPublishedWeek(weekOffset: number): WeekDraftState {
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
    // The staff-safe snapshot is derived from the same shifts the manager
    // grid shows, so the portal and rota can never contradict each other.
    publishedSnapshot: buildPublishedRotaSnapshot({
      shifts,
      staff,
      weekOffset,
      weekLabel: getWeekLabel(weekOffset),
      previousSnapshot: null,
      publishedAt: CURRENT_WEEK_PUBLISHED_AT,
    }),
  };
}

export function createWeekDraft(weekOffset = 0): WeekDraftState {
  if (weekOffset <= 0) return createPublishedWeek(weekOffset);
  return {
    shifts: createInitialDraftShifts(initialDraftShifts),
    published: false,
    hasUnpublishedChanges: false,
    publishedSnapshot: null,
  };
}
