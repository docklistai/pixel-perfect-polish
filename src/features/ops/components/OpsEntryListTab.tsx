import { EmptyState, StatusBadge } from "@/components/dl";
import type { OpsEntry } from "../types";
import { PRIORITY_TONE, STATUS_LABEL, STATUS_TONE } from "../lib/opsPresentation";

/**
 * Entry tabs paginate the filtered operational entries. Pagination lives here and never
 * on Today's timeline, which is a separate location-day activity feed.
 */
export function EntryListTab(props: {
  entries: OpsEntry[];
  emptyTitle: string;
  onOpenEntry: (id: string) => void;
  onClearFilter?: () => void;
  onPageChange: (page: number) => void;
  page: number;
  total: number;
  pageSize: number;
}) {
  if (props.entries.length === 0)
    return (
      <EmptyState
        title={props.emptyTitle}
        description="Change filters or log a new operational item."
        action={
          props.onClearFilter ? (
            <button className="btn secondary sm" type="button" onClick={props.onClearFilter}>
              Clear filters
            </button>
          ) : undefined
        }
      />
    );
  const pageCount = Math.max(1, Math.ceil(props.total / props.pageSize));
  return (
    <div>
      {props.entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => props.onOpenEntry(entry.id)}
          className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left hover:bg-muted/40"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{entry.title}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {entry.locationName}
              {entry.area ? ` · ${entry.area}` : ""}
            </span>
          </span>
          <StatusBadge tone={PRIORITY_TONE[entry.priority]}>{entry.priority}</StatusBadge>
          <StatusBadge tone={STATUS_TONE[entry.status]}>{STATUS_LABEL[entry.status]}</StatusBadge>
        </button>
      ))}
      <div className="flex items-center justify-between px-4 py-3 text-xs">
        <span className="text-muted-foreground">
          Page {props.page} of {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn ghost sm"
            disabled={props.page <= 1}
            onClick={() => props.onPageChange(props.page - 1)}
          >
            Newer entries
          </button>
          <button
            type="button"
            className="btn secondary sm"
            disabled={props.page >= pageCount}
            onClick={() => props.onPageChange(props.page + 1)}
          >
            View earlier entries
          </button>
        </div>
      </div>
    </div>
  );
}
