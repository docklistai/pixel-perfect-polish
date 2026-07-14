import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, PageHeader, ConfirmDialog } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { Check, Info, AlertTriangle } from "lucide-react";
import { TimeMetricCards } from "@/features/time/components/TimeMetricCards";
import { TimesheetTable, type TimesheetTab } from "@/features/time/components/TimesheetTable";
import { TimeRightRail } from "@/features/time/components/TimeRightRail";
import { TimesheetReviewDrawer } from "@/features/time/components/TimesheetReviewDrawer";
import { TimeExportDialog } from "@/features/time/components/TimeExportDialog";
import { TimeAdjustDialog } from "@/features/time/components/TimeAdjustDialog";
import { TimeAddEntryDialog } from "@/features/time/components/TimeAddEntryDialog";
import { TimeQueryDrawer } from "@/features/time/components/TimeQueryDrawer";
import {
  TimeHeaderActions,
  TEAM_OPTIONS,
  defaultPeriod,
} from "@/features/time/components/TimeHeaderActions";
import type { StoredTimesheetRow, TimeQuery } from "@/features/time/types";
import { useWorkspaceTime } from "@/features/time/hooks/useWorkspaceTime";
import { useTimeController } from "@/features/time/hooks/useTimeController";
import { useAddTimeEntry } from "@/features/time/hooks/useAddTimeEntry";
import {
  currentWeekPeriod,
  isWithinPeriod,
  weekPeriodOf,
  type ReviewPeriod,
} from "@/features/time/lib/reviewPeriod";
import { canExportApprovedHours } from "@/features/time/lib/timeExport";
import { requireManagerAccess } from "@/features/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const Route = createFileRoute("/time")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Time & Attendance — Docklist" }] }),
  component: TimePage,
});

function TimePage() {
  const { openAiDrawer } = useOverlays();
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext();
  const liveExpected =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager");
  const [period, setPeriodState] = React.useState<ReviewPeriod>(() =>
    defaultPeriod(liveExpected ? "live" : "demo", "UTC"),
  );
  const {
    rows: rawRows,
    source: timeSource,
    state: timeState,
    workspaceTimezone,
  } = useWorkspaceTime(period);
  const liveWorkspaceId =
    timeSource === "live" && auth.status === "member" ? auth.workspaceId : null;
  // UTC is a neutral loading-only fallback; live actions use the stored zone
  // once the workspace read resolves, and the effect below corrects the week.
  const workspaceTz = workspaceTimezone ?? "UTC";
  const periodTouchedRef = React.useRef(false);
  const setPeriod = React.useCallback<React.Dispatch<React.SetStateAction<ReviewPeriod>>>(
    (update) => {
      periodTouchedRef.current = true;
      setPeriodState(update);
    },
    [],
  );
  React.useEffect(() => {
    if (!workspaceTimezone || periodTouchedRef.current) return;
    setPeriodState(currentWeekPeriod(new Date(), workspaceTimezone));
  }, [workspaceTimezone]);
  const [reviewRow, setReviewRow] = React.useState<StoredTimesheetRow | null>(null);
  const [adjustRow, setAdjustRow] = React.useState<StoredTimesheetRow | null>(null);
  const [queryRow, setQueryRow] = React.useState<TimeQuery | null>(null);
  const [reminderFor, setReminderFor] = React.useState<string | null>(null);
  const [approveSuggestedOpen, setApproveSuggestedOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [addEntryOpen, setAddEntryOpen] = React.useState(false);
  const addEntry = useAddTimeEntry(liveWorkspaceId);
  const openAddEntry = liveWorkspaceId ? () => setAddEntryOpen(true) : undefined;
  const [tab, setTab] = React.useState<TimesheetTab>("all");
  const [query, setQuery] = React.useState("");
  const [team, setTeam] = React.useState(TEAM_OPTIONS[0]!);

  // Live rows carry a work date and are scoped to the selected period; demo rows
  // have no date and represent a single coherent week, so they pass through.
  const periodRows = React.useMemo(
    () =>
      timeSource === "live"
        ? rawRows.filter((row) => !row.workDate || isWithinPeriod(row.workDate, period))
        : rawRows,
    [rawRows, timeSource, period],
  );

  const teamRows = React.useMemo(
    () => (team === "All teams" ? periodRows : periodRows.filter((row) => row.department === team)),
    [periodRows, team],
  );
  const time = useTimeController(periodRows, teamRows, timeSource);
  const canExport = canExportApprovedHours(teamRows);

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
          <TimeHeaderActions
            period={period}
            setPeriod={setPeriod}
            source={timeSource}
            workspaceTimezone={workspaceTz}
            team={team}
            setTeam={setTeam}
            onOpenAssistant={openAiDrawer}
            onExport={() => setExportOpen(true)}
            canExport={canExport}
            onApproveAllPending={time.approveAllPending}
            onAddEntry={openAddEntry}
          />
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
              <button
                type="button"
                className="btn primary sm"
                onClick={time.approveSelection}
                disabled={time.isSubmitting}
              >
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
            viewState={timeState}
            periodLabel={period.label}
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
            onAddEntry={openAddEntry}
          />
        </div>

        <TimeRightRail
          source={timeSource}
          onApproveSuggested={() => setApproveSuggestedOpen(true)}
          onOpenAssistant={openAiDrawer}
          onPrepareReminder={setReminderFor}
          onOpenQuery={setQueryRow}
          rows={teamRows}
        />
      </div>

      <TimesheetReviewDrawer
        row={reviewRow}
        liveWorkspaceId={liveWorkspaceId}
        statusOf={time.statusOf}
        onApprove={time.approve}
        onRevert={time.revert}
        onReject={time.reject}
        onAdjust={setAdjustRow}
        onClose={() => setReviewRow(null)}
      />
      <TimeAdjustDialog
        row={adjustRow}
        onClose={() => setAdjustRow(null)}
        onSave={time.saveAdjustment}
      />
      {liveWorkspaceId && (
        <TimeAddEntryDialog
          open={addEntryOpen}
          onClose={() => setAddEntryOpen(false)}
          workspaceId={liveWorkspaceId}
          workspaceTimezone={workspaceTz}
          isSaving={addEntry.isSaving}
          onSave={async (payload, staffName) => {
            const saved = await addEntry.save(payload, staffName);
            // Snap the review period to the entry's week so the new row is visible.
            if (saved && !isWithinPeriod(payload.workDate, period)) {
              setPeriod(weekPeriodOf(payload.workDate));
            }
            return saved;
          }}
        />
      )}
      <TimeQueryDrawer
        query={queryRow}
        onClose={() => setQueryRow(null)}
        onOpenTimesheet={() => {
          const match = queryRow ? periodRows.find((r) => r.n === queryRow.n) : null;
          setQueryRow(null);
          if (match) setReviewRow(match);
          else toast.info("Timesheet", { description: "Entry not in this period." });
        }}
        onAddAdjustment={() => {
          const match = queryRow ? periodRows.find((r) => r.n === queryRow.n) : null;
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
        period={period}
        source={timeSource}
        liveWorkspaceId={liveWorkspaceId}
      />
    </AppShell>
  );
}
