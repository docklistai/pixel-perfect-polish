import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useWorkspaceSelector, useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import {
  portalClockIn,
  portalClockOut,
  portalToggleBreak,
} from "@/features/demo/store/workspaceActions";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import {
  fetchPortalClockEvents,
  fetchPortalTimeEntries,
  portalTimeWindowStart,
  type PortalClockEventType,
} from "../api/portalLiveData";
import type { ClockEntry } from "../types";
import { usePortalTimezone } from "./usePortalTimezone";
import { usePortalClockAction } from "./usePortalClockAction";

const portalRouteApi = getRouteApi("/portal");

export type PortalClock = {
  source: "live" | "demo";
  clockedIn: boolean;
  onBreak: boolean;
  startedAtMs: number | null;
  /** "since 16:04" label for the active session, or null. */
  sinceLabel: string | null;
  /** Completed entries for the history list (the open session is excluded). */
  entries: ClockEntry[];
  isLoading: boolean;
  isError: boolean;
  isActionPending: boolean;
  actionError: string | null;
  retry: () => void;
  retryAction: () => void;
  clockIn: () => void;
  clockOut: () => void;
  toggleBreak: () => void;
};

/** Persisted staff clock state and audited clock-event actions. */
export function usePortalClock(): PortalClock {
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const store = useWorkspaceStore();
  const demoClock = useWorkspaceSelector((state) => state.portalClock);
  const demoEntries = useWorkspaceSelector((state) => state.portalClockEntries);
  const timezone = usePortalTimezone();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);
  const queryEnabled = enabled && Boolean(timezone);
  const windowStart = portalTimeWindowStart(new Date());

  const entriesKey = ["portal", "time-entries", workspaceId, staffMemberId, timezone, windowStart];
  const eventsKey = ["portal", "clock-events", workspaceId, staffMemberId, windowStart];
  const entriesQuery = useQuery({
    queryKey: entriesKey,
    queryFn: () => fetchPortalTimeEntries(workspaceId!, staffMemberId!, timezone!, windowStart),
    enabled: queryEnabled,
    staleTime: 15_000,
  });
  const eventsQuery = useQuery({
    queryKey: eventsKey,
    queryFn: () => fetchPortalClockEvents(workspaceId!, staffMemberId!, windowStart),
    enabled: queryEnabled,
    staleTime: 15_000,
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: entriesKey }),
      queryClient.invalidateQueries({ queryKey: eventsKey }),
    ]);
  const clockAction = usePortalClockAction({ workspaceId, refresh });

  const isLive = queryEnabled && entriesQuery.isSuccess && eventsQuery.isSuccess;
  const retry = () => {
    void entriesQuery.refetch();
    void eventsQuery.refetch();
  };

  if (enabled && !isLive) {
    return {
      source: "live",
      clockedIn: false,
      onBreak: false,
      startedAtMs: null,
      sinceLabel: null,
      entries: [],
      isLoading: !entriesQuery.isError && !eventsQuery.isError,
      isError: entriesQuery.isError || eventsQuery.isError,
      isActionPending: false,
      actionError: null,
      retry,
      retryAction: () => undefined,
      clockIn: () => undefined,
      clockOut: () => undefined,
      toggleBreak: () => undefined,
    };
  }

  if (!enabled) {
    return {
      source: "demo",
      clockedIn: demoClock.clockedIn,
      onBreak: demoClock.onBreak,
      startedAtMs: demoClock.startedAtMs,
      // The demo world's clock is frozen; the session timer alone is live.
      sinceLabel: demoClock.startedAtMs ? DEMO_WORLD.nowLabel : null,
      entries: demoEntries,
      isLoading: false,
      isError: false,
      isActionPending: false,
      actionError: null,
      retry: () => undefined,
      retryAction: () => undefined,
      clockIn: () => portalClockIn(store),
      clockOut: () => portalClockOut(store),
      toggleBreak: () => portalToggleBreak(store),
    };
  }

  const timeEntries = entriesQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const open =
    timeEntries.find((entry) => entry.clockedInAtMs !== null && entry.clockedOutAtMs === null) ??
    null;
  const openBreakBalance = open
    ? events
        .filter((event) => event.timeEntryId === open.id)
        .reduce(
          (balance, event) =>
            balance +
            (event.eventType === "break_start" ? 1 : event.eventType === "break_end" ? -1 : 0),
          0,
        )
    : 0;

  return {
    source: "live",
    clockedIn: open !== null,
    onBreak: openBreakBalance > 0,
    startedAtMs: open?.clockedInAtMs ?? null,
    sinceLabel:
      open?.clockedInAtMs != null
        ? new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone!,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date(open.clockedInAtMs))
        : null,
    entries: timeEntries.filter((entry) => entry.id !== open?.id),
    isLoading: false,
    isError: false,
    isActionPending: clockAction.isPending,
    actionError: clockAction.error,
    retry,
    retryAction: clockAction.retry,
    clockIn: () => clockAction.run("clock_in", null),
    clockOut: () => {
      if (open) clockAction.run("clock_out", open.id);
    },
    toggleBreak: () => {
      if (open) clockAction.run(openBreakBalance > 0 ? "break_end" : "break_start", open.id);
    },
  };
}
