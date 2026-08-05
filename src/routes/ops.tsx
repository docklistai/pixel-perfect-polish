import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Card, EmptyState } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { requireManagerAccess } from "@/features/auth";
import { OpsStatCards } from "@/features/ops/components/OpsStatCards";
import { OpsRiskPanel } from "@/features/ops/components/OpsRiskPanel";
import { OpsTimeline } from "@/features/ops/components/OpsTimeline";
import { OpsRightRail } from "@/features/ops/components/OpsRightRail";
import { OpsFilterBar } from "@/features/ops/components/OpsFilterBar";
import { OpsPageOverlays } from "@/features/ops/components/OpsPageOverlays";
import { OpsPageHeaderActions } from "@/features/ops/components/OpsPageHeaderActions";
import { useOpsPage } from "@/features/ops/hooks/useOpsPage";
import { useOpsEntryCommands } from "@/features/ops/hooks/useOpsEntryCommands";
import { useOpsCollaborationCommands } from "@/features/ops/hooks/useOpsCollaborationCommands";
import { useOpsChecklistCommands } from "@/features/ops/hooks/useOpsChecklistCommands";
import { parseOpsSearch, searchFromFilters } from "@/features/ops/lib/opsSearch";
import {
  OPS_BRIEFING_PRINT_AMBIGUOUS,
  OPS_BRIEFING_PRINT_NONE,
  printOpsBriefing,
  selectPrintableBriefing,
} from "@/features/ops/lib/opsPrint";
import type { OpsBriefing, OpsEntry, OpsFilters, OpsRisk } from "@/features/ops/types";

export const Route = createFileRoute("/ops")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  validateSearch: parseOpsSearch,
  head: () => ({ meta: [{ title: "Operations — Docklist" }] }),
  component: OpsPage,
});

function OpsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { openAiDrawer } = useOverlays();
  const page = useOpsPage(search);
  const data = page.query.data;
  const entries = useOpsEntryCommands(page.actions.run, page.actions.runOptimistic);
  const collaboration = useOpsCollaborationCommands(page.actions.run);
  const checklists = useOpsChecklistCommands(page.actions.run, page.actions.runForResult);
  const [editEntry, setEditEntry] = React.useState<OpsEntry | null>(null);
  const [seedEntry, setSeedEntry] = React.useState<OpsEntry | null>(null);
  const [archiveEntry, setArchiveEntry] = React.useState<OpsEntry | null>(null);
  const [briefingId, setBriefingId] = React.useState<string | null>(search.briefing ?? null);
  const [checklistRunId, setChecklistRunId] = React.useState<string | null>(null);
  const filtersRef = React.useRef(page.filters);
  const hasFilters = Boolean(
    page.filters.search ||
    page.filters.entryType ||
    page.filters.status ||
    page.filters.priority ||
    page.filters.locationId ||
    page.filters.sort !== "time_desc",
  );
  const [filtersOpen, setFiltersOpen] = React.useState(hasFilters);
  React.useEffect(() => setBriefingId(search.briefing ?? null), [search.briefing]);
  React.useEffect(() => {
    filtersRef.current = page.filters;
  }, [page.filters]);
  const updateFilters = (change: Partial<OpsFilters>) => {
    const next = { ...filtersRef.current, ...change };
    filtersRef.current = next;
    void navigate({ to: "/ops", search: searchFromFilters(next), replace: true });
  };
  const openNew = (seed: OpsEntry | null = null, edit: OpsEntry | null = null) => {
    setSeedEntry(seed);
    setEditEntry(edit);
    page.setLogEntryOpen(true);
  };
  const openBriefing = (id: string | null) => {
    setBriefingId(id);
    page.setBriefingOpen(true);
  };
  const openChecklist = (id?: string) => {
    setChecklistRunId(id ?? null);
    page.setChecklistOpen(true);
  };
  const printBriefing = (briefings: OpsBriefing[]) => {
    const target = selectPrintableBriefing(briefings, page.filters.locationId);
    if (target.status === "none") return toast.error(OPS_BRIEFING_PRINT_NONE);
    if (target.status === "ambiguous") return toast.error(OPS_BRIEFING_PRINT_AMBIGUOUS);
    printOpsBriefing(target.briefing);
  };

  if (!page.enabled)
    return (
      <OpsShell>
        <EmptyState
          title="Ops needs a live workspace connection"
          description="Configure Supabase and sign in as a manager to use the operational log."
        />
      </OpsShell>
    );
  if (page.query.isError)
    return (
      <OpsShell>
        <EmptyState
          title="Ops couldn't be loaded"
          description="Try again; no sample data has been substituted."
          action={
            <button
              type="button"
              className="btn secondary"
              onClick={() => void page.query.refetch()}
            >
              Retry
            </button>
          }
        />
      </OpsShell>
    );
  if (page.query.isLoading || !data)
    return (
      <OpsShell>
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Loading live operations…
        </Card>
      </OpsShell>
    );

  const openRisk = (risk: OpsRisk) => {
    if (risk.entryId) page.setSelectedId(risk.entryId);
    else if (risk.shiftId)
      void navigate({
        to: "/rota",
        search: {
          location: risk.locationId,
          week: risk.rotaWeekOffset,
          shift: risk.shiftId,
        },
      });
    else if (risk.leaveRequestId)
      void navigate({ to: "/leave", search: { request: risk.leaveRequestId } });
    else if (risk.handoverId) page.setHandoverOpen(true);
    else if (risk.checklistRunId) openChecklist(risk.checklistRunId);
  };
  return (
    <AppShell>
      <PageHeader
        title="Ops"
        subtitle="Today's handover, incidents, tasks, and maintenance — in one operational log."
        actions={
          <OpsPageHeaderActions
            filtersOpen={filtersOpen}
            hasFilters={hasFilters}
            onToggleFilters={() => setFiltersOpen((open) => !open)}
            onManagerSupport={openAiDrawer}
            onHandover={() => page.setHandoverOpen(true)}
            onLogEntry={() => openNew()}
            onExport={() => void entries.exportCsv(page.filters.locationId)}
            onPrintBriefing={() => printBriefing(data.briefings)}
            onSettings={() => void navigate({ to: "/settings" })}
          />
        }
      />
      <div className="guidance-note mb-4">
        <Info className="size-3 shrink-0" aria-hidden />
        Clear open risks before handover — every rule below is deterministic and based on live
        records.
      </div>
      {filtersOpen && (
        <OpsFilterBar
          filters={page.filters}
          locations={data.locations}
          onChange={updateFilters}
          onClear={() =>
            updateFilters({
              search: "",
              entryType: null,
              status: null,
              priority: null,
              locationId: null,
              sort: "time_desc",
              page: 1,
            })
          }
        />
      )}
      <OpsStatCards metrics={data.metrics} />
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <OpsRiskPanel
            risks={data.risks}
            onOpenRisk={openRisk}
            onUseInHandover={() => page.setHandoverOpen(true)}
            onOpenAssistant={openAiDrawer}
          />
          <OpsTimeline
            tab={page.tab}
            onTabChange={(tab) => {
              page.setTab(tab);
              updateFilters({ page: 1 });
            }}
            timeline={data.timeline}
            timelineTruncated={data.timelineTruncated}
            timelineEntryEventLimit={data.timelineEntryEventLimit}
            entries={data.entries}
            briefings={data.briefings}
            checklistRuns={data.checklistRuns}
            onOpenEntry={page.setSelectedId}
            onOpenBriefing={(id) => openBriefing(id)}
            onOpenChecklist={openChecklist}
            onNewBriefing={() => openBriefing(null)}
            onOpenHandover={() => page.setHandoverOpen(true)}
            onMarkDone={(entryId) => void entries.status(entryId, "resolved")}
            facets={data.facets}
            onClearFilter={() =>
              updateFilters({ search: "", entryType: null, status: null, priority: null, page: 1 })
            }
            onPageChange={(pageNumber) => updateFilters({ page: pageNumber })}
            page={page.filters.page}
            total={data.total}
            pageSize={page.filters.pageSize}
          />
        </div>
        <OpsRightRail
          metrics={data.metrics}
          departments={data.departments}
          staff={data.staff}
          briefings={data.briefings}
          checklistRuns={data.checklistRuns}
          onOpenBriefing={(id) => openBriefing(id)}
          onOpenChecklist={openChecklist}
        />
      </div>
      <OpsPageOverlays
        page={page}
        data={data}
        entries={entries}
        collaboration={collaboration}
        checklists={checklists}
        editEntry={editEntry}
        seedEntry={seedEntry}
        archiveEntry={archiveEntry}
        briefingId={briefingId}
        checklistRunId={checklistRunId}
        openNew={openNew}
        setArchiveEntry={setArchiveEntry}
      />
    </AppShell>
  );
}

function OpsShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PageHeader title="Ops" subtitle="Today's operational log." />
      {children}
    </AppShell>
  );
}
