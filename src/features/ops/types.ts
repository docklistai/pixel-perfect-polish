import type {
  OpsEntry,
  OpsEntryDetail,
  OpsFilters,
  OpsLocation,
  OpsManagerOption,
  OpsDepartment,
  OpsStaffOption,
  OpsTimelineRow,
  OpsRisk,
  OpsMetrics,
  OpsLinkableEntry,
} from "./types/domain";
import type { OpsBriefing, OpsHandover } from "./types/collaboration";
import type { OpsChecklistRun, OpsChecklistTemplate } from "./types/checklists";

export * from "./types/domain";
export * from "./types/collaboration";
export * from "./types/checklists";

export interface OpsPageData {
  actorMembershipId: string;
  filters: OpsFilters;
  total: number;
  facets: {
    topLevel: number;
    tasks: number;
    incidents: number;
    open: number;
    inProgress: number;
    resolved: number;
    archived: number;
  };
  entries: OpsEntry[];
  selectedEntry: OpsEntry | null;
  timeline: OpsTimelineRow[];
  /** Cap applied to entry events only; handovers and briefings are never bounded. */
  timelineEntryEventLimit: number;
  /** True when the location-day had more entry events than the cap returns. */
  timelineTruncated: boolean;
  risks: OpsRisk[];
  metrics: OpsMetrics;
  locations: OpsLocation[];
  departments: OpsDepartment[];
  staff: OpsStaffOption[];
  managers: OpsManagerOption[];
  linkableEntries: OpsLinkableEntry[];
  detail: OpsEntryDetail | null;
  handovers: OpsHandover[];
  briefings: OpsBriefing[];
  checklistTemplates: OpsChecklistTemplate[];
  checklistRuns: OpsChecklistRun[];
}

export interface OpsPrefill {
  create?: boolean;
  locationId?: string;
  rotaWeekId?: string;
  shiftId?: string;
  staffMemberId?: string;
  departmentId?: string;
  leaveRequestId?: string;
}
