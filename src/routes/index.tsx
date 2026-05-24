import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, ActionButton, IconButton } from "@/components/dl";
import { Sparkles, MoreHorizontal, Calendar } from "lucide-react";
import { DashboardAISummaryCard } from "@/features/dashboard/components/DashboardAISummaryCard";
import { DashboardKpiCards } from "@/features/dashboard/components/DashboardKpiCards";
import { DashboardAttentionPanel } from "@/features/dashboard/components/DashboardAttentionPanel";
import { DashboardLabourWatch } from "@/features/dashboard/components/DashboardLabourWatch";
import { DashboardRotaPublish } from "@/features/dashboard/components/DashboardRotaPublish";
import { DashboardPendingLeave } from "@/features/dashboard/components/DashboardPendingLeave";
import { DashboardTimesheets } from "@/features/dashboard/components/DashboardTimesheets";
import { DashboardStaffOnShift } from "@/features/dashboard/components/DashboardStaffOnShift";
import { DashboardAnnouncements } from "@/features/dashboard/components/DashboardAnnouncements";
import { DashboardQuickActions } from "@/features/dashboard/components/DashboardQuickActions";
import { DashboardAlertDrawer } from "@/features/dashboard/components/DashboardAlertDrawer";
import {
  kpiItems,
  attentionItems,
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
  const navigate = useNavigate();
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [summaryDismissed, setSummaryDismissed] = React.useState(false);
  const [filter, setFilter] = React.useState<"today" | "week">("week");

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="dock-section-eyebrow">Dashboard</div>
          <h1 className="mt-2 text-balance text-[2rem] font-semibold tracking-tight md:text-[2.125rem]">
            Good morning, Alex <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            Here&apos;s what&apos;s happening across Harbour View Hotel{" "}
            {filter === "today" ? "today" : "this week"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          {/* Today / This week toggle */}
          <div className="inline-flex gap-0.5 rounded-[10px] border border-border bg-muted/40 p-0.5">
            {(["today", "week"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  filter === k
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {k === "today" ? "Today" : "This week"}
              </button>
            ))}
          </div>
          <ActionButton
            icon={Sparkles}
            variant="secondary"
            onClick={() =>
              toast.info("AI manager review", {
                description: "Manager review assistant is on the roadmap.",
              })
            }
          >
            Ask assistant
          </ActionButton>
          <ActionButton icon={Calendar} onClick={() => navigate({ to: "/rota" })}>
            Publish Rota
          </ActionButton>
          <IconButton
            icon={MoreHorizontal}
            label="More dashboard actions"
            onClick={() =>
              toast.info("Dashboard options", {
                description: "Dashboard customisation is on the roadmap.",
              })
            }
          />
        </div>
      </div>

      {/* AI manager summary (dismissible) */}
      {!summaryDismissed && (
        <div className="mb-4">
          <DashboardAISummaryCard onDismiss={() => setSummaryDismissed(true)} />
        </div>
      )}

      {/* KPI row + attention rail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <DashboardKpiCards items={kpiItems} />
        <DashboardAttentionPanel
          items={attentionItems}
          total={attentionItems.length}
          onAlertClick={() => setAlertOpen(true)}
        />
      </div>

      {/* Secondary row: labour watch · rota countdown · leave queue */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardLabourWatch scheduledHours={1248} labourCost="£18,420" coveragePct={98} />
        <DashboardRotaPublish />
        <DashboardPendingLeave items={leaveItems} />
      </div>

      {/* Tertiary row: timesheets · staff board · announcements · quick actions */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardTimesheets items={timesheetItems} />
        <DashboardStaffOnShift items={staffDeptItems} total={28} />
        <DashboardAnnouncements items={announcementItems} />
        <DashboardQuickActions items={quickActionItems} />
      </div>

      <div className="mt-7 text-center text-xs text-muted-foreground">
        All times shown in Europe/London (GMT+1)
      </div>

      <DashboardAlertDrawer open={alertOpen} onOpenChange={setAlertOpen} />
    </AppShell>
  );
}
