import type { LiveRotaLocation, LiveWeekStatus } from "../api/rotaLiveData";
import type { BoundaryOverlap } from "../api/boundaryOverlaps";
import type { DraftShift, StaffMember } from "../types";
import type { LeaveRequest } from "@/features/leave/types";

/**
 * The shape `useRotaLiveData` returns, and the inert value it returns when the
 * live source is not available.
 *
 * Extracted from the hook unchanged: the hook was already over its size limit
 * before this phase, and a type plus a frozen constant are the part of it that
 * carry no behaviour. `RotaLiveData` is re-exported from `useRotaLiveData` so
 * every existing import path keeps working.
 */
export type RotaLiveData = {
  workspaceId: string | null;
  enabled: boolean;
  isLive: boolean;
  source: "live" | "demo";
  isLoading: boolean;
  isError: boolean;
  isLeaveLoading: boolean;
  isLeaveError: boolean;
  hasWeek: boolean;
  rotaWeekId: string | null;
  weekStatus: LiveWeekStatus | null;
  hasPublishedSnapshot: boolean;
  hasUnpublishedChanges: boolean;
  weekStart: string | null;
  locationId: string | null;
  locationName: string | null;
  locations: LiveRotaLocation[];
  today: string | null;
  setLocationId: (locationId: string) => void;
  refetchWeek: () => Promise<readonly DraftShift[] | undefined>;
  /** Re-runs every live read backing this page (staff, week, leave). */
  retry: () => Promise<void>;
  staff: StaffMember[];
  assignableStaff: StaffMember[];
  shifts: DraftShift[];
  /**
   * Overlaps between this week's assigned shifts and assigned shifts outside
   * it. Conflict context only — these never become grid rows. Empty for demo.
   */
  boundaryOverlaps: BoundaryOverlap[];
  leaveRequests: LeaveRequest[];
};

export const DEMO_ROTA_LIVE_DATA: RotaLiveData = {
  workspaceId: null,
  enabled: false,
  isLive: false,
  source: "demo",
  isLoading: false,
  isError: false,
  isLeaveLoading: false,
  isLeaveError: false,
  hasWeek: false,
  rotaWeekId: null,
  weekStatus: null,
  hasPublishedSnapshot: false,
  hasUnpublishedChanges: false,
  weekStart: null,
  locationId: null,
  locationName: null,
  locations: [],
  today: null,
  setLocationId: () => undefined,
  refetchWeek: async () => undefined,
  retry: async () => undefined,
  staff: [],
  assignableStaff: [],
  shifts: [],
  boundaryOverlaps: [],
  leaveRequests: [],
};
