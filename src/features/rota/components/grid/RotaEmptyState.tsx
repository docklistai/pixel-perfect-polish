import { ActionButton } from "@/components/dl";
import { Link, useNavigate } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import type { KeyboardEvent } from "react";

export function RotaEmptyState({
  staffCount,
  staffSearch,
  hasActiveFilters,
  onClearFilters,
  isTabStop,
  onCellFocus,
}: {
  staffCount: number;
  staffSearch: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  isTabStop: boolean;
  onCellFocus: () => void;
}) {
  const navigate = useNavigate();
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.currentTarget
        .closest("[data-rota-grid]")
        ?.querySelector<HTMLElement>('[data-gridrow="1"][data-gridcol="0"]')
        ?.focus();
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (staffCount === 0) void navigate({ to: "/staff" });
    else onClearFilters();
  };

  if (staffCount === 0) {
    return (
      <div role="row" aria-rowindex={2} className="contents">
        <div
          role="gridcell"
          aria-colindex={1}
          aria-colspan={8}
          aria-label="Your team is empty. Press Enter or Space to add your first staff member."
          aria-keyshortcuts="ArrowDown Enter Space"
          tabIndex={isTabStop ? 0 : -1}
          data-gridrow={0}
          data-gridcol={0}
          onFocus={onCellFocus}
          onKeyDown={handleKeyDown}
          className="border-b border-border px-4 py-10 text-center"
          style={{ gridColumn: "1 / -1" }}
        >
          <div className="text-sm font-semibold">Your team is empty</div>
          <p className="mt-1 text-xs text-muted-foreground">
            You need to add staff members before you can build a schedule.
          </p>
          <Link
            to="/staff"
            tabIndex={-1}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-600"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Add your first staff member
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div role="row" aria-rowindex={2} className="contents">
      <div
        role="gridcell"
        aria-colindex={1}
        aria-colspan={8}
        aria-label="No staff match the current search or filters. Press Enter or Space to clear them."
        aria-keyshortcuts="ArrowDown Enter Space"
        tabIndex={isTabStop ? 0 : -1}
        data-gridrow={0}
        data-gridcol={0}
        onFocus={onCellFocus}
        onKeyDown={handleKeyDown}
        className="border-b border-border px-4 py-10 text-center"
        style={{ gridColumn: "1 / -1" }}
      >
        <div className="text-sm font-semibold">No staff match the current search or filters</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Open shifts still appear below. Clear the search or filters to bring staff rows back.
        </p>
        {(staffSearch || hasActiveFilters) && (
          <ActionButton
            tabIndex={-1}
            className="mt-3"
            size="sm"
            variant="secondary"
            onClick={onClearFilters}
          >
            Clear search and filters
          </ActionButton>
        )}
      </div>
    </div>
  );
}
