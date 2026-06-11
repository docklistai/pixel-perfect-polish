import { createWeekDraft } from "@/features/rota/lib/weekDraftState";
import { requests as leaveRequestSeed } from "@/features/leave/data/leaveDemoData";
import { mockClockEntries, mockNotifications } from "@/features/staff-portal/data/mockPortalData";
import { seedTimesheetRows } from "@/features/time/data/timeDemoData";
import { NOTIFICATION_SEED } from "@/components/notificationData";
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
    leaveRequests: leaveRequestSeed,
    timeRows: seedTimesheetRows(),
    managerNotifications: NOTIFICATION_SEED,
    portalClock: { clockedIn: false, onBreak: false, startedAtMs: null },
    portalClockEntries: mockClockEntries,
    portalNotifications: mockNotifications,
  };
}
