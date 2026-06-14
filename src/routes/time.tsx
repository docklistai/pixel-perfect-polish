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
import { TimeMetricCards } from "@/features/time/components/TimeMetricCards";
import { TimesheetTable, type TimesheetTab } from "@/features/time/components/TimesheetTable";
import { TimeRightRail } from "@/features/time/components/TimeRightRail";
import { TimesheetReviewDrawer } from "@/features/time/components/TimesheetReviewDrawer";
import { TimeExportDialog } from "@/features/time/components/TimeExportDialog";
import { TimeAdjustDialog } from "@/features/time/components/TimeAdjustDialog";
import { TimeQueryDrawer } from "@/features/time/components/TimeQueryDrawer";
import type { StoredTimesheetRow, TimeQuery } from "@/features/time/types";
import { useWorkspaceTime } from "@/features/time/hooks/useWorkspaceTime";
import { useTimeController } from "@/features/time/hooks/useTimeController";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/time")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Time & Attendance — Docklist" }] }),
  component: TimePage,
});

const PERIOD_LABEL = "8 – 14 Jun 2026";
const PERIOD_START = "2026-06-08";
const PERIOD_END = "2026-06-14";

const TEAM_OPTIONS = [
  "All teams",
  "Front of House",
  "Kitchen",
  "Bar",
  "Housekeeping",
  "Maintenance",
];

function TimePage() {
  const { openAiDrawer } = useOverlays();
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext();
  const { rows: allRows, source: timeSource } = useWorkspaceTime();
  const liveWorkspaceId =
    timeSource === "live" && auth.status === "member" ? auth.workspaceId : null;
  const [reviewRow, setReviewRow] = React.useState<StoredTimesheetRow | null>(null);
  const [adjustRow, setAdjustRow] = React.useState<StoredTimesheetRow | null>(null);
  const [queryRow, setQueryRow] = React.useState<TimeQuery | null>(null);
  const [reminderFor, setReminderFor] = React.useState<string | null>(null);
  const [approveSuggestedOpen, setApproveSuggestedOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [tab, setTab] = React.useState<TimesheetTab>("all");
  const [query, setQuery] = React.useState("");
  const [team, setTeam] = React.useState(TEAM_OPTIONS[0]!);

  const teamRows = React.useMemo(
    () => (team === "All teams" ? allRows : allRows.filter((row) => row.department === team)),
    [allRows, team],
  );
  const time = useTimeController(allRows, teamRows, timeSource);

  const filtered = React.useMemo(() => {
    return teamRows.filter((r) => {
      if (query && !r.n.toLowerCase().includes(query.toLowerCase())) return false;
      const status = time.statusOf(r);
      switch (tab) {
        case "pending":
          return status === "pending";
        case "unapproved":
          return status === "unapproved";
        case "approved":
          return status === "approved";
        case "exceptions":
          return r.exc !== "—" || r.flagged;
        default:
          return true;
      }
    });
  }, [query, tab, teamRows, time]);

  const counts = React.useMemo(() => {
    const c = { all: teamRows.length, pending: 0, unapproved: 0, exceptions: 0, approved: 0 };
    for (const r of teamRows) {
      const status = time.statusOf(r);
      if (status === "approved") c.approved += 1;
      else if (status === "unapproved") c.unapproved += 1;
      else c.pending += 1;
      if (r.exc !== "—" || r.flagged) c.exceptions += 1;
    }
    return c;
  }, [teamRows, time]);

  const resetFilters = () => {
    setTab("all");
    setQuery("");
    setTeam("All teams");
  };

  return (
    <AppShell>
      <PageHeader
        title="Time & attendance"
        subtitle="Review clocked hours, approve, and export approved hours."
        actions={
          <>
            <span className="btn secondary sm" aria-label={`Current period ${PERIOD_LABEL}`}>
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {PERIOD_LABEL}
            </span>
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
                  onSelect: time.approveAllPending,
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
          <TimeMetricCards rows={teamRows} />

          {time.selectedIds.size > 0 && (
            <div
              className="card flex flex-wrap items-center gap-3 px-4 py-2.5"
              style={{
                background: "var(--st-teal-bg)",
                borderColor: "var(--st-teal-line)",
              }}
            >
              <span className="text-sm font-semibold text-brand">
                {time.selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <button type="button" className="btn primary sm" onClick={time.approveSelection}>
                <Check className="h-3.5 w-3.5" aria-hidden /> Approve {time.selectedIds.size}
              </button>
              <button type="button" className="btn secondary sm" onClick={time.flagSelection}>
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Flag
              </button>
              <button type="button" className="btn ghost sm" onClick={time.clearSelection}>
                Clear
              </button>
            </div>
          )}

          <TimesheetTable
            rows={filtered}
            totalRows={teamRows.length}
            statusOf={time.statusOf}
            flaggedIds={time.flaggedIds}
            selectedIds={time.selectedIds}
            onToggleSelect={time.toggleSelect}
            onToggleAll={() => time.toggleAll(filtered)}
            onReview={setReviewRow}
            onAdjust={setAdjustRow}
            onToggleApprove={time.toggleApprove}
            onToggleFlag={time.toggleFlag}
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
          rows={teamRows}
        />
      </div>

      <TimesheetReviewDrawer
        row={reviewRow}
        statusOf={time.statusOf}
        onApprove={time.approve}
        onRevert={time.revert}
        onAdjust={setAdjustRow}
        onClose={() => setReviewRow(null)}
      />
      <TimeAdjustDialog
        row={adjustRow}
        onClose={() => setAdjustRow(null)}
        onSave={time.saveAdjustment}
      />
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
        title={`Approve ${time.suggestedRows.length} timesheets?`}
        description={
          time.suggestedRows.length > 0 ? (
            <span>
              Review the rows before confirming:{" "}
              <strong>{time.suggestedRows.map((r) => r.n).join(", ")}</strong> — all clocked on
              schedule with no exceptions.
            </span>
          ) : (
            "Everything eligible is already approved."
          )
        }
        confirmLabel="Confirm & approve"
        onConfirm={() => {
          setApproveSuggestedOpen(false);
          time.bulkApprove(
            time.suggestedRows.map((r) => r.id),
            "Approved",
          );
        }}
      />
      <TimeExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        rows={teamRows}
        periodLabel={PERIOD_LABEL}
        liveWorkspaceId={liveWorkspaceId}
        periodStart={PERIOD_START}
        periodEnd={PERIOD_END}
      />
    </AppShell>
  );
}
