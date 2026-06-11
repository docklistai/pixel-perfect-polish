import type { PublishedRotaSnapshot, PublishedShiftSnapshot } from "@/features/rota/types";
import { parseHHMMToMinutes, shiftHours } from "@/features/rota/lib/draftRota";
import type { WorkspaceState } from "@/features/demo/store/workspaceStoreTypes";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import type { PortalShift, ShiftStatus, TeamOnDuty } from "../types";

/** Staff may clock in up to 15 minutes before their scheduled start. */
const CLOCK_IN_GRACE_MINUTES = 15;

function portalStatus(status: PublishedShiftSnapshot["status"]): ShiftStatus {
  return status === "changed" ? "changed" : "confirmed";
}

/**
 * Published snapshots visible to staff: current and future weeks only,
 * ordered by week start. Drafts never appear here.
 */
export function publishedSnapshots(
  weekDrafts: WorkspaceState["weekDrafts"],
): PublishedRotaSnapshot[] {
  return Object.entries(weekDrafts)
    .filter(([key, draft]) => Number(key) >= 0 && draft.publishedSnapshot !== null)
    .map(([, draft]) => draft.publishedSnapshot!)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function mapPublishedSnapshotToPortalShifts(
  snapshot: PublishedRotaSnapshot,
  staffId: string,
): PortalShift[] {
  return snapshot.shifts
    .filter((shift) => shift.staffId === staffId)
    .map((shift) => ({
      id: shift.id,
      date: shift.date,
      dayLabel: shift.dayLabel,
      start: shift.start,
      end: shift.end,
      hours: shiftHours(shift.start, shift.end),
      role: shift.role,
      station: shift.location,
      breakMinutes: shift.breakMinutes,
      status: portalStatus(shift.status),
      sourceSnapshotVersion: snapshot.version,
      publishedAt: snapshot.publishedAt,
    }));
}

/** All of this staff member's shifts across published weeks, soonest first. */
export function portalShiftsForStaff(
  weekDrafts: WorkspaceState["weekDrafts"],
  staffId: string,
): PortalShift[] {
  return publishedSnapshots(weekDrafts)
    .flatMap((snapshot) => mapPublishedSnapshotToPortalShifts(snapshot, staffId))
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
}

/** Today's and future shifts (today's shift stays visible until it ends). */
export function upcomingPortalShifts(shifts: PortalShift[]): PortalShift[] {
  const { todayIso, nowMinutes } = DEMO_WORLD;
  return shifts.filter((shift) => {
    if (shift.date > todayIso) return true;
    if (shift.date < todayIso) return false;
    const end = parseHHMMToMinutes(shift.end);
    // Shifts wrapping past midnight ("16:00"–"00:00") end tomorrow.
    const endsLater = end === null || end === 0 || end > nowMinutes;
    return endsLater;
  });
}

/**
 * Colleagues with a published shift today (staff-safe: names, roles, and
 * shift times only), excluding the signed-in staff member.
 */
export function teamOnDutyToday(
  weekDrafts: WorkspaceState["weekDrafts"],
  excludeStaffId: string,
): TeamOnDuty[] {
  const { todayIso } = DEMO_WORLD;
  return publishedSnapshots(weekDrafts)
    .flatMap((snapshot) => snapshot.shifts)
    .filter(
      (shift) =>
        shift.date === todayIso && shift.staffId !== null && shift.staffId !== excludeStaffId,
    )
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((shift) => ({
      id: shift.staffId!,
      name: shift.staffName ?? "Unassigned",
      initials: shift.staffInitials ?? "—",
      role: shift.role,
      shiftLabel: `${shift.start} – ${shift.end}`,
    }));
}

/** The shift the staff member can clock in for right now, if any. */
export function clockInShift(shifts: PortalShift[]): PortalShift | null {
  const { todayIso, nowMinutes } = DEMO_WORLD;
  return (
    shifts.find((shift) => {
      if (shift.date !== todayIso) return false;
      const start = parseHHMMToMinutes(shift.start);
      const end = parseHHMMToMinutes(shift.end);
      if (start === null || end === null) return false;
      const endMinutes = end <= start ? end + 24 * 60 : end;
      return nowMinutes >= start - CLOCK_IN_GRACE_MINUTES && nowMinutes < endMinutes;
    }) ?? null
  );
}
