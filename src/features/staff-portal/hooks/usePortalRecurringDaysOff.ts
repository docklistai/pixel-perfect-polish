import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  fetchPortalRecurringDaysOff,
  requestRecurringDayOffFn,
  withdrawRecurringDayOffFn,
  type RecurringDayOffWriteResult,
} from "../api/recurringDaysOff";
import type { RecurringDayOff } from "../lib/recurringDaysOff";

const portalRouteApi = getRouteApi("/portal");

export type PortalRecurringDaysOff = {
  /** True when a live staff session can manage standing day-off requests. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  requests: RecurringDayOff[];
  isSaving: boolean;
  request: (weekday: number, note: string | null) => Promise<RecurringDayOffWriteResult>;
  withdraw: (weekday: number) => Promise<RecurringDayOffWriteResult>;
};

const KEY = (workspaceId: string | null, staffMemberId: string | null) => [
  "portal",
  "recurring-days-off",
  workspaceId,
  staffMemberId,
];

/** The signed-in staff member's standing day-off requests and their actions. */
export function usePortalRecurringDaysOff(): PortalRecurringDaysOff {
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);

  const query = useQuery({
    queryKey: KEY(workspaceId, staffMemberId),
    queryFn: () => fetchPortalRecurringDaysOff(workspaceId!),
    enabled,
    staleTime: 30_000,
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: KEY(workspaceId, staffMemberId) });

  const requestMutation = useMutation({
    mutationFn: (vars: { weekday: number; note: string | null }) =>
      requestRecurringDayOffFn({
        data: { workspaceId: workspaceId!, weekday: vars.weekday, note: vars.note },
      }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (weekday: number) =>
      withdrawRecurringDayOffFn({ data: { workspaceId: workspaceId!, weekday } }),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    requests: query.data ?? [],
    isSaving: requestMutation.isPending || withdrawMutation.isPending,
    request: (weekday, note) => requestMutation.mutateAsync({ weekday, note }),
    withdraw: (weekday) => withdrawMutation.mutateAsync(weekday),
  };
}
