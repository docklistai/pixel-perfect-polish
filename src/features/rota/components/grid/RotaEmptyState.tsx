import { ActionButton } from "@/components/dl";

export function RotaEmptyState({
  staffSearch,
  hasActiveFilters,
  onClearFilters,
}: {
  staffSearch: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="border-b border-border px-4 py-10 text-center" style={{ gridColumn: "1 / -1" }}>
      <div className="text-sm font-semibold">No staff match the current search or filters</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Open shifts still appear below. Clear the search or filters to bring staff rows back.
      </p>
      {(staffSearch || hasActiveFilters) && (
        <ActionButton className="mt-3" size="sm" variant="secondary" onClick={onClearFilters}>
          Clear search and filters
        </ActionButton>
      )}
    </div>
  );
}
