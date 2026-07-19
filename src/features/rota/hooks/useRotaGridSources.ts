import * as React from "react";
import { staff } from "../data/mockData";
import { visibleLiveRoster } from "../lib/rotaRoster";
import type { RotaLiveData } from "./useRotaLiveData";
import type { DraftShift, StaffMember } from "../types";
import type { LeaveRequest } from "@/features/leave/types";

export type RotaGridSources = {
  roster: StaffMember[];
  fullRoster: StaffMember[];
  assignableStaff: StaffMember[];
  sourceShifts: DraftShift[];
  leaveRequests: LeaveRequest[];
};

const EMPTY_SOURCES: RotaGridSources = {
  roster: [],
  fullRoster: [],
  assignableStaff: [],
  sourceShifts: [],
  leaveRequests: [],
};

/**
 * Picks the data the rota grid renders from. A live workspace whose reads have
 * not settled (loading or failed) must never borrow the demo roster or demo
 * drafts — it renders honest empty data behind a dedicated loading/error
 * surface. The demo store backs the grid only when Supabase is not part of
 * this build at all.
 */
export function useRotaGridSources(
  live: RotaLiveData,
  readOnly: boolean,
  demoDraftShifts: DraftShift[],
  demoLeaveRequests: LeaveRequest[],
): RotaGridSources {
  return React.useMemo(() => {
    if (live.isLive) {
      return {
        roster: visibleLiveRoster(live.staff, live.assignableStaff, live.shifts),
        fullRoster: live.staff,
        assignableStaff: live.assignableStaff,
        sourceShifts: live.shifts,
        leaveRequests: live.leaveRequests,
      };
    }
    if (readOnly) return EMPTY_SOURCES;
    return {
      roster: staff,
      fullRoster: staff,
      assignableStaff: staff,
      sourceShifts: demoDraftShifts,
      leaveRequests: demoLeaveRequests,
    };
  }, [
    live.isLive,
    live.staff,
    live.assignableStaff,
    live.shifts,
    live.leaveRequests,
    readOnly,
    demoDraftShifts,
    demoLeaveRequests,
  ]);
}
