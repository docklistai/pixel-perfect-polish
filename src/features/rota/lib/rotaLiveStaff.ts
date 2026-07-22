import type { StaffRow } from "@/features/staff/types";
import type { ShiftTone, StaffMember } from "../types";

const TONE_CYCLE: ShiftTone[] = ["info", "warning", "purple", "success", "danger"];

export function toRotaStaffMember(row: StaffRow, index: number): StaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    hrs: row.hours === "—" ? "—" : row.hours.replace("/wk", ""),
    img: row.img,
    tone: TONE_CYCLE[index % TONE_CYCLE.length]!,
    departmentId: row.departmentId ?? null,
  };
}
