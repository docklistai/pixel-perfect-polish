import * as React from "react";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import type { StoredTimesheetRow, TimesheetStatus } from "../types";
import type { TimeViewState } from "../lib/timeView";
import { TimesheetRow } from "./TimesheetRow";

export type TimesheetTab = "all" | "pending" | "unapproved" | "exceptions" | "approved";
export type { TimesheetStatus } from "../types";

interface TabCounts {
  all: number;
  pending: number;
  unapproved: number;
  exceptions: number;
  approved: number;
}

interface Props {
  rows: StoredTimesheetRow[];
  totalRows: number;
  viewState: TimeViewState;
  periodLabel: string;
  statusOf: (row: StoredTimesheetRow) => TimesheetStatus;
  flaggedIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onReview: (row: StoredTimesheetRow) => void;
  onAdjust: (row: StoredTimesheetRow) => void;
  onToggleApprove: (row: StoredTimesheetRow) => void;
  onToggleFlag: (row: StoredTimesheetRow) => void;
  onPrepareReminder: (name: string) => void;
  onViewRota: () => void;
  tab: TimesheetTab;
  onTabChange: (tab: TimesheetTab) => void;
  query: string;
  onQueryChange: (q: string) => void;
  counts: TabCounts;
  onResetFilters: () => void;
}

const tabs: Array<{
  key: TimesheetTab;
  label: string;
  countKey: keyof TabCounts;
  tone?: "warning" | "danger" | "success";
}> = [
  { key: "all", label: "All", countKey: "all" },
  { key: "pending", label: "Pending", countKey: "pending", tone: "warning" },
  { key: "unapproved", label: "Unapproved", countKey: "unapproved", tone: "danger" },
  { key: "exceptions", label: "Exceptions", countKey: "exceptions", tone: "danger" },
  { key: "approved", label: "Approved", countKey: "approved", tone: "success" },
];

export function TimesheetTable({
  rows,
  totalRows,
  viewState,
  periodLabel,
  statusOf,
  flaggedIds,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onReview,
  onAdjust,
  onToggleApprove,
  onToggleFlag,
  onPrepareReminder,
  onViewRota,
  tab,
  onTabChange,
  query,
  onQueryChange,
  counts,
  onResetFilters,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  return (
    <div className="card overflow-hidden">
      <div className="card-section flex flex-wrap items-center gap-3">
        <div className="dl-tabs flex-1 min-w-0 flex-wrap" style={{ borderBottom: "none" }}>
          {tabs.map((t) => {
            const count = counts[t.countKey];
            return (
              <button
                key={t.key}
                type="button"
                className={cn("dl-tab", tab === t.key && "active")}
                onClick={() => onTabChange(t.key)}
              >
                {t.label}
                {count > 0 && (
                  <StatusBadge tone={t.tone ?? "muted"} className="ml-1">
                    {count}
                  </StatusBadge>
                )}
              </button>
            );
          })}
        </div>
        <div className="input-group" style={{ width: 220 }}>
          <Search className="ico h-3.5 w-3.5" aria-hidden />
          <input
            type="search"
            placeholder="Search staff…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search timesheets"
          />
        </div>
      </div>

      {viewState === "live-loading" ? (
        <div className="empty">
          <div className="ill" aria-hidden>
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <h4>Loading timesheets…</h4>
          <p>Fetching live clocked hours for {periodLabel}.</p>
        </div>
      ) : viewState === "live-error" ? (
        <div className="empty">
          <div className="ill" aria-hidden>
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <h4>Couldn&apos;t load live timesheets</h4>
          <p>We didn&apos;t show demo data instead. Refresh to try the live read again.</p>
        </div>
      ) : (
        <>
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Weekly timesheet, scroll horizontally to see all columns"
          >
            <table className="tbl min-w-[900px] w-full">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={onToggleAll}
                      aria-label="Select all visible timesheets"
                    />
                  </th>
                  <th>Staff</th>
                  <th>Scheduled</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Break</th>
                  <th>Paid</th>
                  <th>Exceptions</th>
                  <th>Status</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const status = statusOf(r);
                  return (
                    <TimesheetRow
                      key={r.id}
                      row={r}
                      status={status}
                      flagged={flaggedIds.has(r.id)}
                      selected={selectedIds.has(r.id)}
                      onToggleSelect={onToggleSelect}
                      onReview={onReview}
                      onAdjust={onAdjust}
                      onToggleApprove={onToggleApprove}
                      onToggleFlag={onToggleFlag}
                      onPrepareReminder={onPrepareReminder}
                      onViewRota={onViewRota}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="empty">
              <div className="ill" aria-hidden>
                <Search className="h-5 w-5" />
              </div>
              {viewState === "live-ready" && totalRows === 0 ? (
                <>
                  <h4>No time entries this period</h4>
                  <p>Nothing was clocked for {periodLabel}. Try another review period.</p>
                </>
              ) : (
                <>
                  <h4>
                    {tab === "pending"
                      ? "No pending approvals"
                      : tab === "unapproved"
                        ? "No unapproved entries"
                        : tab === "exceptions"
                          ? "No exceptions"
                          : tab === "approved"
                            ? "No approved entries yet"
                            : "Nothing to review"}
                  </h4>
                  <p>
                    {tab === "pending"
                      ? "All entries have been reviewed."
                      : tab === "exceptions"
                        ? "Staff clocked in and out as scheduled this period."
                        : "You're all caught up on this view."}
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}

      <div className="card-foot flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {rows.length} of {totalRows} entries
        </span>
        <div className="flex-1" />
        <button type="button" className="btn ghost sm" onClick={onResetFilters}>
          Reset filters
        </button>
      </div>
    </div>
  );
}
