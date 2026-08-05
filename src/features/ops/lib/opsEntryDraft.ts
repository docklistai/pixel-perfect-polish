import type { OpsEntryDraft } from "../api/opsEntryMutations";
import type { OpsEntry, OpsLocation, OpsPrefill } from "../types";

export function initialOpsEntryDraft(
  locations: OpsLocation[],
  prefill: OpsPrefill,
  entry?: OpsEntry | null,
): OpsEntryDraft {
  if (entry)
    return {
      entryType: entry.entryType,
      title: entry.title,
      description: entry.description,
      locationId: entry.locationId,
      area: entry.area,
      departmentId: entry.departmentId,
      rotaWeekId: entry.rotaWeekId,
      shiftId: entry.shiftId,
      subjectStaffMemberId: entry.subjectStaffMemberId,
      leaveRequestId: entry.leaveRequestId,
      assignedStaffMemberId: entry.assignedStaffMemberId,
      dueAt: entry.dueAt,
      priority: entry.priority,
      severity: entry.severity,
      occurredAt: entry.occurredAt,
      immediateAction: entry.immediateAction,
      parentEntryId: entry.parentEntryId,
    };
  return {
    entryType: "task",
    title: "",
    description: null,
    locationId: prefill.locationId ?? locations[0]?.id ?? "",
    area: null,
    departmentId: prefill.departmentId ?? null,
    rotaWeekId: prefill.rotaWeekId ?? null,
    shiftId: prefill.shiftId ?? null,
    subjectStaffMemberId: prefill.staffMemberId ?? null,
    leaveRequestId: prefill.leaveRequestId ?? null,
    assignedStaffMemberId: prefill.staffMemberId ?? null,
    dueAt: null,
    priority: "normal",
    severity: null,
    occurredAt: null,
    immediateAction: null,
    parentEntryId: null,
  };
}
