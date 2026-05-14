import * as React from "react";
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  MoreHorizontal,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, EmptyState } from "@/components/dl";
import type { StaffRow } from "../types";

interface StaffTableProps {
  rows: StaffRow[];
  selected: StaffRow;
  query: string;
  onQueryChange: (q: string) => void;
  onSelectMember: (row: StaffRow) => void;
}

export function StaffTable({
  rows,
  selected,
  query,
  onQueryChange,
  onSelectMember,
}: StaffTableProps) {
  const filteredRows = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.n.toLowerCase().includes(q) ||
      r.e.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
      r.dept.toLowerCase().includes(q)
    );
  });

  return (
    <Card className="rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-3 pb-3">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 flex-1 max-w-xs">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search staff"
            className="bg-transparent text-xs outline-none w-full"
            placeholder="Search by name, email or role..."
          />
        </div>
        <button
          type="button"
          className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-2"
        >
          All departments <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-2"
        >
          All roles <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-2"
        >
          Employment status <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-2"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> More filters
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead>
            <tr className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground border-y border-border">
              <th className="text-left py-2.5 px-2">STAFF MEMBER</th>
              <th className="text-left py-2.5">ROLE</th>
              <th className="text-left py-2.5">DEPARTMENT</th>
              <th className="text-left py-2.5">STATUS</th>
              <th className="text-left py-2.5">CONTRACT</th>
              <th className="text-left py-2.5">AVAILABILITY</th>
              <th className="text-left py-2.5">PORTAL</th>
              <th className="text-left py-2.5">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onSelectMember(r)}
                className={`border-b border-border/60 last:border-0 cursor-pointer hover:bg-muted/40 ${selected.id === r.id ? "bg-info-soft/30" : ""}`}
              >
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={`https://i.pravatar.cc/64?img=${r.img}`}
                      className="h-8 w-8 rounded-full object-cover"
                      alt=""
                    />
                    <div>
                      <div className="font-medium">{r.n}</div>
                      <div className="text-[11px] text-muted-foreground">{r.e}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <div>{r.role}</div>
                  {r.sub && <div className="text-[11px] text-muted-foreground">{r.sub}</div>}
                </td>
                <td className="py-3 text-muted-foreground">{r.dept}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 ${r.statusTone === "info" ? "text-info" : r.statusTone === "purple" ? "text-accent-purple" : "text-success"}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" /> {r.status}
                  </span>
                </td>
                <td className="py-3 text-muted-foreground">{r.contract}</td>
                <td className="py-3">
                  <span className="font-medium">{r.avail}</span>{" "}
                  <span
                    className={`ml-1 text-[11px] ${r.availTone === "high" ? "text-success" : r.availTone === "med" ? "text-warning" : "text-muted-foreground"}`}
                  >
                    {r.availTone === "high" ? "High" : r.availTone === "med" ? "Medium" : ""}
                  </span>
                </td>
                <td className="py-3">
                  {r.availTone === "off" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <CheckCircle className="h-5 w-5 text-brand" />
                  )}
                </td>
                <td className="py-3">
                  <button
                    type="button"
                    aria-label={`More actions for ${r.n}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded p-1 hover:bg-muted/60 transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && (
        <EmptyState title="No staff found" description="Try adjusting your search or filters." />
      )}

      <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
        <span>
          {query.trim()
            ? `Showing ${filteredRows.length} of ${rows.length} staff`
            : `Showing ${rows.length} staff`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {["1", "2", "3", "…", "5"].map((p) => (
            <button
              key={p}
              type="button"
              className={`h-7 w-7 rounded-md text-xs ${p === "1" ? "bg-primary text-primary-foreground" : "border border-border"}`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 flex items-center gap-1"
        >
          10 per page <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </Card>
  );
}
