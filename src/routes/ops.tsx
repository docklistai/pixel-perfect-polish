import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, IconButton } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { AlertTriangle, Info, Plus, FileText, MoreHorizontal, Sparkles } from "lucide-react";
import { OpsStatCards } from "@/features/ops/components/OpsStatCards";
import { OpsTimeline } from "@/features/ops/components/OpsTimeline";
import { OpsRightRail } from "@/features/ops/components/OpsRightRail";
import { OpsDrawer } from "@/features/ops/components/OpsDrawer";
import { OpsDetailDrawer } from "@/features/ops/components/OpsDetailDrawer";
import type { DrawerMode, TimelineEntry } from "@/features/ops/types";

export const Route = createFileRoute("/ops")({
  head: () => ({ meta: [{ title: "Operations — Docklist" }] }),
  component: OpsPage,
});

function OpsPage() {
  const { openAiDrawer } = useOverlays();
  const [openDrawer, setOpenDrawer] = React.useState<DrawerMode>(null);
  const [selectedEntry, setSelectedEntry] = React.useState<TimelineEntry | null>(null);

  return (
    <AppShell>
      <PageHeader
        title="Ops"
        subtitle="Today's handover, incidents, tasks, and maintenance — in one operational log."
        actions={
          <>
            <ActionButton variant="outline" icon={Sparkles} onClick={openAiDrawer}>
              Ask assistant
            </ActionButton>
            <ActionButton icon={AlertTriangle} onClick={() => setOpenDrawer("incident")}>
              Log incident
            </ActionButton>
            <ActionButton variant="secondary" icon={Plus} onClick={() => setOpenDrawer("task")}>
              Add task
            </ActionButton>
            <ActionButton
              variant="secondary"
              icon={FileText}
              onClick={() => setOpenDrawer("handover")}
            >
              Add handover note
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="guidance-note mb-4">
        <Info className="h-3 w-3 shrink-0" aria-hidden />
        Clear open risks before handover — use the AI risk panel to review what needs attention.
      </div>

      <OpsStatCards />

      <div className="grid grid-cols-12 gap-5">
        <OpsTimeline onOpenEntry={setSelectedEntry} />
        <OpsRightRail onOpenAssistant={openAiDrawer} />
      </div>

      <OpsDrawer mode={openDrawer} onClose={() => setOpenDrawer(null)} />
      <OpsDetailDrawer
        entry={selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      />
    </AppShell>
  );
}
