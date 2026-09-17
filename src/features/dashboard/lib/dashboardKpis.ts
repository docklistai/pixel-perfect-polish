import { Users, Calendar } from "lucide-react";
import { countOpenShifts, totalScheduledHours } from "@/features/rota/lib/rotaSummaries";
import type { DraftShift } from "@/features/rota/types";
import type { KpiItem } from "../types";

/**
 * Live KPI derivation, extracted from `useDashboardData` so that hook stays
 * within its size budget. Pure: it takes already-fetched live reads and returns
 * presentation rows, so the rules stay unit-testable and free of React.
 */

/** Index of `todayIso` within the week starting `weekStartIso`, or null if outside it. */
export function dayIndexInWeek(
  weekStartIso: string | null,
  todayIso: string | null,
): number | null {
  if (!weekStartIso || !todayIso) return null;
  const diff = Math.round((Date.parse(todayIso) - Date.parse(weekStartIso)) / 86_400_000);
  return diff >= 0 && diff <= 6 ? diff : null;
}

/** Assigned shifts sitting on today's day index; 0 when today is outside the week. */
export function countAssignedToday(shifts: DraftShift[], todayIndex: number | null): number {
  if (todayIndex === null) return 0;
  return shifts.filter((shift) => shift.dayIndex === todayIndex && shift.staffId !== null).length;
}

/** Open shifts sitting on today's day index; 0 when today is outside the week. */
export function countOpenToday(shifts: DraftShift[], todayIndex: number | null): number {
  if (todayIndex === null) return 0;
  return shifts.filter((shift) => shift.dayIndex === todayIndex && shift.staffId === null).length;
}

export interface LiveKpiInput {
  shifts: DraftShift[];
  staffCount: number;
  onShiftToday: number;
  openShiftsToday?: number;
}

export interface LiveKpiOutput {
  weeklyKpis: KpiItem[];
  todayKpis: KpiItem[];
}

/**
 * Live KPIs are derived from live reads only. Coverage needs role-requirement
 * data that has no live source yet, so it is replaced with the live team size
 * rather than shown as a fabricated percentage.
 */
export function buildLiveKpis({
  shifts,
  staffCount,
  onShiftToday,
  openShiftsToday = 0,
}: LiveKpiInput): LiveKpiOutput {
  const weekOpen = countOpenShifts(shifts);
  return {
    weeklyKpis: [
      {
        icon: Users,
        label: "Scheduled hours",
        value: `${Math.round(totalScheduledHours(shifts))}h`,
        delta: "This week · live",
        tone: "info",
        tip: "Total scheduled hours this week, from your live rota.",
      },
      {
        icon: Calendar,
        label: "Open shifts",
        value: String(weekOpen),
        delta: weekOpen > 0 ? "Needs filling" : "All filled",
        tone: weekOpen > 0 ? "warning" : "muted",
        tip: "Unassigned shifts in this week's rota.",
      },
      {
        icon: Users,
        label: "Team size",
        value: String(staffCount),
        delta: "Live roster",
        tone: "brand",
        tip: "Staff members in your workspace roster.",
      },
    ],
    todayKpis: [
      {
        icon: Calendar,
        label: "On shift today",
        value: String(onShiftToday),
        delta: "Live",
        tone: "info",
        tip: "Assigned shifts on today's live rota.",
      },
      {
        icon: Users,
        label: "Open today",
        value: String(openShiftsToday),
        delta: openShiftsToday > 0 ? "Urgent · unassigned" : "Fully staffed",
        tone: openShiftsToday > 0 ? "warning" : "muted",
        tip: "Shifts today with no staff member assigned.",
      },
    ],
  };
}

export interface CompactDayStat {
  dayIndex: number;
  dayLabel: string;
  assigned: number;
  open: number;
  planned: number;
  summary: string;
  tone: "muted" | "warning" | "danger";
}

const DEFAULT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Compact week-at-a-glance using WS-2 assignment and open truth.
 * Stated as "6 of 8 assigned · 2 open", "8 assigned", or "No shifts planned".
 * Never computes or exposes a coverage percentage.
 */
export function buildCompactWeekShape(
  shifts: DraftShift[],
  dayLabels: string[] = DEFAULT_DAYS,
): CompactDayStat[] {
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const dayShifts = shifts.filter((shift) => shift.dayIndex === dayIndex);
    const assigned = dayShifts.filter((shift) => shift.staffId !== null).length;
    const open = dayShifts.filter((shift) => shift.staffId === null).length;
    const planned = assigned + open;
    const hasConflict = dayShifts.some((shift) => shift.status === "conflict");

    const summary =
      planned === 0
        ? "No shifts planned"
        : open > 0
          ? `${assigned} of ${planned} assigned · ${open} open`
          : `${assigned} assigned`;

    const tone: CompactDayStat["tone"] = open > 0 ? "warning" : hasConflict ? "danger" : "muted";

    return {
      dayIndex,
      dayLabel: dayLabels[dayIndex] ?? `Day ${dayIndex + 1}`,
      assigned,
      open,
      planned,
      summary,
      tone,
    };
  });
}
