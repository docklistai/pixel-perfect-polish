import * as React from "react";
import * as liveDates from "../lib/liveRotaDates";
import { getCurrentWeekDayIndex, getWeekDayLabels, getWeekDateIsoLabels } from "../lib/weekHelpers";
import { buildLocalConflictSummaries, withLocalConflictStatus } from "../lib/localConflicts";
import { buildDayStats } from "../lib/rotaSummaries";
import {
  buildApprovedLeaveConflictSummaries,
  withApprovedLeaveConflictStatus,
} from "@/features/leave/lib/leaveRotaConflicts";
import type { ConflictSummary, DraftShift, StaffMember } from "../types";
import type { LeaveRequest } from "@/features/leave/types";

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
}: {
  isLive: boolean;
  weekStart: string | null;
  today: string | null;
  weekOffset: number;
  sourceShifts: DraftShift[];
  leaveRequests: LeaveRequest[];
  roster: StaffMember[];
}) {
  const dayIsoDates = React.useMemo(() => {
    if (isLive && weekStart) {
      return Array.from({ length: 7 }, (_, index) => liveDates.addIsoDays(weekStart, index));
    }
    return getWeekDateIsoLabels(weekOffset);
  }, [isLive, weekStart, weekOffset]);

  const displayShifts = React.useMemo(
    () =>
      withApprovedLeaveConflictStatus(
        withLocalConflictStatus(sourceShifts),
        leaveRequests,
        dayIsoDates,
      ),
    [dayIsoDates, leaveRequests, sourceShifts],
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
    ...buildLocalConflictSummaries(displayShifts, roster, dayLabels),
    ...approvedLeaveConflictSummaries,
  ];

  return {
    dayIsoDates,
    dayLabels,
    days,
    displayShifts,
    conflictSummaries,
    approvedLeaveConflictSummaries,
  };
}
