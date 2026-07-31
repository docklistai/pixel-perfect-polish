import type { StaffRow } from "@/features/staff/types";
import type { ShiftTone, StaffMember } from "../types";

const TONE_CYCLE: ShiftTone[] = ["info", "warning", "purple", "success", "danger"];

export function toRotaStaffMember(row: StaffRow, index: number): StaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    hrs: row.hours === "—" ? "—" : row.hours.replace("/wk", ""),
    // The numeric figure is already selected and mapped by staffLiveData; it was
    // previously dropped here, leaving `hrs` (a display string) as the only
    // contracted-hours input scheduling could see.
    contractedMinutesPerWeek: row.contractedMinutesPerWeek ?? null,
    img: row.img,
    tone: TONE_CYCLE[index % TONE_CYCLE.length]!,
    departmentId: row.departmentId ?? null,
  };
}
