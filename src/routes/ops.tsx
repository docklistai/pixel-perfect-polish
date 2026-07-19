import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, IconButton, AlertCard } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { useOverlays } from "@/components/AppShortcuts";
import {
  Check,
  Download,
  FileText,
  Filter,
  Info,
  ListChecks,
  MoreHorizontal,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  OPS_PREVIEW_BANNER_TITLE,
  OPS_PREVIEW_BANNER_DESCRIPTION,
  notifyOpsPreview,
} from "@/features/ops/lib/opsPreview";
import { OpsStatCards } from "@/features/ops/components/OpsStatCards";
import { OpsRiskPanel } from "@/features/ops/components/OpsRiskPanel";
import { OpsTimeline } from "@/features/ops/components/OpsTimeline";
import { OpsRightRail } from "@/features/ops/components/OpsRightRail";
import { OpsLogEntryModal } from "@/features/ops/components/OpsLogEntryModal";
import { OpsHandoverModal } from "@/features/ops/components/OpsHandoverModal";
import { OpsDetailDrawer } from "@/features/ops/components/OpsDetailDrawer";
import { opsTimeline } from "@/features/ops/data/opsDemoData";
import type { OpsEntry } from "@/features/ops/types";
import { requirePreviewSurface } from "@/features/auth";

export const Route = createFileRoute("/ops")({
  beforeLoad: ({ context }) => requirePreviewSurface(context.auth),
  head: () => ({ meta: [{ title: "Operations — Docklist" }] }),
  component: OpsPage,
});

const STATUS_TONE: Record<string, OpsEntry["stTone"]> = {
  Open: "warning",
  "In progress": "info",
  Done: "success",
  Closed: "info",
};

const FILTER_SCOPES = ["All entries", "Open only", "High priority only"] as const;
type FilterScope = (typeof FILTER_SCOPES)[number];

function matchesFilterScope(entry: OpsEntry, scope: FilterScope): boolean {
  switch (scope) {
    case "All entries":
      return true;
    case "Open only":
      return entry.st === "Open" || entry.st === "In progress";
    case "High priority only":
      return entry.prio === "High";
  }
}

function OpsPage() {
  const navigate = useNavigate();
  const { openAiDrawer } = useOverlays();
  const [entries, setEntries] = React.useState<OpsEntry[]>(() =>
    opsTimeline.map((e, i) => ({ ...e, id: `op-${i}` })),
  );
  const [logEntryOpen, setLogEntryOpen] = React.useState(false);
  const [handoverOpen, setHandoverOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [filterScope, setFilterScope] = React.useState<FilterScope>(FILTER_SCOPES[0]);

  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null;
  const visibleEntries = React.useMemo(
    () => entries.filter((entry) => matchesFilterScope(entry, filterScope)),
    [entries, filterScope],
  );

  const handleAddEntry = ({
    title,
    severity,
  }: {
    title: string;
    type: string;
    severity: string;
  }) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const entry: OpsEntry = {
      id: `new-${Date.now()}`,
      t: now,
      title,
      area: "Logged just now",
      st: "Open",
      stTone: "warning",
      dot: "info",
      icon: ListChecks,
      ...(severity !== "Low" && {
        prio: severity,
        prioTone: severity === "Medium" ? "warning" : "danger",
      }),
    };
    setEntries((es) => [entry, ...es]);
    toast.success("Entry logged", { description: "Added to the operations timeline" });
  };

  const handleChangeStatus = (id: string, status: string, options: { close?: boolean } = {}) => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    const prev = { st: target.st, stTone: target.stTone };
    setEntries((es) =>
      es.map((e) =>
        e.id === id ? { ...e, st: status, stTone: STATUS_TONE[status] ?? "info" } : e,
      ),
    );
    if (options.close && status === "Done") {
      toast.success("Marked done", {
        description: `${target.title} closed out`,
        action: {
          label: "Undo",
          onClick: () => {
            setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...prev } : e)));
            toast.info("Undone", { description: "Status restored" });
          },
        },
      });
    } else {
      toast.info("Status updated", { description: `${target.title} → ${status}` });
    }
  };

  const handleDelete = (id: string) => {
    const removed = entries.find((e) => e.id === id);
    if (!removed) return;
    setEntries((es) => es.filter((e) => e.id !== id));
    toast.warning("Deleted", {
      description: removed.title,
      action: {
        label: "Undo",
        onClick: () => {
          setEntries((es) => [removed, ...es]);
          toast.info("Restored", { description: `${removed.title} restored` });
        },
      },
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Ops"
        subtitle="Today's handover, incidents, tasks, and maintenance — in one operational log."
        actions={
          <>
            <RowActionMenu
              triggerLabel="Filter entries"
              trigger={
                <button type="button" className="btn secondary">
                  <Filter className="h-3.5 w-3.5" aria-hidden />{" "}
                  {filterScope === "All entries" ? "Filters" : filterScope}
                </button>
              }
              items={[
                { kind: "label", text: "Show in timeline" },
                ...FILTER_SCOPES.map((s) => ({
                  label: s,
                  icon: filterScope === s ? Check : undefined,
                  onSelect: () => setFilterScope(s),
                })),
              ]}
            />
            <ActionButton variant="outline" icon={Sparkles} onClick={openAiDrawer}>
              Manager support
            </ActionButton>
            <ActionButton variant="secondary" icon={FileText} onClick={() => setHandoverOpen(true)}>
              Handover note
            </ActionButton>
            <ActionButton icon={Plus} onClick={() => setLogEntryOpen(true)}>
              Log entry
            </ActionButton>
            <RowActionMenu
              triggerLabel="More actions"
              trigger={<IconButton icon={MoreHorizontal} label="More actions" />}
              items={[
                {
                  label: "Export today's log",
                  icon: Download,
                  onSelect: () => notifyOpsPreview("Exporting the log"),
                },
                {
                  label: "Print briefing",
                  icon: FileText,
                  onSelect: () => notifyOpsPreview("Printing the briefing"),
                },
                { kind: "separator" },
                {
                  label: "Settings",
                  icon: Settings,
                  onSelect: () => navigate({ to: "/settings" }),
                },
              ]}
            />
          </>
        }
      />

      <AlertCard
        className="mb-4"
        tone="warning"
        title={OPS_PREVIEW_BANNER_TITLE}
        description={OPS_PREVIEW_BANNER_DESCRIPTION}
      />

      <div className="guidance-note mb-4">
        <Info className="h-3 w-3 shrink-0" aria-hidden />
        Clear open risks before handover — use the risk panel to review what needs attention.
      </div>

      <OpsStatCards />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <OpsRiskPanel
            entries={entries}
            onOpenEntry={(entry) => setSelectedId(entry.id)}
            onOpenBriefing={() => notifyOpsPreview("Opening briefings")}
            onUseInHandover={() => setHandoverOpen(true)}
            onOpenAssistant={openAiDrawer}
          />
          <OpsTimeline
            entries={visibleEntries}
            onOpenEntry={(entry) => setSelectedId(entry.id)}
            onMarkDone={(id) => handleChangeStatus(id, "Done", { close: true })}
            onDelete={handleDelete}
            onOpenLogEntry={() => setLogEntryOpen(true)}
            onClearFilter={
              filterScope !== "All entries" ? () => setFilterScope("All entries") : null
            }
          />
        </div>
        <OpsRightRail />
      </div>

      <OpsLogEntryModal
        open={logEntryOpen}
        onClose={() => setLogEntryOpen(false)}
        onSave={handleAddEntry}
      />
      <OpsHandoverModal open={handoverOpen} onClose={() => setHandoverOpen(false)} />
      <OpsDetailDrawer
        entry={selectedEntry}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onChangeStatus={handleChangeStatus}
        onDelete={handleDelete}
      />
    </AppShell>
  );
}
