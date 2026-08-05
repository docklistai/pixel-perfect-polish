export interface OpsChecklistTemplateItem {
  id: string;
  position: number;
  label: string;
  requiresNote: boolean;
}
export interface OpsChecklistTemplate {
  id: string;
  name: string;
  locationId: string | null;
  departmentId: string | null;
  shiftType: string | null;
  daypart: string | null;
  active: boolean;
  items: OpsChecklistTemplateItem[];
}
export interface OpsChecklistRunItemEvent {
  id: string;
  previousState: "pending" | "done" | "exception";
  resultingState: "pending" | "done" | "exception";
  note: string | null;
  linkedOpsEntryId: string | null;
  occurredAt: string;
  actorName: string;
}
export interface OpsChecklistRunItem extends OpsChecklistTemplateItem {
  state: "pending" | "done" | "exception";
  note: string | null;
  linkedOpsEntryId: string | null;
  history: OpsChecklistRunItemEvent[];
}
export interface OpsChecklistRun {
  id: string;
  templateId: string;
  templateName: string;
  locationId: string;
  locationName: string;
  runDate: string;
  assignedStaffMemberId: string | null;
  assignedStaffName: string | null;
  status: "open" | "completed" | "reviewed";
  startedAt: string;
  completedAt: string | null;
  reviewedAt: string | null;
  isToday: boolean;
  items: OpsChecklistRunItem[];
}
