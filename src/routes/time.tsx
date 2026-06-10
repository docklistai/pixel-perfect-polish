import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, IconButton, FilterButton } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import {
  Download,
  MoreHorizontal,
  Calendar,
  Users,
  Sparkles,
  Check,
  AlertTriangle,
} from "lucide-react";
import { rows as allRows } from "@/features/time/data/timeDemoData";
import { TimeMetricCards } from "@/features/time/components/TimeMetricCards";
import { TimesheetTable, type TimesheetTab } from "@/features/time/components/TimesheetTable";
import { TimeRightRail } from "@/features/time/components/TimeRightRail";
import { TimesheetReviewDrawer } from "@/features/time/components/TimesheetReviewDrawer";
import { TimeExportDialog } from "@/features/time/components/TimeExportDialog";
import type { TimesheetRow } from "@/features/time/types";

export const Route = createFileRoute("/time")({
  head: () => ({ meta: [{ title: "Time & Attendance — Docklist" }] }),
  component: TimePage,
});

function TimePage() {
  const { openAiDrawer } = useOverlays();
  const [reviewRow, setReviewRow] = React.useState<TimesheetRow | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [approved, setApproved] = React.useState<Set<string>>(new Set());
  const [declined, setDeclined] = React.useState<Set<string>>(new Set());
  const [tab, setTab] = React.useState<TimesheetTab>("all");
  const [query, setQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const handleApprove = (id: string) => setApproved((prev) => new Set([...prev, id]));
  const handleDecline = (id: string) => setDeclined((prev) => new Set([...prev, id]));

  const effectiveStatus = React.useCallback(
    (r: TimesheetRow): "approved" | "pending" | "unapproved" => {
      if (approved.has(r.id)) return "approved";
      if (declined.has(r.id)) return "unapproved";
      if (r.st === "Approved") return "approved";
      if (r.st === "Unapproved") return "unapproved";
      return "pending";
    },
    [approved, declined],
  );

  const filtered = React.useMemo(() => {
    return allRows.filter((r) => {
      if (query && !r.n.toLowerCase().includes(query.toLowerCase())) return false;
      const status = effectiveStatus(r);
      switch (tab) {
        case "pending":
          return status === "pending";
        case "unapproved":
          return status === "unapproved";
        case "approved":
          return status === "approved";
        case "exceptions":
          return r.exc !== "—";
        default:
          return true;
      }
    });
  }, [query, tab, effectiveStatus]);

  const counts = React.useMemo(() => {
    const c = { all: allRows.length, pending: 0, unapproved: 0, exceptions: 0, approved: 0 };
    for (const r of allRows) {
      const status = effectiveStatus(r);
      if (status === "approved") c.approved += 1;
      else if (status === "unapproved") c.unapproved += 1;
      else if (status === "pending") c.pending += 1;
      if (r.exc !== "—") c.exceptions += 1;
    }
    return c;
  }, [effectiveStatus]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => {
    const visibleIds = filtered.map((r) => r.id);
    setSelectedIds((prev) => {
      const allOn = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (allOn) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      return new Set([...prev, ...visibleIds]);
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const approveSelection = () => {
    setApproved((prev) => new Set([...prev, ...selectedIds]));
    clearSelection();
  };

  const approveSuggested = () => {
    const ids = allRows
      .filter((r) => r.exc === "—" && effectiveStatus(r) !== "approved")
      .slice(0, 3)
      .map((r) => r.id);
    setApproved((prev) => new Set([...prev, ...ids]));
  };

  const resetFilters = () => {
    setTab("all");
    setQuery("");
  };

  return (
    <AppShell>
      <PageHeader
        title="Time & attendance"
        subtitle="Review clocked hours, approve, and export approved hours."
        actions={
          <>
            <FilterButton icon={Calendar} label="18 – 24 May" />
            <FilterButton icon={Users} label="All teams" />
            <ActionButton variant="outline" icon={Sparkles} onClick={openAiDrawer}>
              Ask assistant
            </ActionButton>
            <ActionButton icon={Download} onClick={() => setExportOpen(true)}>
              Preview hours export
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-9 space-y-5">
          <TimeMetricCards />

          {selectedIds.size > 0 && (
            <div
              className="card flex flex-wrap items-center gap-3 px-4 py-2.5"
              style={{
                background: "var(--st-teal-bg)",
                borderColor: "var(--st-teal-line)",
              }}
            >
              <span className="text-sm font-semibold text-brand">{selectedIds.size} selected</span>
              <div className="flex-1" />
              <button type="button" className="btn ghost sm" onClick={approveSelection}>
                <Check className="h-3.5 w-3.5" aria-hidden /> Approve
              </button>
              <button type="button" className="btn ghost sm">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Flag
              </button>
              <button type="button" className="btn ghost sm" onClick={clearSelection}>
                Clear
              </button>
            </div>
          )}

          <TimesheetTable
            rows={filtered}
            totalRows={allRows.length}
            approved={approved}
            declined={declined}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onReview={setReviewRow}
            tab={tab}
            onTabChange={setTab}
            query={query}
            onQueryChange={setQuery}
            counts={counts}
            onResetFilters={resetFilters}
          />
        </div>

        <TimeRightRail onApproveSuggested={approveSuggested} onOpenAssistant={openAiDrawer} />
      </div>

      <TimesheetReviewDrawer
        row={reviewRow}
        approved={approved}
        declined={declined}
        onApprove={handleApprove}
        onDecline={handleDecline}
        onClose={() => setReviewRow(null)}
      />
      <TimeExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </AppShell>
  );
}
