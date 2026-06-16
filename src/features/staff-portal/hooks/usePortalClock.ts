import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
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
  type PortalClockEventType,
} from "../api/portalLiveData";
import { staffClockEventFn } from "../api/portalActions";
import type { ClockEntry } from "../types";

const portalRouteApi = getRouteApi("/portal");

const SINCE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export type PortalClock = {
  /** Where the clock state came from: live persisted entries or the demo store. */
  source: "live" | "demo";
  clockedIn: boolean;
  onBreak: boolean;
  /** Timer origin in epoch ms — persisted `clocked_in_at` when live. */
  startedAtMs: number | null;
  /** "since 16:04" label for the active session, or null. */
  sinceLabel: string | null;
  /** Completed entries for the history list (the open session is excluded). */
  entries: ClockEntry[];
  clockIn: () => void;
  clockOut: () => void;
  toggleBreak: () => void;
};

/**
 * The signed-in staff member's live clock. Derives the open entry, break state,
 * and timer origin from persisted `staff_portal_time_entries` /
 * `staff_portal_clock_events` so a reload resumes the real clock; writes go
 * through `rpc_staff_clock_event` via a server function (no browser writes).
 * Falls back to the demo WorkspaceStore when Supabase is unconfigured, the
 * caller is signed out, or either read fails.
 */
export function usePortalClock(): PortalClock {
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const store = useWorkspaceStore();
  const demoClock = useWorkspaceSelector((state) => state.portalClock);
  const demoEntries = useWorkspaceSelector((state) => state.portalClockEntries);

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);

  const entriesKey = ["portal", "time-entries", workspaceId, staffMemberId];
  const eventsKey = ["portal", "clock-events", workspaceId, staffMemberId];
  const entriesQuery = useQuery({
    queryKey: entriesKey,
    queryFn: () => fetchPortalTimeEntries(workspaceId!, staffMemberId!),
    enabled,
    staleTime: 15_000,
  });
  const eventsQuery = useQuery({
    queryKey: eventsKey,
    queryFn: () => fetchPortalClockEvents(workspaceId!, staffMemberId!),
    enabled,
    staleTime: 15_000,
  });

  const isLive = enabled && entriesQuery.isSuccess && eventsQuery.isSuccess;

  if (!isLive) {
    return {
      source: "demo",
      clockedIn: demoClock.clockedIn,
      onBreak: demoClock.onBreak,
      startedAtMs: demoClock.startedAtMs,
      // The demo world's clock is frozen; the session timer alone is live.
      sinceLabel: demoClock.startedAtMs ? DEMO_WORLD.nowLabel : null,
      entries: demoEntries,
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

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: entriesKey }),
      queryClient.invalidateQueries({ queryKey: eventsKey }),
    ]);

  const run = (eventType: PortalClockEventType, timeEntryId: string | null) => {
    void staffClockEventFn({ data: { workspaceId: workspaceId!, eventType, timeEntryId } }).then(
      (result) => {
        if (!result.ok) {
          toast.error("Clock action failed", { description: result.message });
          return;
        }
        void refresh();
      },
    );
  };

  return {
    source: "live",
    clockedIn: open !== null,
    onBreak: openBreakBalance > 0,
    startedAtMs: open?.clockedInAtMs ?? null,
    sinceLabel:
      open?.clockedInAtMs != null ? `${SINCE_FMT.format(new Date(open.clockedInAtMs))}` : null,
    entries: timeEntries.filter((entry) => entry.id !== open?.id),
    clockIn: () => run("clock_in", null),
    clockOut: () => {
      if (open) run("clock_out", open.id);
    },
    toggleBreak: () => {
      if (open) run(openBreakBalance > 0 ? "break_end" : "break_start", open.id);
    },
  };
}
