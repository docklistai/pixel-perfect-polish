import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  addIsoDays,
  fetchPortalTeamShifts,
  portalTodayIso,
  type PortalTeamShift,
} from "../api/portalTeamData";

const portalRouteApi = getRouteApi("/portal");

export type PortalTeamShifts = {
  /** True when a live staff session can read the team view. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** The signed-in member's staff id, for "You" highlighting. */
  selfStaffMemberId: string | null;
  /** Published team shifts for today and the next six days. */
  shifts: PortalTeamShift[];
};

/** Who's working this week, from the latest published snapshot only. */
export function usePortalTeamShifts(): PortalTeamShifts {
  const { auth } = portalRouteApi.useRouteContext();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);

  const query = useQuery({
    queryKey: ["portal", "team-shifts", workspaceId, staffMemberId],
    queryFn: () => {
      const today = portalTodayIso();
      return fetchPortalTeamShifts(workspaceId!, today, addIsoDays(today, 6));
    },
    enabled,
    staleTime: 60_000,
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    selfStaffMemberId: staffMemberId,
    shifts: query.data ?? [],
  };
}
