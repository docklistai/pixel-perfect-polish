import * as React from "react";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import {
  clockInShift,
  DEMO_NOW,
  londonPortalNow,
  portalShiftsForStaff,
  publishedSnapshots,
  upcomingPortalShifts,
  type PortalNow,
} from "../lib/portalRota";
import type { PortalShift } from "../types";
import { usePortalLiveShifts } from "./usePortalLiveShifts";

export type PortalRota = {
  /** True once any current/future week has published shifts for this member. */
  hasPublished: boolean;
  /** Today's and future published shifts for the signed-in staff member. */
  upcoming: PortalShift[];
  /** The first upcoming shift (today's shift until it ends, then the next). */
  nextShift: PortalShift | null;
  /** The shift Olivia can clock in for right now, or null. */
  activeShift: PortalShift | null;
  /** Where the rota came from: the live DB view or the demo WorkspaceStore. */
  source: "live" | "demo";
  /** Live read in flight with nothing to show yet. */
  isLoading: boolean;
  /** Live read failed; the demo fallback is being shown instead. */
  isError: boolean;
};

function buildRota(
  shifts: PortalShift[],
  now: PortalNow,
): Omit<PortalRota, "source" | "isLoading" | "isError"> {
  const upcoming = upcomingPortalShifts(shifts, now);
  return {
    hasPublished: shifts.length > 0,
    upcoming,
    nextShift: upcoming[0] ?? null,
    activeShift: clockInShift(shifts, now),
  };
}

/**
 * Staff-safe rota projection for the signed-in staff member. Prefers the live
 * published-snapshot view when an authenticated staff session is available and
 * the read succeeds; otherwise falls back to the demo WorkspaceStore so the
 * Harbour View playground keeps working when Supabase is unconfigured or the
 * read fails.
 */
export function usePortalRota(): PortalRota {
  const weekDrafts = useWorkspaceSelector((state) => state.weekDrafts);
  const live = usePortalLiveShifts();

  return React.useMemo(() => {
    if (live.enabled && live.isSuccess) {
      // Live rota uses real wall-clock time, never the frozen demo clock.
      const liveNow = londonPortalNow();
      return {
        ...buildRota(live.data ?? [], liveNow),
        source: "live",
        isLoading: false,
        isError: false,
      };
    }

    if (live.enabled) {
      return {
        ...buildRota([], londonPortalNow()),
        hasPublished: false,
        source: "live",
        isLoading: live.isLoading,
        isError: live.isError,
      };
    }

    const demoShifts = portalShiftsForStaff(weekDrafts, "olivia-bennett");
    return {
      ...buildRota(demoShifts, DEMO_NOW),
      // Demo keeps the original "any published week exists" semantics.
      hasPublished: publishedSnapshots(weekDrafts).length > 0,
      source: "demo",
      isLoading: false,
      isError: false,
    };
  }, [weekDrafts, live.enabled, live.isSuccess, live.isLoading, live.isError, live.data]);
}
