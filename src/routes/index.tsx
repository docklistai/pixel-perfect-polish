import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, ActionButton, IconButton } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { useIntents, type IntentName } from "@/lib/interactionIntents";
import { Sparkles, MoreHorizontal, Plus, ChevronDown } from "lucide-react";
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
import { DashboardKpiDetailDrawer } from "@/features/dashboard/components/DashboardKpiDetailDrawer";
import type { KpiItem } from "@/features/dashboard/types";
import {
  staffDeptItems,
  announcementItems,
  quickActionItems,
} from "@/features/dashboard/data/dashboardDemoData";
import { useDashboardWorkspace } from "@/features/dashboard/hooks/useDashboardWorkspace";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
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
  const { openAiDrawer } = useOverlays();
  const { requestIntent } = useIntents();
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [selectedAlertIdx, setSelectedAlertIdx] = React.useState(0);
  const [selectedKpi, setSelectedKpi] = React.useState<KpiItem | null>(null);
  const [summaryDismissed, setSummaryDismissed] = React.useState(false);
  const [filter, setFilter] = React.useState<"today" | "week">("week");
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const quickRef = React.useRef<HTMLDivElement>(null);
  const moreRef = React.useRef<HTMLDivElement>(null);
  const dashboard = useDashboardWorkspace();

  const runQuickAction = React.useCallback(
    (to: "/" | "/rota" | "/staff" | "/leave" | "/team" | "/ops", intent?: IntentName) => {
      setQuickOpen(false);
      navigate({ to });
      if (intent) requestIntent(intent);
    },
    [navigate, requestIntent],
  );

  React.useEffect(() => {
    if (!quickOpen) return;
    const onClick = (e: MouseEvent) => {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [quickOpen]);

  React.useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  return (
    <AppShell>
      {/* Header — prototype: title + actions row */}
      <div className="page-head flex-col lg:flex-row">
        <div className="min-w-0">
          <h1>Good morning, Alex</h1>
          <p>
            Here&apos;s what needs your attention across Harbour View Hotel{" "}
            {filter === "today" ? "today" : "this week"}.
          </p>
        </div>
        <div className="actions flex-wrap">
          {/* Today / This week segmented control */}
          <div
            className="inline-flex gap-0.5 rounded-[10px] p-0.5"
            style={{ background: "var(--ink-100)", border: "1px solid var(--border-faint)" }}
          >
            {(["today", "week"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold focus:outline-none"
                style={
                  filter === k
                    ? {
                        background: "var(--bg-card)",
                        color: "var(--ink-900)",
                        boxShadow: "var(--shadow-1)",
                      }
                    : {
                        color: "var(--ink-500)",
                        background: "transparent",
                      }
                }
              >
                {k === "today" ? "Today" : "This week"}
              </button>
            ))}
          </div>
          <ActionButton icon={Sparkles} variant="outline" onClick={openAiDrawer}>
            Ask assistant
          </ActionButton>
          <div className="relative" ref={quickRef}>
            <ActionButton
              icon={Plus}
              iconRight={ChevronDown}
              variant="primary"
              onClick={() => setQuickOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={quickOpen}
            >
              New
            </ActionButton>
            {quickOpen && (
              <div className="popover absolute top-[44px] right-0 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="menu-label">Create</div>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/rota", "rota.addShift")}
                >
                  Add a shift…
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/staff", "staff.add")}
                >
                  Add team member…
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/leave", "leave.new")}
                >
                  Log a leave request…
                </button>
                <button type="button" className="menu-item" onClick={() => runQuickAction("/team")}>
                  Compose announcement…
                </button>
                <button type="button" className="menu-item" onClick={() => runQuickAction("/ops")}>
                  Log an incident…
                </button>
                <div className="menu-sep" />
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/rota", "rota.generate")}
                >
                  Generate rota draft…
                </button>
              </div>
            )}
          </div>
          <div className="relative" ref={moreRef}>
            <IconButton
              icon={MoreHorizontal}
              label="More dashboard actions"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
            />
            {moreOpen && (
              <div className="popover absolute top-[44px] right-0 z-50 w-52 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="menu-label">Dashboard</div>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setMoreOpen(false);
                    toast.info("Customise dashboard", {
                      description: "Dashboard layout customisation arrives in a later update.",
                    });
                  }}
                >
                  Customise dashboard…
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setMoreOpen(false);
                    toast.info("Export snapshot", {
                      description: "Preparing weekly snapshot export…",
                    });
                  }}
                >
                  Export snapshot…
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setMoreOpen(false);
                    setSummaryDismissed(false);
                    toast.info("Hints reset", {
                      description: "Dashboard hints are visible again.",
                    });
                  }}
                >
                  Reset hints
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI manager summary (dismissible) */}
      {!summaryDismissed && (
        <div className="mb-4">
          <DashboardAISummaryCard
            onDismiss={() => setSummaryDismissed(true)}
            onOpenAssistant={openAiDrawer}
            onOpenRota={() => navigate({ to: "/rota" })}
            onReviewTimesheets={() => navigate({ to: "/time" })}
            openShiftCount={dashboard.openShifts}
            pendingTimeCount={dashboard.pendingTime.length}
            pendingLeaveCount={dashboard.pendingLeave.length}
          />
        </div>
      )}

      {/* KPI row + attention rail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <DashboardKpiCards
          items={filter === "today" ? dashboard.todayKpis : dashboard.weeklyKpis}
          title={filter === "today" ? "Today's snapshot" : "Weekly overview"}
          onKpiClick={setSelectedKpi}
        />
        <DashboardAttentionPanel
          items={dashboard.attentionItems}
          total={dashboard.attentionItems.length}
          onAlertClick={(idx) => {
            setSelectedAlertIdx(idx);
            setAlertOpen(true);
          }}
        />
      </div>

      {/* Secondary row: labour watch · rota countdown · leave queue */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardLabourWatch labourCost="£5,291" projectedSales="£18,500" labourPct={28.6} />
        <DashboardRotaPublish />
        <DashboardPendingLeave items={dashboard.leaveItems} />
      </div>

      {/* Tertiary row: timesheets · staff board · announcements · quick actions */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStaffOnShift items={staffDeptItems} total={6} />
        <DashboardTimesheets items={dashboard.timesheetItems} />
        <DashboardAnnouncements items={announcementItems} />
        <DashboardQuickActions items={quickActionItems} />
      </div>

      <DashboardAlertDrawer
        open={alertOpen}
        onOpenChange={setAlertOpen}
        selectedIndex={selectedAlertIdx}
      />
      <DashboardKpiDetailDrawer
        item={selectedKpi}
        onOpenChange={(open) => !open && setSelectedKpi(null)}
      />
    </AppShell>
  );
}
