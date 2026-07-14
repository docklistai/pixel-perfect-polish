import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  fetchPortalOpenShifts,
  fetchPortalOpenShiftRequests,
  type PortalOpenShift,
  type PortalOpenShiftRequest,
} from "../api/openShiftRequests";
import { requestOpenShiftFn, withdrawOpenShiftRequestFn } from "../api/portalActions";
import { usePortalTimezone } from "./usePortalTimezone";
import { usePortalProfile } from "./usePortalProfile";
import { usePortalOpenShiftConstraints } from "./usePortalOpenShiftConstraints";
import { filterEligibleOpenShifts } from "../lib/openShiftEligibility";

const portalRouteApi = getRouteApi("/portal");

export type PortalOpenShifts = {
  /** True when a live staff session can read and request open shifts. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** Requestable published open shifts (today onwards, latest snapshot). */
  openShifts: PortalOpenShift[];
  /** The caller's own requests, newest shift first (all statuses). */
  requests: PortalOpenShiftRequest[];
  /** The caller's request for a given published shift, if any. */
  requestFor: (publishedShiftId: string) => PortalOpenShiftRequest | null;
  /** True while a request/withdraw call is in flight. */
  busy: boolean;
  retry: () => void;
  request: (publishedShiftId: string) => void;
  withdraw: (requestId: string) => void;
};

/**
 * Staff-side open-shift request loop: browse published open shifts, request
 * one, withdraw a pending request, and see decided outcomes. Nothing here
 * changes any rota — manager selection and republish do that server-side.
 */
export function usePortalOpenShifts(): PortalOpenShifts {
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const timezone = usePortalTimezone();
  const profile = usePortalProfile();
  const eligibility = usePortalOpenShiftConstraints();
  const [busy, setBusy] = React.useState(false);

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);
  const roleName = profile.data?.role ?? null;
  const queryEnabled = enabled && Boolean(timezone) && Boolean(roleName);

  const openShiftsKey = ["portal", "open-shifts", workspaceId, staffMemberId, timezone, roleName];
  const requestsKey = ["portal", "open-shift-requests", workspaceId, staffMemberId, timezone];

  const openShiftsQuery = useQuery({
    queryKey: openShiftsKey,
    queryFn: () => fetchPortalOpenShifts(workspaceId!, roleName!),
    enabled: queryEnabled,
    staleTime: 30_000,
  });
  const requestsQuery = useQuery({
    queryKey: requestsKey,
    queryFn: () => fetchPortalOpenShiftRequests(workspaceId!, staffMemberId!),
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  const requests = React.useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const eligibleOpenShifts = React.useMemo(
    () => filterEligibleOpenShifts(openShiftsQuery.data ?? [], eligibility.constraints),
    [eligibility.constraints, openShiftsQuery.data],
  );
  const requestByShift = React.useMemo(
    () => new Map(requests.map((request) => [request.publishedShiftId, request])),
    [requests],
  );

  const refresh = React.useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: openShiftsKey }),
        queryClient.invalidateQueries({ queryKey: requestsKey }),
      ]),
    // Key parts, not the array identities, drive when refresh must change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, workspaceId, staffMemberId, timezone, roleName],
  );

  const run = React.useCallback(
    async (
      label: string,
      operation: () => Promise<{ ok: true } | { ok: false; message: string }>,
    ): Promise<boolean> => {
      setBusy(true);
      try {
        const result = await operation();
        if (!result.ok) {
          toast.error(label, { description: result.message });
          return false;
        }
        await refresh();
        return true;
      } catch {
        toast.error(label, { description: "We couldn't update this request. Please try again." });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    enabled,
    isLoading:
      enabled &&
      (!timezone ||
        !roleName ||
        openShiftsQuery.isLoading ||
        requestsQuery.isLoading ||
        eligibility.isLoading),
    isError: enabled && (openShiftsQuery.isError || requestsQuery.isError || eligibility.isError),
    openShifts: eligibility.isError ? [] : eligibleOpenShifts,
    requests,
    requestFor: (publishedShiftId: string) => requestByShift.get(publishedShiftId) ?? null,
    busy,
    retry: () => void refresh(),
    request: (publishedShiftId: string) => {
      void run("Request not sent", () =>
        requestOpenShiftFn({ data: { workspaceId: workspaceId!, publishedShiftId } }),
      ).then((ok) => {
        if (ok) {
          toast.success("Shift requested", {
            description: "Your manager will review the applicants.",
          });
        }
      });
    },
    withdraw: (requestId: string) => {
      void run("Request not withdrawn", () =>
        withdrawOpenShiftRequestFn({ data: { workspaceId: workspaceId!, requestId } }),
      );
    },
  };
}
