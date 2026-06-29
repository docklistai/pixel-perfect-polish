import type { PublishedRotaSnapshot, PublishedShiftSnapshot } from "@/features/rota/types";
import { parseHHMMToMinutes, shiftHours } from "@/features/rota/lib/draftRota";
import type { WorkspaceState } from "@/features/demo/store/workspaceStoreTypes";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import type { PortalShift, ShiftStatus, TeamOnDuty } from "../types";

/** Staff may clock in up to 15 minutes before their scheduled start. */
const CLOCK_IN_GRACE_MINUTES = 15;

const WORKSPACE_TZ = "Europe/London";

/** The "now" boundary used to decide which shifts are current/upcoming. */
export interface PortalNow {
  /** Today's date, `YYYY-MM-DD`, in the workspace timezone. */
  todayIso: string;
  /** Minutes since local midnight in the workspace timezone. */
  nowMinutes: number;
}

/** Real wall-clock "now" in the workspace timezone — used in live mode. */
export function londonPortalNow(now: Date = new Date()): PortalNow {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WORKSPACE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    todayIso: `${get("year")}-${get("month")}-${get("day")}`,
    nowMinutes: Number(hour) * 60 + Number(get("minute")),
  };
}

/** The frozen demo "now" — keeps the Harbour View playground coherent offline. */
export const DEMO_NOW: PortalNow = {
  todayIso: DEMO_WORLD.todayIso,
  nowMinutes: DEMO_WORLD.nowMinutes,
};

/** A single day in the portal "this week" strip. */
export interface PortalWeekDay {
  /** Date as `YYYY-MM-DD`. */
  iso: string;
  /** Day of month, 1–31. */
  dayNum: number;
  /** Single-letter weekday label (Mon–Sun). */
  letter: string;
}

const WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Monday–Sunday of the week containing `now`, derived from the same clock the
 * rota uses (demo clock in demo mode, real wall-clock in live mode). Dates are
 * computed in UTC to avoid off-by-one drift around timezone boundaries.
 */
export function currentWeekStrip(now: PortalNow = DEMO_NOW): PortalWeekDay[] {
  const base = new Date(`${now.todayIso}T00:00:00Z`);
  const mondayOffset = (base.getUTCDay() + 6) % 7;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - mondayOffset);
  return WEEK_LETTERS.map((letter, i) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + i);
    return { iso: day.toISOString().slice(0, 10), dayNum: day.getUTCDate(), letter };
  });
}

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
export function upcomingPortalShifts(
  shifts: PortalShift[],
  now: PortalNow = DEMO_NOW,
): PortalShift[] {
  const { todayIso, nowMinutes } = now;
  return shifts.filter((shift) => {
    if (shift.date > todayIso) return true;
    if (shift.date < todayIso) return false;
    const end = parseHHMMToMinutes(shift.end);
    // Shifts wrapping past midnight ("16:00"–"00:00") end tomorrow.
    const endsLater = end === null || end === 0 || end > nowMinutes;
    return endsLater;
  });
}

/** Published shifts that have already ended, newest first for the History tab. */
export function historicalPortalShifts(
  shifts: PortalShift[],
  now: PortalNow = DEMO_NOW,
): PortalShift[] {
  const { todayIso, nowMinutes } = now;
  return shifts
    .filter((shift) => {
      if (shift.date < todayIso) return true;
      if (shift.date > todayIso) return false;
      const start = parseHHMMToMinutes(shift.start);
      const end = parseHHMMToMinutes(shift.end);
      if (start === null || end === null) return false;
      if (end <= start) return false;
      return end <= nowMinutes;
    })
    .sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`));
}

export function resolvePortalHasPublished(
  shifts: PortalShift[],
  workspaceHasPublishedRota?: boolean,
): boolean {
  return workspaceHasPublishedRota ?? shifts.length > 0;
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
export function clockInShift(shifts: PortalShift[], now: PortalNow = DEMO_NOW): PortalShift | null {
  const { todayIso, nowMinutes } = now;
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
