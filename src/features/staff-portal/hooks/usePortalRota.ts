import * as React from "react";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import {
  clockInShift,
  currentWeekStrip,
  DEMO_NOW,
  historicalPortalShifts,
  portalNowInTimezone,
  portalShiftsForStaff,
  publishedSnapshots,
  resolvePortalHasPublished,
  upcomingPortalShifts,
  type PortalNow,
  type PortalWeekDay,
} from "../lib/portalRota";
import { currentWeekRangeLabel } from "../lib/portalWeekLabel";
import type { PortalShift } from "../types";
import { usePortalLiveShifts } from "./usePortalLiveShifts";
import { usePortalTimezone } from "./usePortalTimezone";

export type PortalRota = {
  /** True once any current/future week has published shifts for this member. */
  hasPublished: boolean;
  /** Today's and future published shifts for the signed-in staff member. */
  upcoming: PortalShift[];
  /** Published shifts that have already ended, newest first. */
  history: PortalShift[];
  /** The first upcoming shift (today's shift until it ends, then the next). */
  nextShift: PortalShift | null;
  /** Mon–Sun of the current week, derived from the active clock. */
  weekDays: PortalWeekDay[];
  /** "8 – 14 Jun 2026"-style label for the current week, from the active clock. */
  weekLabel: string;
  /** The shift Olivia can clock in for right now, or null. */
  activeShift: PortalShift | null;
  /** Where the rota came from: the live DB view or the demo WorkspaceStore. */
  source: "live" | "demo";
  /** Live read in flight with nothing to show yet. */
  isLoading: boolean;
  /** Live read failed; callers must show a retryable error, never demo data. */
  isError: boolean;
  /** Retry the staff-safe published-rota read. */
  retry: () => void;
};

function buildRota(
  shifts: PortalShift[],
  now: PortalNow,
): Omit<PortalRota, "source" | "isLoading" | "isError" | "weekLabel" | "retry"> {
  const upcoming = upcomingPortalShifts(shifts, now);
  return {
    hasPublished: shifts.length > 0,
    upcoming,
    history: historicalPortalShifts(shifts, now),
    nextShift: upcoming[0] ?? null,
    activeShift: clockInShift(shifts, now),
    weekDays: currentWeekStrip(now),
  };
}

/**
 * Staff-safe rota projection for the signed-in staff member. Prefers the live
 * published-snapshot view for authenticated staff. The demo WorkspaceStore is
 * used only when Supabase is unconfigured; live loading/failure remains an
 * explicit state so staff never mistake missing data for an empty rota.
 */
export function usePortalRota(): PortalRota {
  const weekDrafts = useWorkspaceSelector((state) => state.weekDrafts);
  const live = usePortalLiveShifts();
  const timezone = usePortalTimezone();

  return React.useMemo(() => {
    if (live.enabled && !timezone) {
      return {
        ...buildRota([], DEMO_NOW),
        hasPublished: false,
        weekDays: [],
        weekLabel: "",
        source: "live",
        isLoading: true,
        isError: live.isError,
        retry: live.retry,
      };
    }

    if (live.enabled && live.isSuccess) {
      // Live rota uses real wall-clock time in the venue timezone, never the
      // frozen demo clock.
      const liveNow = portalNowInTimezone(timezone!);
      const shifts = live.data?.shifts ?? [];
      return {
        ...buildRota(shifts, liveNow),
        hasPublished: resolvePortalHasPublished(shifts, live.data?.hasPublishedRota),
        weekLabel: currentWeekRangeLabel(liveNow),
        source: "live",
        isLoading: false,
        isError: false,
        retry: live.retry,
      };
    }

    if (live.enabled) {
      const liveNow = portalNowInTimezone(timezone!);
      return {
        ...buildRota([], liveNow),
        hasPublished: false,
        weekLabel: currentWeekRangeLabel(liveNow),
        source: "live",
        isLoading: live.isLoading,
        isError: live.isError,
        retry: live.retry,
      };
    }

    const demoShifts = portalShiftsForStaff(weekDrafts, "olivia-bennett");
    return {
      ...buildRota(demoShifts, DEMO_NOW),
      // Demo keeps the original "any published week exists" semantics.
      hasPublished: publishedSnapshots(weekDrafts).length > 0,
      weekLabel: currentWeekRangeLabel(DEMO_NOW),
      source: "demo",
      isLoading: false,
      isError: false,
      retry: () => undefined,
    };
  }, [
    weekDrafts,
    live.enabled,
    live.isSuccess,
    live.isLoading,
    live.isError,
    live.data,
    live.retry,
    timezone,
  ]);
}
