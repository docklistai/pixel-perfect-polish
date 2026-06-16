import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchWorkspaceStaffFn } from "@/features/staff/api/staffLiveData";
import type { StaffRow } from "@/features/staff/types";
import {
  fetchWorkspaceRotaWeekFn,
  type LiveRotaLocation,
  type LiveWeekStatus,
} from "../api/rotaLiveData";
import type { DraftShift, ShiftTone, StaffMember } from "../types";

const rotaRouteApi = getRouteApi("/rota");

export type RotaLiveData = {
  workspaceId: string | null;
  /** Whether this authenticated route should attempt live manager reads. */
  enabled: boolean;
  /** True only when env + a manager session are present AND both live reads succeed. */
  isLive: boolean;
  source: "live" | "demo";
  isLoading: boolean;
  isError: boolean;
  /** Whether a saved rota week exists for the selected week (live mode only). */
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
  refetchWeek: () => Promise<void>;
  staff: StaffMember[];
  shifts: DraftShift[];
};

const DEMO: RotaLiveData = {
  workspaceId: null,
  enabled: false,
  isLive: false,
  source: "demo",
  isLoading: false,
  isError: false,
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
  staff: [],
  shifts: [],
};

/** Deterministic chip tones for the roster (cosmetic only — colour is not data). */
const TONE_CYCLE: ShiftTone[] = ["info", "warning", "purple", "success", "danger"];

/** StaffRow (the /staff live shape) → the rota grid's StaffMember shape. */
function toStaffMember(row: StaffRow, index: number): StaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    hrs: row.hours === "—" ? "—" : row.hours.replace("/wk", ""),
    img: row.img,
    tone: TONE_CYCLE[index % TONE_CYCLE.length]!,
  };
}

/**
 * Live, manager-scoped rota source for /rota. Shares the /staff roster read (same
 * query key) so the grid roster and live shift assignments resolve against the
 * same staff ids. `isLive` is true only when both the roster and the week read
 * succeed, so the grid never mixes live shifts with the demo roster (or vice
 * versa). Manager sessions fall back to demo while loading or on a failed read.
 * Signed-out users are redirected by the route guard.
 */
export function useRotaLiveData(weekOffset: number): RotaLiveData {
  const { auth } = rotaRouteApi.useRouteContext();
  const [selectedLocationId, setSelectedLocationId] = React.useState<string | null>(null);
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager");

  const staffQuery = useQuery({
    // Same key as useWorkspaceStaff so the roster read is shared, not duplicated.
    queryKey: ["staff", "workspace-roster", workspaceId],
    queryFn: () => fetchWorkspaceStaffFn(),
    enabled,
    staleTime: 30_000,
  });

  const weekQuery = useQuery({
    queryKey: ["rota", "workspace-week", workspaceId, weekOffset, selectedLocationId],
    queryFn: () =>
      fetchWorkspaceRotaWeekFn({
        data: {
          weekOffset,
          ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
        },
      }),
    enabled,
    staleTime: 15_000,
  });

  const isLive = enabled && staffQuery.isSuccess && weekQuery.isSuccess;

  React.useEffect(() => {
    if (weekQuery.isSuccess && weekQuery.data.locationId !== selectedLocationId) {
      setSelectedLocationId(weekQuery.data.locationId);
    }
  }, [selectedLocationId, weekQuery.data, weekQuery.isSuccess]);

  const refetchWeek = React.useCallback(async () => {
    await weekQuery.refetch();
  }, [weekQuery]);

  if (!isLive) {
    return {
      ...DEMO,
      workspaceId,
      enabled,
      setLocationId: setSelectedLocationId,
      refetchWeek,
      isLoading: enabled && (staffQuery.isLoading || weekQuery.isLoading),
      isError: enabled && (staffQuery.isError || weekQuery.isError),
    };
  }

  return {
    workspaceId,
    enabled: true,
    isLive: true,
    source: "live",
    isLoading: false,
    isError: false,
    hasWeek: weekQuery.data.hasWeek,
    rotaWeekId: weekQuery.data.rotaWeekId,
    weekStatus: weekQuery.data.status,
    hasPublishedSnapshot: weekQuery.data.hasPublishedSnapshot,
    hasUnpublishedChanges: weekQuery.data.hasUnpublishedChanges,
    weekStart: weekQuery.data.weekStart,
    locationId: weekQuery.data.locationId,
    locationName: weekQuery.data.locationName,
    locations: weekQuery.data.locations,
    today: weekQuery.data.today,
    setLocationId: setSelectedLocationId,
    refetchWeek,
    staff: (staffQuery.data ?? []).map(toStaffMember),
    shifts: weekQuery.data.shifts,
  };
}
