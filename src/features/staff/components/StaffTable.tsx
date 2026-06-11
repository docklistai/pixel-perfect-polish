import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, EmptyState } from "@/components/dl";
import { StaffFilterBar } from "./StaffFilterBar";
import { StaffBulkBar } from "./StaffBulkBar";
import { StaffTableRow } from "./StaffTableRow";
import { mockStaffProfiles } from "../data/mockStaffProfiles";
import type { StaffRow } from "../types";

export type StaffAttentionFilter = "all" | "missing-documents" | "outside-availability";

interface StaffTableProps {
  rows: StaffRow[];
  selected: StaffRow;
  query: string;
  onQueryChange: (q: string) => void;
  deptFilter: string;
  onDeptChange: (d: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  attentionFilter: StaffAttentionFilter;
  onSelectMember: (row: StaffRow) => void;
  /** Hides the availability column while the profile panel narrows the table. */
  compact?: boolean;
}

const PAGE_SIZE = 10;

export function StaffTable({
  rows,
  selected,
  query,
  onQueryChange,
  deptFilter,
  onDeptChange,
  statusFilter,
  onStatusChange,
  attentionFilter,
  onSelectMember,
  compact = false,
}: StaffTableProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const [actionToast, setActionToast] = React.useState<string | null>(null);

  const filteredRows = React.useMemo(
    () =>
      rows.filter((r) => {
        if (deptFilter !== "All" && r.dept !== deptFilter) return false;
        if (statusFilter !== "All" && r.status !== statusFilter) return false;
        const profile = mockStaffProfiles[r.id];
        if (attentionFilter === "missing-documents" && !profile?.documentsSummary.missing) {
          return false;
        }
        if (attentionFilter === "outside-availability" && !profile?.availability.conflicts) {
          return false;
        }
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          r.n.toLowerCase().includes(q) ||
          r.e.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          r.dept.toLowerCase().includes(q)
        );
      }),
    [rows, query, deptFilter, statusFilter, attentionFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [query, deptFilter, statusFilter, attentionFilter]);

  function toast(msg: string) {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 2200);
  }

  function toggleAll() {
    if (selectedIds.size === filteredRows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRows.map((r) => r.id)));
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  return (
    <Card className="rounded-2xl overflow-hidden p-0">
      {actionToast && (
        <div className="mx-4 mt-4 rounded-xl bg-info-soft text-info text-xs font-medium px-3 py-2">
          {actionToast}
        </div>
      )}

      <div className="p-4">
        <StaffFilterBar
          query={query}
          onQueryChange={onQueryChange}
          deptFilter={deptFilter}
          onDeptChange={onDeptChange}
          statusFilter={statusFilter}
          onStatusChange={onStatusChange}
          filteredCount={filteredRows.length}
          totalCount={rows.length}
        />
      </div>

      {selectedIds.size > 0 && (
        <StaffBulkBar
          count={selectedIds.size}
          onMessage={() => toast(`${selectedIds.size} staff messaged (demo)`)}
          onTag={() => toast("Tag applied to selection (demo)")}
          onExport={() => toast("selection.csv prepared (demo)")}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Staff list">
        <table className={`${compact ? "min-w-[700px]" : "min-w-[860px]"} w-full text-sm`}>
          <thead>
            <tr className="border-y border-border text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              <th className="py-2.5 px-3 w-9">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="text-left py-2.5 px-2">Staff member</th>
              <th className="text-left py-2.5">Role</th>
              <th className="text-left py-2.5">Department</th>
              <th className="text-left py-2.5">Status</th>
              <th className="text-left py-2.5">Contract</th>
              {!compact && <th className="text-left py-2.5">Availability</th>}
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <StaffTableRow
                key={r.id}
                row={r}
                isSelected={selected.id === r.id}
                isChecked={selectedIds.has(r.id)}
                onSelect={() => onSelectMember(r)}
                onCheck={() => toggleRow(r.id)}
                compact={compact}
              />
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && (
        <div className="px-4 pb-4">
          <EmptyState title="No staff found" description="Try adjusting your search or filters." />
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3 border-t border-border/60">
        <span className="text-xs text-muted-foreground">
          Showing {filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
          {Math.min(safePage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`h-7 min-w-[28px] rounded-lg px-1.5 text-xs font-medium transition-colors ${safePage === p ? "bg-brand text-white" : "text-muted-foreground hover:bg-muted/60"}`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <select
          aria-label="Rows per page"
          className="h-7 rounded-lg border border-border bg-background px-2 text-xs"
          defaultValue="10"
        >
          <option value="10">10 / pg</option>
          <option value="20">20 / pg</option>
        </select>
      </div>
    </Card>
  );
}
