import * as React from "react";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import type { TimesheetRow } from "../types";

export type TimesheetTab = "all" | "pending" | "unapproved" | "exceptions" | "approved";

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
  approved: Set<string>;
  declined: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onReview: (row: TimesheetRow) => void;
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
  approved,
  declined,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onReview,
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
              const isApproved = approved.has(r.id);
              const isDeclined = declined.has(r.id);
              const stLabel = isApproved ? "Approved" : isDeclined ? "Declined" : r.st;
              const stTone = isApproved
                ? ("success" as const)
                : isDeclined
                  ? ("muted" as const)
                  : r.stTone;
              const isSelected = selectedIds.has(r.id);
              return (
                <tr key={r.id} className={cn(isSelected && "selected")} onClick={() => onReview(r)}>
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
                    <StatusBadge tone={stTone}>{stLabel}</StatusBadge>
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    {!isApproved && !isDeclined && (
                      <button
                        type="button"
                        aria-label={`Review timesheet for ${r.n}`}
                        className="text-[11px] text-brand font-semibold"
                        onClick={() => onReview(r)}
                      >
                        Review
                      </button>
                    )}
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
          <h4>Nothing to review</h4>
          <p>You&apos;re all caught up on this view.</p>
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
