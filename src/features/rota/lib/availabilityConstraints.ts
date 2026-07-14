import type { DraftShift, RotaGridStaffRow, StaffMember } from "../types";
import { isoWeekday } from "./recurringDayOffClashes";
import { addIsoDays } from "./liveRotaDates";

export interface ApprovedAvailabilityConstraints {
  recurringByStaff: Map<string, Set<number>>;
  unavailableDatesByStaff: Map<string, Set<string>>;
}

export interface AvailabilityConstraintClash {
  shiftId: string;
  staffId: string;
  staffName: string;
  isoDate: string;
  dayLabel: string;
  kind: "unavailable" | "day-off";
}

interface RecurringConstraintFact {
  staffMemberId: string;
  weekday: number;
  status: string;
}

interface OneOffConstraintFact {
  staffMemberId: string;
  date: string;
  status: string;
}

export function buildApprovedAvailabilityConstraints(
  recurring: RecurringConstraintFact[],
  oneOff: OneOffConstraintFact[],
): ApprovedAvailabilityConstraints {
  const recurringByStaff = new Map<string, Set<number>>();
  const unavailableDatesByStaff = new Map<string, Set<string>>();
  for (const request of recurring) {
    if (request.status !== "approved") continue;
    const weekdays = recurringByStaff.get(request.staffMemberId) ?? new Set<number>();
    weekdays.add(request.weekday);
    recurringByStaff.set(request.staffMemberId, weekdays);
  }
  for (const request of oneOff) {
    if (request.status !== "approved") continue;
    const dates = unavailableDatesByStaff.get(request.staffMemberId) ?? new Set<string>();
    dates.add(request.date);
    unavailableDatesByStaff.set(request.staffMemberId, dates);
  }
  return { recurringByStaff, unavailableDatesByStaff };
}

function constraintKind(
  staffId: string,
  isoDate: string,
  constraints: ApprovedAvailabilityConstraints,
): AvailabilityConstraintClash["kind"] | null {
  if (constraints.unavailableDatesByStaff.get(staffId)?.has(isoDate)) return "unavailable";
  if (constraints.recurringByStaff.get(staffId)?.has(isoWeekday(isoDate))) return "day-off";
  return null;
}

export function applyAvailabilityHints(
  rows: RotaGridStaffRow[],
  dayIsoDates: string[],
  constraints: ApprovedAvailabilityConstraints,
): RotaGridStaffRow[] {
  return rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell, dayIndex) => {
      const isoDate = dayIsoDates[dayIndex];
      if (!isoDate) return cell;
      const availabilityHint = constraintKind(row.staff.id, isoDate, constraints);
      return availabilityHint ? { ...cell, availabilityHint } : cell;
    }),
  }));
}

export function findAvailabilityConstraintClashes(
  shifts: DraftShift[],
  dayIsoDates: string[],
  constraints: ApprovedAvailabilityConstraints,
  staffById: Map<string, StaffMember>,
): AvailabilityConstraintClash[] {
  const clashes: AvailabilityConstraintClash[] = [];
  for (const shift of shifts) {
    if (!shift.staffId) continue;
    const isoDate = dayIsoDates[shift.dayIndex];
    if (!isoDate) continue;
    const dates = shift.end <= shift.start ? [isoDate, addIsoDays(isoDate, 1)] : [isoDate];
    for (const constraintDate of dates) {
      const kind = constraintKind(shift.staffId, constraintDate, constraints);
      if (!kind) continue;
      clashes.push({
        shiftId: shift.id,
        staffId: shift.staffId,
        staffName: staffById.get(shift.staffId)?.name ?? "This staff member",
        isoDate: constraintDate,
        dayLabel: new Intl.DateTimeFormat("en-GB", {
          timeZone: "UTC",
          weekday: "long",
          day: "numeric",
          month: "short",
        }).format(new Date(`${constraintDate}T12:00:00Z`)),
        kind,
      });
    }
  }
  return clashes;
}

export function isStaffConstrainedOnDates(
  staffId: string,
  isoDates: string[],
  constraints: ApprovedAvailabilityConstraints,
): boolean {
  return isoDates.some((date) => constraintKind(staffId, date, constraints) !== null);
}
