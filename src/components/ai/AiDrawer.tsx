import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { DrawerShell } from "@/components/dl";
import { AiChip } from "./AiChip";
import { AiDrawerBody } from "./AiDrawerBody";
import { AiDrawerHeader } from "./AiDrawerHeader";
import { buildSupportStatusMessage, buildSupportTopics, type SupportState } from "./aiDrawerData";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { fetchWorkspaceRotaWeekFn } from "@/features/rota/api/rotaLiveData";
import { fetchLeaveOperationalCountsFn } from "@/features/leave/api/leaveLiveData";
import { leaveQueryKeys, operationalLeaveRange } from "@/features/leave/lib/leaveQueryRange";
import { fetchTimeOperationalCountsFn } from "@/features/time/api/timeOperationalReads";
import {
  rollingTimeRange,
  TIME_OPERATIONAL_LOOKBACK_DAYS,
  timeQueryKeys,
} from "@/features/time/lib/timeQueryRange";
import { countOpenShifts } from "@/features/rota/lib/rotaSummaries";

function resolveSupportState({
  enabled,
  isLoading,
  isError,
}: {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
}): SupportState {
  if (!enabled) return "unavailable";
  if (isLoading) return "loading";
  if (isError) return "error";
  return "ready";
}

export function AiDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { workspaceId, role } = useManagerIdentity();
  const enabled =
    open &&
    Boolean(getSupabaseEnv()) &&
    Boolean(workspaceId) &&
    (role === "owner" || role === "manager");
  const leaveRange = React.useMemo(() => operationalLeaveRange(), []);
  const timeRange = React.useMemo(
    () => rollingTimeRange(new Date(), TIME_OPERATIONAL_LOOKBACK_DAYS),
    [],
  );

  const rotaQuery = useQuery({
    queryKey: ["rota", "workspace-week", workspaceId, 0, null],
    queryFn: () => fetchWorkspaceRotaWeekFn({ data: { weekOffset: 0 } }),
    enabled,
    staleTime: 15_000,
  });
  const leaveQuery = useQuery({
    queryKey: leaveQueryKeys.counts(workspaceId, leaveRange),
    queryFn: () =>
      fetchLeaveOperationalCountsFn({ data: { workspaceId: workspaceId!, ...leaveRange } }),
    enabled,
    staleTime: 15_000,
  });
  const timeQuery = useQuery({
    queryKey: timeQueryKeys.operationalCounts(workspaceId, timeRange),
    queryFn: () =>
      fetchTimeOperationalCountsFn({ data: { workspaceId: workspaceId!, ...timeRange } }),
    enabled,
    staleTime: 15_000,
  });

  const supportContext = React.useMemo(
    () => ({
      rota: {
        state: resolveSupportState({
          enabled,
          isLoading: rotaQuery.isLoading,
          isError: rotaQuery.isError,
        }),
        hasWeek: rotaQuery.data?.hasWeek ?? false,
        openShiftCount: rotaQuery.data ? countOpenShifts(rotaQuery.data.shifts) : null,
      },
      leave: {
        state: resolveSupportState({
          enabled,
          isLoading: leaveQuery.isLoading,
          isError: leaveQuery.isError,
        }),
        pendingLeaveCount: leaveQuery.data?.pending ?? null,
        approvedLeaveCount: leaveQuery.data?.approvedInWindow ?? null,
      },
      time: {
        state: resolveSupportState({
          enabled,
          isLoading: timeQuery.isLoading,
          isError: timeQuery.isError,
        }),
        pendingTimeCount: timeQuery.data?.awaitingReview ?? null,
        approvedTimeCount: timeQuery.data?.approvedInWindow ?? null,
      },
    }),
    [
      enabled,
      leaveQuery.data,
      leaveQuery.isError,
      leaveQuery.isLoading,
      rotaQuery.data,
      rotaQuery.isError,
      rotaQuery.isLoading,
      timeQuery.data,
      timeQuery.isError,
      timeQuery.isLoading,
    ],
  );

  const topics = React.useMemo(() => buildSupportTopics(supportContext), [supportContext]);
  const statusMessage = React.useMemo(
    () => buildSupportStatusMessage(supportContext),
    [supportContext],
  );

  const goTo = React.useCallback(
    (to: "/rota" | "/leave" | "/time") => {
      onOpenChange(false);
      void navigate({ to });
    },
    [navigate, onOpenChange],
  );

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      width="lg"
      title={<AiDrawerHeader />}
      description={undefined}
      meta={<AiChip label="Manager support" />}
    >
      <AiDrawerBody topics={topics} onGoTo={goTo} statusMessage={statusMessage} />
    </DrawerShell>
  );
}
