export type OpsEntryType = "task" | "incident" | "maintenance" | "service_request" | "note";
export type OpsStatus = "open" | "in_progress" | "resolved" | "archived";
export type OpsPriority = "low" | "normal" | "high" | "critical";
export type OpsSeverity = "low" | "medium" | "high" | "critical";
export type OpsSort = "time_desc" | "time_asc" | "priority_desc" | "status_asc";
export type OpsLogTab = "timeline" | "briefings" | "tasks" | "incidents" | "checks";

export interface OpsFilters {
  search: string;
  entryType: OpsEntryType | null;
  status: OpsStatus | null;
  priority: OpsPriority | null;
  locationId: string | null;
  sort: OpsSort;
  page: number;
  pageSize: number;
}

export interface OpsEntry {
  id: string;
  entryType: OpsEntryType;
  parentEntryId: string | null;
  title: string;
  description: string | null;
  locationId: string;
  locationName: string;
  locationTimezone: string;
  area: string | null;
  departmentId: string | null;
  departmentName: string | null;
  rotaWeekId: string | null;
  rotaWeekStart: string | null;
  rotaWeekOffset: number | null;
  shiftId: string | null;
  subjectStaffMemberId: string | null;
  subjectStaffName: string | null;
  leaveRequestId: string | null;
  assignedStaffMemberId: string | null;
  assignedStaffName: string | null;
  dueAt: string | null;
  priority: OpsPriority;
  status: OpsStatus;
  severity: OpsSeverity | null;
  occurredAt: string | null;
  immediateAction: string | null;
  pinned: boolean;
  createdByMembershipId: string;
  createdByName: string;
  resolvedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  followUpCount: number;
  noteCount: number;
}

export interface OpsTimelineRow {
  id: string;
  kind: "entry_event" | "handover" | "briefing";
  referenceId: string;
  entryType?: OpsEntryType;
  title: string;
  summary: string;
  status: string;
  occurredAt: string;
  actorName: string;
  locationName: string;
  area: string | null;
  priority: OpsPriority;
}

export interface OpsRisk {
  id: string;
  kind:
    | "critical_incident"
    | "overdue_entry"
    | "unassigned_priority"
    | "priority_entry"
    | "uncovered_shift"
    | "published_rota_issue"
    | "unacknowledged_handover"
    | "incomplete_checklist";
  title: string;
  body: string;
  tone: "danger" | "warning" | "info";
  entryId?: string | null;
  shiftId?: string;
  rotaWeekId?: string;
  rotaWeekOffset?: number;
  locationId?: string;
  leaveRequestId?: string;
  handoverId?: string;
  checklistRunId?: string;
}

export interface OpsMetrics {
  activeShifts: number;
  openIncidents: number;
  onShift: number;
  uncoveredShifts: number;
  tasksCompletedToday: number;
  briefingsToday: number;
  checklistPercent: number;
}

export interface OpsLocation {
  id: string;
  name: string;
  timezone: string;
}
export interface OpsDepartment {
  id: string;
  name: string;
}
export interface OpsStaffOption {
  id: string;
  name: string;
  departmentId: string | null;
  locationId: string | null;
  onShift: boolean;
}
export interface OpsManagerOption {
  id: string;
  name: string;
  isSelf: boolean;
}
export interface OpsLinkableEntry {
  id: string;
  title: string;
  locationId: string;
  status: OpsStatus;
  priority: OpsPriority;
  rotaWeekId: string | null;
  dueAt: string | null;
  severity: OpsSeverity | null;
  assignedStaffMemberId: string | null;
}
export type OpsJson = null | boolean | number | string | OpsJson[] | { [key: string]: OpsJson };
export interface OpsEntryDetail {
  events: Array<{
    id: string;
    eventType: string;
    note: string | null;
    resultingStatus: OpsStatus;
    occurredAt: string;
    actorName: string;
    details: { [key: string]: OpsJson };
  }>;
  followUps: Array<{
    id: string;
    title: string;
    status: OpsStatus;
    priority: OpsPriority;
    dueAt: string | null;
  }>;
}
