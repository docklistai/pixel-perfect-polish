import * as React from "react";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { cn } from "@/lib/utils";
import type { TimesheetRow } from "../types";

export type TimesheetTab = "all" | "pending" | "unapproved" | "exceptions" | "approved";
export type TimesheetStatus = "approved" | "pending" | "unapproved";

const cellTone: Record<string, string> = {
  warning: "text-warning",
  danger: "text-danger",
};

interface TabCounts {
  all: number;
  pending: number;
  unapproved: number;
  exceptions: number;
  approved: number;
}

interface Props {
  rows: TimesheetRow[];
  totalRows: number;
  statusOf: (row: TimesheetRow) => TimesheetStatus;
  flaggedIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onReview: (row: TimesheetRow) => void;
  onAdjust: (row: TimesheetRow) => void;
  onToggleApprove: (row: TimesheetRow) => void;
  onToggleFlag: (row: TimesheetRow) => void;
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

const statusBadge: Record<
  TimesheetStatus,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  approved: { label: "Approved", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  unapproved: { label: "Unapproved", tone: "danger" },
};

export function TimesheetTable({
  rows,
  totalRows,
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
        <div className="dl-tabs flex-1 min-w-0" style={{ borderBottom: "none" }}>
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

      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Weekly timesheet, scroll horizontally to see all columns"
      >
        <table className="tbl min-w-[1100px] w-full">
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
              const flagged = flaggedIds.has(r.id);
              const badge = statusBadge[status];
              const isSelected = selectedIds.has(r.id);
              return (
                <tr
                  key={r.id}
                  tabIndex={0}
                  aria-label={`${r.n}, ${badge.label}. Press Enter to open the entry`}
                  className={cn(
                    isSelected && "selected",
                    r.exc === "Missing in" || status === "unapproved"
                      ? "row-error"
                      : r.exc !== "—"
                        ? "row-warn"
                        : "",
                    flagged && "row-flagged",
                  )}
                  onClick={() => onReview(r)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onReview(r);
                    }
                  }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(r.id)}
                      aria-label={`Select timesheet for ${r.n}`}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://i.pravatar.cc/64?img=${r.img}`}
                        className="h-7 w-7 rounded-full object-cover"
                        alt=""
                      />
                      <div>
                        <div className="text-sm font-medium">{r.n}</div>
                        <div className="text-[11px] text-muted-foreground">{r.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-sm">{r.sched}</td>
                  <td>
                    <div className="font-mono text-sm font-semibold">{r.in}</div>
                    <div
                      className={cn(
                        "text-[11px]",
                        r.inTone ? cellTone[r.inTone] : "text-muted-foreground",
                      )}
                    >
                      {r.inN}
                    </div>
                  </td>
                  <td>
                    <div className="font-mono text-sm font-semibold">{r.out}</div>
                    <div
                      className={cn(
                        "text-[11px]",
                        r.outTone ? cellTone[r.outTone] : "text-muted-foreground",
                      )}
                    >
                      {r.outN}
                    </div>
                  </td>
                  <td className="font-mono text-sm">{r.brk}</td>
                  <td className="font-mono text-sm font-semibold">{r.paid}</td>
                  <td>
                    {r.exc === "—" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <StatusBadge tone={r.excTone === "danger" ? "danger" : "warning"}>
                        {r.exc}
                      </StatusBadge>
                    )}
                  </td>
                  <td>
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <StatusBadge tone={badge.tone} dot={status === "pending"}>
                        {badge.label}
                      </StatusBadge>
                      {flagged && <StatusBadge tone="info">Flagged</StatusBadge>}
                    </span>
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActionMenu
                      triggerLabel={`Actions for ${r.n}`}
                      items={[
                        { label: "Open entry", icon: ExternalLink, onSelect: () => onReview(r) },
                        { label: "Adjust", icon: Edit3, onSelect: () => onAdjust(r) },
                        {
                          label: status === "approved" ? "Revert approval" : "Approve",
                          icon: status === "approved" ? X : CheckCircle2,
                          onSelect: () => onToggleApprove(r),
                        },
                        {
                          label: flagged ? "Remove flag" : "Flag for review",
                          icon: AlertTriangle,
                          onSelect: () => onToggleFlag(r),
                        },
                        { kind: "separator" },
                        {
                          label: "Prepare reminder",
                          icon: Bell,
                          onSelect: () => onPrepareReminder(r.n),
                        },
                        { label: "View rota", icon: Calendar, onSelect: onViewRota },
                      ]}
                    />
                  </td>
                </tr>
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
        </div>
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
