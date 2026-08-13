import { CalendarDays, MapPin, Users } from "lucide-react";
import type { ReportsFilterOption, ReportsPeriodPreset } from "../types";

function FilterSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex min-w-0 items-center gap-2 text-xs">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-0 rounded-lg border border-input bg-background px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </select>
    </label>
  );
}

function optionLabel(option: ReportsFilterOption) {
  return option.status === "inactive" ? `${option.name} (inactive)` : option.name;
}

export function ReportsFilters({
  preset,
  onPresetChange,
  locationId,
  onLocationChange,
  departmentId,
  onDepartmentChange,
  locations,
  departments,
  disabled,
}: {
  preset: ReportsPeriodPreset;
  onPresetChange: (value: ReportsPeriodPreset) => void;
  locationId: string | null;
  onLocationChange: (value: string | null) => void;
  departmentId: string | null;
  onDepartmentChange: (value: string | null) => void;
  locations: ReportsFilterOption[];
  departments: ReportsFilterOption[];
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="mb-5 flex flex-wrap items-center gap-2">
      <legend className="sr-only">Report filters</legend>
      <FilterSelect
        id="reports-period"
        label="Period"
        icon={CalendarDays}
        value={preset}
        onChange={(value) => onPresetChange(value as ReportsPeriodPreset)}
      >
        <option value="four_weeks">Current + previous 3 rota weeks</option>
        <option value="current_week">Current rota week</option>
      </FilterSelect>
      <FilterSelect
        id="reports-location"
        label="Location"
        icon={MapPin}
        value={locationId ?? ""}
        onChange={(value) => onLocationChange(value || null)}
      >
        <option value="">All locations</option>
        {locations.map((option) => (
          <option key={option.id} value={option.id}>
            {optionLabel(option)}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        id="reports-department"
        label="Department"
        icon={Users}
        value={departmentId ?? ""}
        onChange={(value) => onDepartmentChange(value || null)}
      >
        <option value="">All departments</option>
        {departments.map((option) => (
          <option key={option.id} value={option.id}>
            {optionLabel(option)}
          </option>
        ))}
      </FilterSelect>
    </fieldset>
  );
}
