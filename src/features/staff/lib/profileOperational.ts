import { addIsoDays, liveWeekDayLabels } from "@/features/rota/lib/liveRotaDates";
import type { DraftShift, DraftShiftStatus } from "@/features/rota/types";
import type { LeaveRequest, LeaveRequestState } from "@/features/leave/types";
import type { StoredTimesheetRow } from "@/features/time/types";

/**
 * Pure, presentation-free helpers that turn already-fetched manager-side live
 * reads (`fetchWorkspaceRotaWeekFn`, `fetchWorkspaceLeaveFn`) into one staff
 * member's operational context for their profile. No fetching, no fabrication:
 * callers pass real week reads and the workspace "today", and these functions
 * filter/sort/summarise what actually exists.
 */

export interface WeekShiftsInput {
  /** Week offset relative to the current week (0 = this week), for deep links. */
  weekOffset: number;
  /** ISO date (Monday) the week starts on. */
  weekStart: string;
  shifts: DraftShift[];
}

export interface MemberUpcomingShift {
  id: string;
  weekOffset: number;
  dateIso: string;
  dayLabel: string;
  start: string;
  end: string;
  role: string;
  status: DraftShiftStatus;
}

/**
 * This staff member's assigned upcoming shifts across the supplied week reads.
 * Open/unassigned shifts are excluded (this is "their rota", not coverage gaps),
 * shifts dated before `todayIso` are dropped, and the result is sorted
 * soonest-first then capped. A non-positive `cap` returns every match.
 */
export function memberUpcomingShifts(
  weeks: WeekShiftsInput[],
  staffId: string,
  todayIso: string,
  cap: number,
): MemberUpcomingShift[] {
  const seen = new Set<string>();
  const rows: MemberUpcomingShift[] = [];

  for (const week of weeks) {
    const labels = liveWeekDayLabels(week.weekStart);
    for (const shift of week.shifts) {
      if (shift.staffId !== staffId) continue;
      // Belt-and-braces: an assigned shift can never be "open", but never let an
      // unassigned coverage gap leak into a member's own schedule.
      if (shift.status === "open") continue;
      const dateIso = addIsoDays(week.weekStart, shift.dayIndex);
      if (dateIso < todayIso) continue;
      if (seen.has(shift.id)) continue;
      seen.add(shift.id);
      rows.push({
        id: shift.id,
        weekOffset: week.weekOffset,
        dateIso,
        dayLabel: labels[shift.dayIndex] ?? dateIso,
        start: shift.start,
        end: shift.end,
        role: shift.role,
        status: shift.status,
      });
    }
  }

  rows.sort((a, b) =>
    a.dateIso === b.dateIso ? a.start.localeCompare(b.start) : a.dateIso.localeCompare(b.dateIso),
  );
  return cap > 0 ? rows.slice(0, cap) : rows;
}

export interface MemberLeaveSummary {
  total: number;
  pendingCount: number;
  nextUpcoming: {
    startIso: string;
    endIso: string;
    date: string;
    type: string;
    state: LeaveRequestState;
  } | null;
}

/** This member's leave requests, preserving source order (newest submission first). */
export function memberLeaveRequests(requests: LeaveRequest[], staffId: string): LeaveRequest[] {
  return requests.filter((request) => request.staffId === staffId);
}

/**
 * Pending count plus the next upcoming pending/approved leave for this member.
 * "Upcoming" means the leave has not fully ended before `todayIso`. Declined and
 * cancelled requests never count as upcoming, and no balances are invented.
 */
export function memberLeaveSummary(
  requests: LeaveRequest[],
  staffId: string,
  todayIso: string,
): MemberLeaveSummary {
  const mine = memberLeaveRequests(requests, staffId);
  const pendingCount = mine.filter((request) => request.state === "pending").length;
  const next =
    mine
      .filter(
        (request) =>
          (request.state === "pending" || request.state === "approved") &&
          request.endIso >= todayIso,
      )
      .sort((a, b) => a.startIso.localeCompare(b.startIso))[0] ?? null;

  return {
    total: mine.length,
    pendingCount,
    nextUpcoming: next
      ? {
          startIso: next.startIso,
          endIso: next.endIso,
          date: next.date,
          type: next.type,
          state: next.state,
        }
      : null,
  };
}

/**
 * This member's recent live time rows, newest work date first. Rows without a
 * live `staffMemberId` are excluded, which prevents demo-only rows from leaking
 * into live profile context.
 */
export function memberRecentTimeRows(
  rows: StoredTimesheetRow[],
  staffId: string,
  cap: number,
): StoredTimesheetRow[] {
  const mine = rows
    .filter((row) => row.staffMemberId === staffId)
    .sort((a, b) => {
      const dateCompare = (b.workDate ?? "").localeCompare(a.workDate ?? "");
      if (dateCompare !== 0) return dateCompare;
      return b.in.localeCompare(a.in);
    });

  return cap > 0 ? mine.slice(0, cap) : mine;
}

/**
 * Formats weekly contracted hours honestly across all manager surfaces (§4.6).
 *
 * Three states:
 * - Positive (> 0): e.g. 1440 mins -> "24h/wk"
 * - Zero (= 0): "Zero-hours contract" (never "0h/wk" or "not recorded")
 * - Null / undefined: "Contracted hours not recorded" (never "0h" or "—")
 */
export function formatContractedHours(contractedMinutesPerWeek: number | null | undefined): string {
  if (contractedMinutesPerWeek === null || contractedMinutesPerWeek === undefined) {
    return "Contracted hours not recorded";
  }
  if (contractedMinutesPerWeek === 0) {
    return "Zero-hours contract";
  }
  return `${Math.round(contractedMinutesPerWeek / 60)}h/wk`;
}

/**
 * Scheduled-versus-contracted copy where a surface already holds scheduled hours (CL-6).
 *
 * - positive contracted -> 22h scheduled / 24h contracted
 * - zero-hours contract -> 22h scheduled · Zero-hours contract
 * - null -> Contracted hours not recorded
 */
export function formatScheduledVsContracted(
  scheduledHours: number,
  contracted: number | string | null | undefined,
): string {
  if (
    contracted === null ||
    contracted === undefined ||
    contracted === "—" ||
    contracted === "-" ||
    contracted === "Contracted hours not recorded"
  ) {
    return "Contracted hours not recorded";
  }

  if (
    contracted === 0 ||
    contracted === "0" ||
    contracted === "0h" ||
    contracted === "0h/wk" ||
    contracted === "Zero-hours contract"
  ) {
    return `${scheduledHours}h scheduled · Zero-hours contract`;
  }

  if (typeof contracted === "number") {
    const hours = Math.round(contracted / 60);
    if (hours === 0) {
      return `${scheduledHours}h scheduled · Zero-hours contract`;
    }
    return `${scheduledHours}h scheduled / ${hours}h contracted`;
  }

  const match = contracted.match(/(\d+)/);
  if (match && match[1]) {
    const hours = parseInt(match[1], 10);
    if (hours === 0) {
      return `${scheduledHours}h scheduled · Zero-hours contract`;
    }
    return `${scheduledHours}h scheduled / ${hours}h contracted`;
  }

  return "Contracted hours not recorded";
}

/**
 * Formats the contracted hours sub-label on profile stat cards (§4.6).
 */
export function formatContractedSub(contractedHours: string | null | undefined): string {
  if (
    !contractedHours ||
    contractedHours === "—" ||
    contractedHours === "-" ||
    contractedHours === "Contracted hours not recorded"
  ) {
    return "Contracted hours not recorded";
  }
  if (
    contractedHours === "Zero-hours contract" ||
    contractedHours === "0h" ||
    contractedHours === "0h/wk" ||
    contractedHours === "0"
  ) {
    return "Zero-hours contract";
  }
  const clean = contractedHours.replace(/\s*\/.*$/, "").trim();
  return `${clean} contracted`;
}
