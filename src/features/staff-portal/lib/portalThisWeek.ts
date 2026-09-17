import { isOvernightLocal } from "@/features/rota/lib/scheduling/calendarInterval";
import type { PortalShift } from "../types";
import type { PortalWeekDay } from "./portalNow";

export interface PortalLeaveContext {
  type: string;
  isApproved: boolean;
}

export interface PortalThisWeekDay {
  iso: string;
  dayNum: number;
  letter: string;
  weekdayName: string;
  formattedDate: string;
  isToday: boolean;
  shifts: PortalShift[];
  primaryShift: PortalShift | null;
  isOvernight: boolean;
  leaveContext: PortalLeaveContext | null;
  isOff: boolean;
}

export interface PortalThisWeekShape {
  hasPublished: boolean;
  weekLabel: string;
  days: PortalThisWeekDay[];
  assignedShiftCount: number;
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface BuildPortalThisWeekInput {
  hasPublished: boolean;
  weekDays: PortalWeekDay[];
  shifts: PortalShift[];
  leaveRequests?: Array<{
    startIso: string;
    endIso: string;
    type: string;
    status?: string;
    state?: string;
  }>;
  todayIso?: string;
  weekLabel?: string;
}

/**
 * Builds the compact representation of the staff member's published week (§8.3).
 *
 * Rules:
 * - Published truth only: if no published snapshot exists, returns an honest empty shape
 *   with no fabricated shifts.
 * - Shows every day of the week (Monday through Sunday).
 * - Only assigned shifts for this staff member appear (open/unassigned shifts are excluded).
 * - Overnight finish is unambiguous.
 * - Approved leave appears as context on days without shifts.
 * - Days without shifts or leave are marked as Off.
 * - Excludes all manager metrics, labour figures, and contracted hours.
 */
export function buildPortalThisWeekShape(input: BuildPortalThisWeekInput): PortalThisWeekShape {
  const {
    hasPublished,
    weekDays,
    shifts,
    leaveRequests = [],
    todayIso = "",
    weekLabel = "",
  } = input;

  if (!hasPublished || weekDays.length === 0) {
    return {
      hasPublished: false,
      weekLabel,
      days: [],
      assignedShiftCount: 0,
    };
  }

  // Filter approved leave only
  const approvedLeaves = leaveRequests.filter((r) => {
    const s = r.status ?? r.state;
    return s === "approved";
  });

  let assignedShiftCount = 0;

  const days: PortalThisWeekDay[] = weekDays.map((wd, index) => {
    const weekdayName = WEEKDAY_NAMES[index] ?? wd.letter;
    const isToday = wd.iso === todayIso;

    // Assigned published shifts for this day
    const dayShifts = shifts.filter((s) => s.date === wd.iso && s.status !== "open");
    assignedShiftCount += dayShifts.length;

    const primaryShift = dayShifts[0] ?? null;
    const isOvernight = primaryShift
      ? isOvernightLocal(primaryShift.start, primaryShift.end)
      : false;

    // Approved leave context if no shift is assigned
    let leaveContext: PortalLeaveContext | null = null;
    if (dayShifts.length === 0) {
      const matchLeave = approvedLeaves.find((l) => wd.iso >= l.startIso && wd.iso <= l.endIso);
      if (matchLeave) {
        leaveContext = {
          type: matchLeave.type,
          isApproved: true,
        };
      }
    }

    const isOff = dayShifts.length === 0 && leaveContext === null;

    return {
      iso: wd.iso,
      dayNum: wd.dayNum,
      letter: wd.letter,
      weekdayName,
      formattedDate: `${weekdayName} ${wd.dayNum}`,
      isToday,
      shifts: dayShifts,
      primaryShift,
      isOvernight,
      leaveContext,
      isOff,
    };
  });

  return {
    hasPublished: true,
    weekLabel,
    days,
    assignedShiftCount,
  };
}
