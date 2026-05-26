import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, IconButton } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { AlertTriangle, Plus, FileText, MoreHorizontal, Sparkles } from "lucide-react";
import { OpsStatCards } from "@/features/ops/components/OpsStatCards";
import { OpsTimeline } from "@/features/ops/components/OpsTimeline";
import { OpsRightRail } from "@/features/ops/components/OpsRightRail";
import { OpsDrawer } from "@/features/ops/components/OpsDrawer";
import type { DrawerMode } from "@/features/ops/types";

export const Route = createFileRoute("/ops")({
  head: () => ({ meta: [{ title: "Operations — Docklist" }] }),
  component: OpsPage,
});

function OpsPage() {
  const { openAiDrawer } = useOverlays();
  const [openDrawer, setOpenDrawer] = React.useState<DrawerMode>(null);

  return (
    <AppShell>
      <PageHeader
        title="Operations"
        subtitle="Stay on top of today's activity and keep your team aligned."
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

      <OpsStatCards />

      <div className="grid grid-cols-12 gap-5">
        <OpsTimeline />
        <OpsRightRail onOpenAssistant={openAiDrawer} />
      </div>

      <OpsDrawer mode={openDrawer} onClose={() => setOpenDrawer(null)} />
    </AppShell>
  );
}
