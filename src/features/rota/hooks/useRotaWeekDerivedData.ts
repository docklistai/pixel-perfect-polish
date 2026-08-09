import * as React from "react";
import * as liveDates from "../lib/liveRotaDates";
import { getCurrentWeekDayIndex, getWeekDayLabels, getWeekDateIsoLabels } from "../lib/weekHelpers";
import {
  buildLocalConflictSummaries,
  localConflictShiftIds,
  withLocalConflictStatus,
} from "../lib/localConflicts";
import {
  boundaryConflictShiftIds,
  buildBoundaryConflictSummaries,
  withBoundaryConflictStatus,
} from "../lib/boundaryConflicts";
import { buildDayStats } from "../lib/rotaSummaries";
import {
  buildApprovedLeaveConflictSummaries,
  withApprovedLeaveConflictStatus,
} from "@/features/leave/lib/leaveRotaConflicts";
import type { ConflictSummary, DraftShift, StaffMember } from "../types";
import type { BoundaryOverlap } from "../api/boundaryOverlaps";
import type { LeaveRequest } from "@/features/leave/types";

const NO_BOUNDARY_OVERLAPS: BoundaryOverlap[] = [];

/**
 * Turns the week's raw shifts into what the grid renders: conflict-annotated
 * shifts, day headers, and the conflict lists behind the publish boundary.
 *
 * Live and demo weeks differ only in where the calendar comes from — a live week
 * is anchored to its stored `week_start`, a demo week to the offset — so both
 * paths resolve their dates here rather than in the controller.
 */
export function useRotaWeekDerivedData({
  isLive,
  weekStart,
  today,
  weekOffset,
  sourceShifts,
  leaveRequests,
  roster,
  boundaryOverlaps = NO_BOUNDARY_OVERLAPS,
}: {
  isLive: boolean;
  weekStart: string | null;
  today: string | null;
  weekOffset: number;
  sourceShifts: DraftShift[];
  leaveRequests: LeaveRequest[];
  roster: StaffMember[];
  /**
   * Overlaps against assigned shifts outside this rota week — another week,
   * another location, or both. Conflict context only: these never enter
   * `displayShifts`, day stats, coverage, or any planned/assigned/open count.
   */
  boundaryOverlaps?: BoundaryOverlap[];
}) {
  const dayIsoDates = React.useMemo(() => {
    if (isLive && weekStart) {
      return Array.from({ length: 7 }, (_, index) => liveDates.addIsoDays(weekStart, index));
    }
    return getWeekDateIsoLabels(weekOffset);
  }, [isLive, weekStart, weekOffset]);

  // Only the conflict STATUS of existing rows changes here. No external shift
  // is ever added, so every downstream count derived from `displayShifts`
  // (day stats, coverage, planned/assigned/open totals, copy/build/import
  // input) keeps describing exactly the selected rota week.
  const displayShifts = React.useMemo(
    () =>
      withApprovedLeaveConflictStatus(
        withBoundaryConflictStatus(
          withLocalConflictStatus(sourceShifts, dayIsoDates),
          boundaryOverlaps,
        ),
        leaveRequests,
        dayIsoDates,
      ),
    [boundaryOverlaps, dayIsoDates, leaveRequests, sourceShifts],
  );

  const dayLabels = React.useMemo(() => {
    if (isLive && weekStart) return liveDates.liveWeekDayLabels(weekStart);
    return getWeekDayLabels(weekOffset);
  }, [isLive, weekStart, weekOffset]);

  const days = React.useMemo(() => {
    const stats = buildDayStats(displayShifts);
    const currentDayIndex =
      isLive && weekStart && today
        ? liveDates.liveCurrentDayIndex(weekStart, today)
        : getCurrentWeekDayIndex(weekOffset);
    return dayLabels.map((d, index) => ({
      d,
      isToday: index === currentDayIndex,
      ...stats[index]!,
    }));
  }, [dayLabels, displayShifts, isLive, today, weekStart, weekOffset]);

  // Approved-leave conflicts live in the conflict list only; the separate count
  // is derived from the same array so the publish boundary can treat them as
  // acknowledgeable scheduling constraints without duplicating the conflicts.
  const approvedLeaveConflictSummaries: ConflictSummary[] = buildApprovedLeaveConflictSummaries(
    displayShifts,
    leaveRequests,
    dayIsoDates,
    roster,
    dayLabels,
  );
  const conflictSummaries: ConflictSummary[] = [
    ...buildLocalConflictSummaries(displayShifts, roster, dayLabels, dayIsoDates),
    ...buildBoundaryConflictSummaries(boundaryOverlaps, displayShifts, roster, dayLabels),
    ...approvedLeaveConflictSummaries,
  ];

  return {
    dayIsoDates,
    dayLabels,
    days,
    displayShifts,
    conflictSummaries,
    approvedLeaveConflictSummaries,
    // Unique overlapping SHIFTS BELONGING TO THIS WEEK, not overlapping pairs —
    // the mirror of the RPC's `overlapping_shift` clash kind, which emits one
    // row per affected shift on the published-week side only.
    // `conflictSummaries.length` cannot be reused here: it counts pairs and
    // also folds in approved-leave conflicts, which are acknowledged separately.
    //
    // The union is what keeps the count exact. A shift overlapping both an
    // in-week partner and one outside the week is ONE shift the manager must
    // look at, and the RPC's `select distinct` says the same. The external
    // half of a boundary pair is deliberately never counted: it is not in the
    // week being published and the manager cannot act on it from here.
    overlappingShiftCount: new Set([
      ...localConflictShiftIds(displayShifts, dayIsoDates),
      ...boundaryConflictShiftIds(boundaryOverlaps),
    ]).size,
  };
}
