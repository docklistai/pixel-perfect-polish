import * as React from "react";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { mockProfile } from "../data/mockPortalData";
import {
  clockInShift,
  portalShiftsForStaff,
  publishedSnapshots,
  upcomingPortalShifts,
} from "../lib/portalRota";
import type { PortalShift } from "../types";

export type PortalRota = {
  /** True once any current/future week has been published. */
  hasPublished: boolean;
  /** Today's and future published shifts for the signed-in staff member. */
  upcoming: PortalShift[];
  /** The first upcoming shift (today's shift until it ends, then the next). */
  nextShift: PortalShift | null;
  /** The shift Olivia can clock in for right now, or null. */
  activeShift: PortalShift | null;
};

/** Staff-safe rota projection for the signed-in staff member (Olivia). */
export function usePortalRota(): PortalRota {
  const weekDrafts = useWorkspaceSelector((state) => state.weekDrafts);
  return React.useMemo(() => {
    const shifts = portalShiftsForStaff(weekDrafts, mockProfile.staffId);
    const upcoming = upcomingPortalShifts(shifts);
    return {
      hasPublished: publishedSnapshots(weekDrafts).length > 0,
      upcoming,
      nextShift: upcoming[0] ?? null,
      activeShift: clockInShift(shifts),
    };
  }, [weekDrafts]);
}
