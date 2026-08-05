import type {
  OpsEntryType,
  OpsFilters,
  OpsPrefill,
  OpsPriority,
  OpsSort,
  OpsStatus,
} from "../types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = new Set<OpsEntryType>(["task", "incident", "maintenance", "service_request", "note"]);
const STATUSES = new Set<OpsStatus>(["open", "in_progress", "resolved", "archived"]);
const PRIORITIES = new Set<OpsPriority>(["low", "normal", "high", "critical"]);
const SORTS = new Set<OpsSort>(["time_desc", "time_asc", "priority_desc", "status_asc"]);

export interface OpsRouteSearch extends Partial<OpsPrefill> {
  q?: string;
  type?: OpsEntryType;
  status?: OpsStatus;
  priority?: OpsPriority;
  location?: string;
  sort?: OpsSort;
  page?: number;
  selected?: string;
  handover?: string;
  briefing?: string;
}

function uuid(value: unknown): string | undefined {
  return typeof value === "string" && UUID_RE.test(value) ? value.toLowerCase() : undefined;
}

export function parseOpsSearch(search: Record<string, unknown>): OpsRouteSearch {
  const result: OpsRouteSearch = {};
  if (typeof search.q === "string" && search.q.trim()) result.q = search.q.trim().slice(0, 200);
  if (typeof search.type === "string" && TYPES.has(search.type as OpsEntryType))
    result.type = search.type as OpsEntryType;
  if (typeof search.status === "string" && STATUSES.has(search.status as OpsStatus))
    result.status = search.status as OpsStatus;
  if (typeof search.priority === "string" && PRIORITIES.has(search.priority as OpsPriority))
    result.priority = search.priority as OpsPriority;
  if (typeof search.sort === "string" && SORTS.has(search.sort as OpsSort))
    result.sort = search.sort as OpsSort;
  const page = typeof search.page === "string" ? Number(search.page) : search.page;
  if (typeof page === "number" && Number.isInteger(page) && page > 1) result.page = page;
  for (const [source, target] of [
    ["location", "location"],
    ["selected", "selected"],
    ["handover", "handover"],
    ["briefing", "briefing"],
    ["locationId", "locationId"],
    ["rotaWeekId", "rotaWeekId"],
    ["shiftId", "shiftId"],
    ["staffMemberId", "staffMemberId"],
    ["departmentId", "departmentId"],
    ["leaveRequestId", "leaveRequestId"],
  ] as const) {
    const value = uuid(search[source]);
    if (value) result[target] = value;
  }
  if (search.create === true || search.create === "true" || search.create === "1")
    result.create = true;
  return result;
}

export function filtersFromSearch(search: OpsRouteSearch): OpsFilters {
  return {
    search: search.q ?? "",
    entryType: search.type ?? null,
    status: search.status ?? null,
    priority: search.priority ?? null,
    locationId: search.location ?? null,
    sort: search.sort ?? "time_desc",
    page: search.page ?? 1,
    pageSize: 20,
  };
}

export function prefillFromSearch(search: OpsRouteSearch): OpsPrefill {
  return {
    create: search.create,
    locationId: search.locationId ?? search.location,
    rotaWeekId: search.rotaWeekId,
    shiftId: search.shiftId,
    staffMemberId: search.staffMemberId,
    departmentId: search.departmentId,
    leaveRequestId: search.leaveRequestId,
  };
}

export function searchFromFilters(filters: OpsFilters): OpsRouteSearch {
  return {
    q: filters.search || undefined,
    type: filters.entryType ?? undefined,
    status: filters.status ?? undefined,
    priority: filters.priority ?? undefined,
    location: filters.locationId ?? undefined,
    sort: filters.sort === "time_desc" ? undefined : filters.sort,
    page: filters.page > 1 ? filters.page : undefined,
  };
}
