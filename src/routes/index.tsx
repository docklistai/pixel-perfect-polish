import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, ActionButton, IconButton } from "@/components/dl";
import { Calendar, MoreHorizontal } from "lucide-react";
import { DashboardKpiCards } from "@/features/dashboard/components/DashboardKpiCards";
import { DashboardAttentionPanel } from "@/features/dashboard/components/DashboardAttentionPanel";
import { DashboardOpenShifts } from "@/features/dashboard/components/DashboardOpenShifts";
import { DashboardRotaPublish } from "@/features/dashboard/components/DashboardRotaPublish";
import { DashboardPendingLeave } from "@/features/dashboard/components/DashboardPendingLeave";
import { DashboardTimesheets } from "@/features/dashboard/components/DashboardTimesheets";
import { DashboardStaffOnShift } from "@/features/dashboard/components/DashboardStaffOnShift";
import { DashboardAnnouncements } from "@/features/dashboard/components/DashboardAnnouncements";
import { DashboardQuickActions } from "@/features/dashboard/components/DashboardQuickActions";
import { DashboardAlertDrawer } from "@/features/dashboard/components/DashboardAlertDrawer";
import { DashboardQuickActionDrawer } from "@/features/dashboard/components/DashboardQuickActionDrawer";
import {
  kpiItems,
  attentionItems,
  openShiftItems,
  leaveItems,
  timesheetItems,
  staffDeptItems,
  announcementItems,
  quickActionItems,
} from "@/features/dashboard/data/dashboardDemoData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — Docklist" },
      { name: "description", content: "Weekly overview for your hospitality team." },
    ],
  }),
  component: Home,
});

function Home() {
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState<null | { t: string; s: string }>(null);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="dock-section-eyebrow">Dashboard</div>
          <h1 className="mt-2 text-balance text-[2rem] font-semibold tracking-tight md:text-[2.125rem]">
            Good morning, Alex <span>👋</span>
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            Here's what's happening across Harbour View Hotel this week.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <ActionButton icon={Calendar}>Publish Rota</ActionButton>
          <IconButton icon={MoreHorizontal} label="More actions" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <DashboardKpiCards items={kpiItems} />
        <DashboardAttentionPanel
          items={attentionItems}
          total={5}
          onAlertClick={() => setAlertOpen(true)}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardOpenShifts items={openShiftItems} />
        <DashboardRotaPublish />
        <DashboardPendingLeave items={leaveItems} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardTimesheets items={timesheetItems} />
        <DashboardStaffOnShift items={staffDeptItems} total={28} />
        <DashboardAnnouncements items={announcementItems} />
        <DashboardQuickActions items={quickActionItems} onAction={setQuickOpen} />
      </div>

      <div className="mt-7 text-center text-xs text-muted-foreground">
        All times shown in Europe/London (GMT+1)
      </div>

      <DashboardAlertDrawer open={alertOpen} onOpenChange={setAlertOpen} />
      <DashboardQuickActionDrawer item={quickOpen} onClose={() => setQuickOpen(null)} />
    </AppShell>
  );
}
