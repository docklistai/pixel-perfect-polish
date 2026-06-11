import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, PageHeader, ActionButton, ConfirmDialog } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { useOverlays } from "@/components/AppShortcuts";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Info,
  AlertTriangle,
  Calendar,
  Users,
  Settings2,
  Sparkles,
} from "lucide-react";
import { rows as allRows } from "@/features/time/data/timeDemoData";
import { TimeMetricCards } from "@/features/time/components/TimeMetricCards";
import {
  TimesheetTable,
  type TimesheetTab,
  type TimesheetStatus,
} from "@/features/time/components/TimesheetTable";
import { TimeRightRail } from "@/features/time/components/TimeRightRail";
import { TimesheetReviewDrawer } from "@/features/time/components/TimesheetReviewDrawer";
import { TimeExportDialog } from "@/features/time/components/TimeExportDialog";
import { TimeAdjustDialog } from "@/features/time/components/TimeAdjustDialog";
import { TimeQueryDrawer } from "@/features/time/components/TimeQueryDrawer";
import type { TimesheetRow, TimeQuery } from "@/features/time/types";

export const Route = createFileRoute("/time")({
  head: () => ({ meta: [{ title: "Time & Attendance — Docklist" }] }),
  component: TimePage,
});

const PERIOD_OPTIONS = [
  "This week (8 – 14 Jun)",
  "Last week (1 – 7 Jun)",
  "Pay period (Jun)",
  "Custom range…",
];

const TEAM_OPTIONS = [
  "All teams",
  "Front of House",
  "Kitchen",
  "Bar",
  "Housekeeping",
  "Maintenance",
];

type RowOverride = { status?: TimesheetStatus; flagged?: boolean };

function TimePage() {
  const { openAiDrawer } = useOverlays();
  const navigate = useNavigate();
  const [reviewRow, setReviewRow] = React.useState<TimesheetRow | null>(null);
  const [adjustRow, setAdjustRow] = React.useState<TimesheetRow | null>(null);
  const [queryRow, setQueryRow] = React.useState<TimeQuery | null>(null);
  const [reminderFor, setReminderFor] = React.useState<string | null>(null);
  const [approveSuggestedOpen, setApproveSuggestedOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [overrides, setOverrides] = React.useState<Record<string, RowOverride>>({});
  const [tab, setTab] = React.useState<TimesheetTab>("all");
  const [query, setQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [period, setPeriod] = React.useState(PERIOD_OPTIONS[0]!);
  const [team, setTeam] = React.useState(TEAM_OPTIONS[0]!);

  const patchRows = React.useCallback((ids: string[], patch: RowOverride) => {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = { ...next[id], ...patch };
      return next;
    });
  }, []);

  const statusOf = React.useCallback(
    (r: TimesheetRow): TimesheetStatus => {
      const o = overrides[r.id]?.status;
      if (o) return o;
      if (r.st === "Approved") return "approved";
      if (r.st === "Unapproved") return "unapproved";
      return "pending";
    },
    [overrides],
  );
  const flaggedIds = React.useMemo(
    () => new Set(Object.keys(overrides).filter((id) => overrides[id]?.flagged)),
    [overrides],
  );

  const filtered = React.useMemo(() => {
    return allRows.filter((r) => {
      if (query && !r.n.toLowerCase().includes(query.toLowerCase())) return false;
      const status = statusOf(r);
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
  }, [query, tab, statusOf]);

  const counts = React.useMemo(() => {
    const c = { all: allRows.length, pending: 0, unapproved: 0, exceptions: 0, approved: 0 };
    for (const r of allRows) {
      const status = statusOf(r);
      if (status === "approved") c.approved += 1;
      else if (status === "unapproved") c.unapproved += 1;
      else c.pending += 1;
      if (r.exc !== "—") c.exceptions += 1;
    }
    return c;
  }, [statusOf]);

  /* ── row actions with undo toasts (prototype parity) ── */

  const handleToggleApprove = (r: TimesheetRow) => {
    const prev = statusOf(r);
    if (prev === "approved") {
      patchRows([r.id], { status: "pending" });
      toast.info("Reverted", {
        description: `${r.n}'s approval reverted to pending.`,
        action: {
          label: "Undo",
          onClick: () => {
            patchRows([r.id], { status: "approved" });
            toast.success("Restored", { description: "Approval reinstated." });
          },
        },
      });
    } else {
      patchRows([r.id], { status: "approved" });
      toast.success("Approved", {
        description: `${r.n}'s entry is ready to export as approved hours.`,
        action: {
          label: "Undo",
          onClick: () => {
            patchRows([r.id], { status: prev });
            toast.info("Undone", { description: "Approval reverted." });
          },
        },
      });
    }
  };

  const handleApprove = (r: TimesheetRow) => {
    if (statusOf(r) !== "approved") handleToggleApprove(r);
  };
  const handleRevert = (r: TimesheetRow) => {
    if (statusOf(r) === "approved") handleToggleApprove(r);
  };

  const handleToggleFlag = (r: TimesheetRow) => {
    const wasFlagged = flaggedIds.has(r.id);
    patchRows([r.id], { flagged: !wasFlagged });
    toast[wasFlagged ? "info" : "warning"](wasFlagged ? "Flag removed" : "Flagged", {
      description: `${r.n}'s entry ${wasFlagged ? "unflagged" : "flagged for review"}.`,
      action: {
        label: "Undo",
        onClick: () => {
          patchRows([r.id], { flagged: wasFlagged });
          toast.info("Undone", { description: "Flag state restored." });
        },
      },
    });
  };

  const bulkApprove = (ids: string[], label: string) => {
    if (ids.length === 0) return;
    const prev = ids.map((id) => ({
      id,
      status: statusOf(allRows.find((r) => r.id === id)!),
    }));
    patchRows(ids, { status: "approved" });
    toast.success(label, {
      description: `${ids.length} timesheet${ids.length === 1 ? "" : "s"} approved.`,
      action: {
        label: "Undo",
        onClick: () => {
          for (const p of prev) patchRows([p.id], { status: p.status });
          toast.info("Undone", { description: "Approvals reverted." });
        },
      },
    });
  };

  const approveSelection = () => {
    bulkApprove([...selectedIds], "Timesheets approved");
    setSelectedIds(new Set());
  };

  const flagSelection = () => {
    const ids = [...selectedIds];
    patchRows(ids, { flagged: true });
    toast.warning("Flagged for review", {
      description: `${ids.length} timesheet${ids.length === 1 ? "" : "s"} flagged.`,
      action: {
        label: "Undo",
        onClick: () => {
          patchRows(ids, { flagged: false });
          toast.info("Undone", { description: "Flags removed." });
        },
      },
    });
    setSelectedIds(new Set());
  };

  const approveAllPending = () => {
    bulkApprove(
      allRows.filter((r) => statusOf(r) === "pending").map((r) => r.id),
      "Bulk approved",
    );
  };

  const suggestedRows = React.useMemo(
    () => allRows.filter((r) => r.exc === "—" && statusOf(r) !== "approved").slice(0, 3),
    [statusOf],
  );

  /* ── selection plumbing ── */

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
            <RowActionMenu
              triggerLabel="Choose period"
              trigger={
                <button type="button" className="btn secondary sm">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  {period.includes("(") ? period.slice(period.indexOf("(") + 1, -1) : period}
                  <ChevronDown className="h-3 w-3" aria-hidden />
                </button>
              }
              items={[
                { kind: "label", text: "Period" },
                ...PERIOD_OPTIONS.map((p) => ({
                  label: p,
                  icon: p === period ? Check : undefined,
                  onSelect: () => {
                    setPeriod(p);
                    toast.info("Period changed", { description: `Showing ${p.toLowerCase()}.` });
                  },
                })),
              ]}
            />
            <RowActionMenu
              triggerLabel="Filter by team"
              trigger={
                <button type="button" className="btn secondary sm">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {team}
                  <ChevronDown className="h-3 w-3" aria-hidden />
                </button>
              }
              items={[
                { kind: "label", text: "Department" },
                ...TEAM_OPTIONS.map((t) => ({
                  label: t,
                  icon: t === team ? Check : undefined,
                  onSelect: () => {
                    setTeam(t);
                    toast.info("Team filter", { description: `Showing ${t.toLowerCase()}.` });
                  },
                })),
              ]}
            />
            <ActionButton variant="outline" icon={Sparkles} onClick={openAiDrawer}>
              Ask assistant
            </ActionButton>
            <ActionButton icon={Download} onClick={() => setExportOpen(true)}>
              Export approved hours
            </ActionButton>
            <RowActionMenu
              triggerLabel="More actions"
              items={[
                {
                  label: "Approve all pending",
                  icon: CheckCircle2,
                  onSelect: approveAllPending,
                },
                {
                  label: "Prepare reminders for missing clock-ins",
                  icon: Bell,
                  onSelect: () =>
                    toast.info("Reminder prepared", {
                      description: "Review before sending from the staff update flow.",
                    }),
                },
                { kind: "separator" },
                {
                  label: "Column settings",
                  icon: Settings2,
                  onSelect: () =>
                    toast.info("Column settings", {
                      description: "Column customisation arrives in a later update.",
                    }),
                },
              ]}
            />
          </>
        }
      />

      <div className="guidance-note mb-4">
        <Info className="h-3 w-3 shrink-0" aria-hidden />
        Review flagged rows first — exceptions and unapproved entries are highlighted in the table.
      </div>

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
              <button type="button" className="btn primary sm" onClick={approveSelection}>
                <Check className="h-3.5 w-3.5" aria-hidden /> Approve {selectedIds.size}
              </button>
              <button type="button" className="btn secondary sm" onClick={flagSelection}>
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
            statusOf={statusOf}
            flaggedIds={flaggedIds}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onReview={setReviewRow}
            onAdjust={setAdjustRow}
            onToggleApprove={handleToggleApprove}
            onToggleFlag={handleToggleFlag}
            onPrepareReminder={setReminderFor}
            onViewRota={() => navigate({ to: "/rota" })}
            tab={tab}
            onTabChange={setTab}
            query={query}
            onQueryChange={setQuery}
            counts={counts}
            onResetFilters={resetFilters}
          />
        </div>

        <TimeRightRail
          onApproveSuggested={() => setApproveSuggestedOpen(true)}
          onOpenAssistant={openAiDrawer}
          onPrepareReminder={setReminderFor}
          onOpenQuery={setQueryRow}
        />
      </div>

      <TimesheetReviewDrawer
        row={reviewRow}
        statusOf={statusOf}
        onApprove={handleApprove}
        onRevert={handleRevert}
        onAdjust={setAdjustRow}
        onClose={() => setReviewRow(null)}
      />
      <TimeAdjustDialog row={adjustRow} onClose={() => setAdjustRow(null)} />
      <TimeQueryDrawer
        query={queryRow}
        onClose={() => setQueryRow(null)}
        onOpenTimesheet={() => {
          const match = queryRow ? allRows.find((r) => r.n === queryRow.n) : null;
          setQueryRow(null);
          if (match) setReviewRow(match);
          else toast.info("Timesheet", { description: "Entry not in this period." });
        }}
        onAddAdjustment={() => {
          const match = queryRow ? allRows.find((r) => r.n === queryRow.n) : null;
          setQueryRow(null);
          if (match) setAdjustRow(match);
          else toast.info("Adjustment", { description: "Entry not in this period." });
        }}
      />
      <ConfirmDialog
        open={!!reminderFor}
        onOpenChange={(o) => !o && setReminderFor(null)}
        title={`Prepare reminder for ${reminderFor ?? ""}?`}
        description={`A staff-facing reminder draft will be prepared for ${reminderFor ?? "them"}. Nothing is shared automatically — you review it in the staff update flow before it becomes staff-facing.`}
        confirmLabel="Prepare reminder"
        onConfirm={() => {
          setReminderFor(null);
          toast.info("Reminder prepared", { description: "Review before sending." });
        }}
      />
      <ConfirmDialog
        open={approveSuggestedOpen}
        onOpenChange={setApproveSuggestedOpen}
        title={`Approve ${suggestedRows.length} timesheets?`}
        description={
          suggestedRows.length > 0 ? (
            <span>
              Review the rows before confirming:{" "}
              <strong>{suggestedRows.map((r) => r.n).join(", ")}</strong> — all clocked on schedule
              with no exceptions.
            </span>
          ) : (
            "Everything eligible is already approved."
          )
        }
        confirmLabel="Confirm & approve"
        onConfirm={() => {
          setApproveSuggestedOpen(false);
          bulkApprove(
            suggestedRows.map((r) => r.id),
            "Approved",
          );
        }}
      />
      <TimeExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </AppShell>
  );
}
