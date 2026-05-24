import type {
  DraftShift,
  PublishedRotaSnapshot,
  PublishedShiftSnapshot,
  StaffId,
  StaffMember,
} from "../types";
import { getWeekDateIsoLabels, getWeekDayLabels, getWeekStartIso } from "./weekHelpers";

const STAFF_SAFE_LOCATION = "Harbour View Hotel";
const DEFAULT_BREAK_MINUTES = 30;
const DEFAULT_WORKSPACE_ID = "harbour-view";
const DEFAULT_PUBLISHER = { id: "sophie-carter" as StaffId, name: "Sophie Carter" };

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function didShiftChange(
  shift: DraftShift,
  previousSnapshot: PublishedRotaSnapshot | null,
): boolean {
  const previous = previousSnapshot?.shifts.find((item) => item.id === shift.id);
  if (!previous) return false;
  return (
    previous.staffId !== shift.staffId ||
    previous.role !== shift.role ||
    previous.start !== shift.start ||
    previous.end !== shift.end ||
    previous.dayIndex !== shift.dayIndex
  );
}

export function buildPublishedRotaSnapshot({
  shifts,
  staff,
  weekOffset,
  weekLabel,
  previousSnapshot,
  publishedAt = new Date().toISOString(),
}: {
  shifts: DraftShift[];
  staff: StaffMember[];
  weekOffset: number;
  weekLabel: string;
  previousSnapshot: PublishedRotaSnapshot | null;
  publishedAt?: string;
}): PublishedRotaSnapshot {
  const dates = getWeekDateIsoLabels(weekOffset);
  const dayLabels = getWeekDayLabels(weekOffset);
  const nextVersion = (previousSnapshot?.version ?? 0) + 1;

  return {
    workspaceId: DEFAULT_WORKSPACE_ID,
    weekKey: String(weekOffset),
    weekStart: getWeekStartIso(weekOffset),
    weekLabel,
    version: nextVersion,
    publishedAt,
    publishedBy: DEFAULT_PUBLISHER,
    shifts: shifts.map<PublishedShiftSnapshot>((shift) => {
      const assignedStaff = staff.find((member) => member.id === shift.staffId) ?? null;
      const changed = shift.staffId !== null && didShiftChange(shift, previousSnapshot);
      return {
        id: shift.id,
        dayIndex: shift.dayIndex,
        date: dates[shift.dayIndex] ?? "",
        dayLabel: dayLabels[shift.dayIndex] ?? "",
        staffId: shift.staffId,
        staffName: assignedStaff?.name ?? null,
        staffInitials: assignedStaff ? initials(assignedStaff.name) : null,
        role: shift.role,
        start: shift.start,
        end: shift.end,
        location: STAFF_SAFE_LOCATION,
        breakMinutes: DEFAULT_BREAK_MINUTES,
        status: shift.staffId === null ? "open" : changed ? "changed" : "scheduled",
      };
    }),
  };
}
