import { Users, Calendar } from "lucide-react";
import { totalScheduledHours } from "@/features/rota/lib/rotaSummaries";
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

export interface LiveKpiInput {
  shifts: DraftShift[];
  staffCount: number;
  onShiftToday: number;
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
export function buildLiveKpis({ shifts, staffCount, onShiftToday }: LiveKpiInput): LiveKpiOutput {
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
    ],
  };
}
