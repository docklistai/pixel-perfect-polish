import { createWeekDraft } from "@/features/rota/lib/weekDraftState";
import { mockClockEntries, mockNotifications } from "@/features/staff-portal/data/mockPortalData";
import type { WorkspaceState } from "./workspaceStoreTypes";

/**
 * Builds the demo workspace at session start: current week already published
 * (snapshot derived from the same rota seed the grid shows), next week an
 * unpublished draft due Friday.
 */
export function seedWorkspaceState(): WorkspaceState {
  return {
    weekOffset: 0,
    weekDrafts: {
      "0": createWeekDraft(0),
      "1": createWeekDraft(1),
    },
    portalClock: { clockedIn: false, onBreak: false, startedAtMs: null },
    portalClockEntries: mockClockEntries,
    portalNotifications: mockNotifications,
  };
}
