import type { DraftShift, StaffMember } from "../types";

export function visibleLiveRoster(
  roster: StaffMember[],
  assignableStaff: StaffMember[],
  shifts: DraftShift[],
): StaffMember[] {
  const assignableIds = new Set(assignableStaff.map((member) => member.id));
  const shiftedIds = new Set(
    shifts.map((shift) => shift.staffId).filter((id): id is string => Boolean(id)),
  );
  return roster.filter((member) => assignableIds.has(member.id) || shiftedIds.has(member.id));
}
