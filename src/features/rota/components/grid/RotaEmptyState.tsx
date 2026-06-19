import { ActionButton } from "@/components/dl";
import { Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";

export function RotaEmptyState({
  staffCount,
  staffSearch,
  hasActiveFilters,
  onClearFilters,
}: {
  staffCount: number;
  staffSearch: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  if (staffCount === 0) {
    return (
      <div
        className="border-b border-border px-4 py-10 text-center"
        style={{ gridColumn: "1 / -1" }}
      >
        <div className="text-sm font-semibold">Your team is empty</div>
        <p className="mt-1 text-xs text-muted-foreground">
          You need to add staff members before you can build a schedule.
        </p>
        <Link
          to="/staff"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-600"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Add your first staff member
        </Link>
      </div>
    );
  }

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
