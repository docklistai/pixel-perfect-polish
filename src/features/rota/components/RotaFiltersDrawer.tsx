import { ActionButton, DrawerShell, FormRow, FormSection } from "@/components/dl";
import type { RotaFilters } from "../types";

const defaultRotaFilters: RotaFilters = {
  department: "all",
  shiftStatus: "all",
  warningType: "all",
};

export function RotaFiltersDrawer({
  open,
  onOpenChange,
  filters,
  roleOptions,
  onFiltersChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: RotaFilters;
  roleOptions: string[];
  onFiltersChange: (filters: RotaFilters) => void;
}) {
  const updateFilter = <Key extends keyof RotaFilters>(key: Key, value: RotaFilters[Key]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange(defaultRotaFilters);
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Rota filters"
      description="Filter this rota view."
      footer={
        <>
          <ActionButton variant="secondary" onClick={resetFilters}>
            Clear
          </ActionButton>
          <ActionButton onClick={() => onOpenChange(false)}>Done</ActionButton>
        </>
      }
    >
      <FormSection
        title="Filter view"
        description="Selections update the visible staff rows for this rota."
      >
        <FormRow label="Department or role" htmlFor="rota-filter-department">
          <select
            id="rota-filter-department"
            value={filters.department}
            onChange={(event) => updateFilter("department", event.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="all">All departments</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Shift status" htmlFor="rota-filter-status">
          <select
            id="rota-filter-status"
            value={filters.shiftStatus}
            onChange={(event) =>
              updateFilter("shiftStatus", event.target.value as RotaFilters["shiftStatus"])
            }
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="all">All shifts</option>
            <option value="scheduled">Scheduled</option>
            <option value="open">Open shifts</option>
            <option value="conflict">Conflicts</option>
          </select>
        </FormRow>

        <FormRow label="Warning type" htmlFor="rota-filter-warning">
          <select
            id="rota-filter-warning"
            value={filters.warningType}
            onChange={(event) =>
              updateFilter("warningType", event.target.value as RotaFilters["warningType"])
            }
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="all">All warnings</option>
            <option value="conflicts">Conflicts</option>
            <option value="working-time">Working time</option>
          </select>
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
