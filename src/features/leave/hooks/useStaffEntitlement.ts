import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  fetchStaffLeaveBalanceFn,
  saveStaffEntitlementFn,
  type StaffLeaveBalanceResult,
} from "../api/leaveEntitlements";
import { leaveQueryKeys } from "../lib/leaveQueryRange";

export type StaffEntitlementView = {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** Null until a successful read. */
  result: StaffLeaveBalanceResult | null;
  isSaving: boolean;
  /** Records the entitlement for this person and the resolved leave year. */
  save: (entitlementDays: number) => void;
};

/**
 * One staff member's leave balance for the leave year containing today, plus
 * the manager's write path for recording it.
 *
 * The leave year is resolved server-side and returned with the balance, so the
 * caller never has to guess which year a save belongs to — it sends back the
 * `leaveYear.startIso` it was given.
 */
export function useStaffEntitlement(staffMemberId: string | null): StaffEntitlementView {
  const queryClient = useQueryClient();
  const { workspaceId, role } = useManagerIdentity();
  const enabled =
    Boolean(getSupabaseEnv()) &&
    workspaceId !== null &&
    staffMemberId !== null &&
    (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: leaveQueryKeys.staffBalance(workspaceId, staffMemberId ?? ""),
    queryFn: () =>
      fetchStaffLeaveBalanceFn({
        data: { workspaceId: workspaceId!, staffMemberId: staffMemberId! },
      }),
    enabled,
    staleTime: 15_000,
  });

  const leaveYearStart = query.data?.leaveYear?.startIso ?? null;

  const mutation = useMutation({
    mutationFn: async (entitlementDays: number) => {
      if (!workspaceId || !staffMemberId || !leaveYearStart) {
        throw new Error("Set the workspace leave year before recording entitlement.");
      }
      await saveStaffEntitlementFn({
        data: { workspaceId, staffMemberId, leaveYearStart, entitlementDays },
      });
    },
    onSuccess: async () => {
      // Server truth, not optimism: refetch this person's balance and every
      // other balance surface sharing the ["leave", workspaceId] prefix.
      await queryClient.invalidateQueries({ queryKey: leaveQueryKeys.all(workspaceId) });
      toast.success("Entitlement recorded", {
        description: "The balance now uses the entitlement you recorded for this leave year.",
      });
    },
    onError: (error: Error) => {
      toast.error("Couldn't record entitlement", { description: error.message });
    },
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    result: query.data ?? null,
    isSaving: mutation.isPending,
    save: (entitlementDays: number) => mutation.mutate(entitlementDays),
  };
}
