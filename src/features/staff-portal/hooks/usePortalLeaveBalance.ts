import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { dateIsoInTimezone } from "@/features/rota/lib/liveRotaDates";
import { calculateLeaveBalance, type LeaveBalance } from "@/features/leave/lib/leaveBalance";
import {
  leaveYearContains,
  leaveYearLabel,
  leaveYearWindowFromStart,
  type LeaveYearWindow,
} from "@/features/leave/lib/leaveYear";
import {
  fetchPortalAnnualLeaveInWindow,
  fetchPortalEntitlements,
  type PortalEntitlementRow,
} from "../api/portalLeaveEntitlement";
import { usePortalTimezone } from "./usePortalTimezone";

const portalRouteApi = getRouteApi("/portal");

export type PortalLeaveBalanceState = {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** Null when the manager has not recorded an entitlement for this leave year. */
  balance: LeaveBalance | null;
  /** Label for the leave year the balance covers, when there is one. */
  leaveYearLabel: string | null;
};

/**
 * Picks the recorded entitlement whose leave year contains today.
 *
 * A staff member may have rows for several years; only the current one is a
 * balance. Nothing is inferred when no row matches — the portal keeps its
 * honest "not available yet" state rather than showing a workspace default the
 * manager never recorded against this person.
 */
function currentEntitlement(
  rows: PortalEntitlementRow[],
  todayIso: string,
): { window: LeaveYearWindow; entitlementDays: number } | null {
  for (const row of rows) {
    const window = leaveYearWindowFromStart(row.leaveYearStart);
    if (window && leaveYearContains(window, todayIso)) {
      return { window, entitlementDays: row.entitlementDays };
    }
  }
  return null;
}

/** The signed-in staff member's own annual leave balance for the current leave year. */
export function usePortalLeaveBalance(): PortalLeaveBalanceState {
  const { auth } = portalRouteApi.useRouteContext();
  const timezone = usePortalTimezone();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);

  const todayIso = timezone
    ? dateIsoInTimezone(new Date(), timezone)
    : new Date().toISOString().slice(0, 10);

  const entitlementQuery = useQuery({
    queryKey: ["portal", "leave-entitlements", workspaceId, staffMemberId],
    queryFn: () => fetchPortalEntitlements(workspaceId!, staffMemberId!),
    enabled,
    staleTime: 60_000,
  });

  const current = entitlementQuery.data
    ? currentEntitlement(entitlementQuery.data, todayIso)
    : null;

  const requestsQuery = useQuery({
    queryKey: [
      "portal",
      "leave-entitlement-requests",
      workspaceId,
      staffMemberId,
      current?.window.startIso ?? null,
    ],
    queryFn: () =>
      fetchPortalAnnualLeaveInWindow(
        workspaceId!,
        staffMemberId!,
        current!.window.startIso,
        current!.window.endIso,
      ),
    enabled: enabled && current !== null,
    staleTime: 15_000,
  });

  const isLoading =
    enabled && (entitlementQuery.isLoading || (current !== null && requestsQuery.isLoading));
  const isError = enabled && (entitlementQuery.isError || requestsQuery.isError);

  if (!current || !requestsQuery.data) {
    return {
      enabled,
      isLoading,
      isError,
      balance: null,
      leaveYearLabel: current ? leaveYearLabel(current.window) : null,
    };
  }

  return {
    enabled,
    isLoading,
    isError,
    balance: calculateLeaveBalance({
      entitlementDays: current.entitlementDays,
      requests: requestsQuery.data,
      window: current.window,
    }),
    leaveYearLabel: leaveYearLabel(current.window),
  };
}
