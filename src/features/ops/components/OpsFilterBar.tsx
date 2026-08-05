import { Search, X } from "lucide-react";
import { ActionButton } from "@/components/dl";
import type { OpsFilters, OpsLocation } from "../types";

export function OpsFilterBar({
  filters,
  locations,
  onChange,
  onClear,
}: {
  filters: OpsFilters;
  locations: OpsLocation[];
  onChange: (change: Partial<OpsFilters>) => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="relative min-w-0 flex-1 sm:min-w-56">
        <span className="sr-only">Search operational log</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          className="input w-full pl-9"
          type="search"
          value={filters.search}
          placeholder="Search entries and areas"
          onChange={(e) => onChange({ search: e.target.value, page: 1 })}
        />
      </label>
      <select
        aria-label="Entry type"
        className="select"
        value={filters.entryType ?? ""}
        onChange={(e) =>
          onChange({ entryType: (e.target.value || null) as OpsFilters["entryType"], page: 1 })
        }
      >
        <option value="">All types</option>
        <option value="task">Tasks</option>
        <option value="incident">Incidents</option>
        <option value="maintenance">Maintenance</option>
        <option value="service_request">Service requests</option>
        <option value="note">Notes</option>
      </select>
      <select
        aria-label="Entry status"
        className="select"
        value={filters.status ?? ""}
        onChange={(e) =>
          onChange({ status: (e.target.value || null) as OpsFilters["status"], page: 1 })
        }
      >
        <option value="">All states</option>
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="resolved">Resolved</option>
        <option value="archived">Archived</option>
      </select>
      <select
        aria-label="Entry priority"
        className="select"
        value={filters.priority ?? ""}
        onChange={(e) =>
          onChange({ priority: (e.target.value || null) as OpsFilters["priority"], page: 1 })
        }
      >
        <option value="">All priorities</option>
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
      <select
        aria-label="Ops location"
        className="select"
        value={filters.locationId ?? ""}
        onChange={(e) => onChange({ locationId: e.target.value || null, page: 1 })}
      >
        <option value="">All locations</option>
        {locations.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort operational log"
        className="select"
        value={filters.sort}
        onChange={(e) => onChange({ sort: e.target.value as OpsFilters["sort"], page: 1 })}
      >
        <option value="time_desc">Time newest</option>
        <option value="time_asc">Time oldest</option>
        <option value="priority_desc">Priority</option>
        <option value="status_asc">Status</option>
      </select>
      <ActionButton variant="ghost" size="sm" icon={X} onClick={onClear}>
        Clear
      </ActionButton>
    </div>
  );
}
