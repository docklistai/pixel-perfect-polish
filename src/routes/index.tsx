import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, ActionButton, IconButton } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { useIntents, type IntentName } from "@/lib/interactionIntents";
import { Sparkles, MoreHorizontal, Plus, ChevronDown } from "lucide-react";
import { DashboardAISummaryCard } from "@/features/dashboard/components/DashboardAISummaryCard";
import { DashboardSetupPanel } from "@/features/dashboard/components/DashboardSetupPanel";
import { useDashboardSetupPlan } from "@/features/dashboard/hooks/useDashboardSetupPlan";
import { useDismissOnOutside } from "@/features/dashboard/hooks/useDismissOnOutside";
import { DashboardKpiCards } from "@/features/dashboard/components/DashboardKpiCards";
import { DashboardAttentionPanel } from "@/features/dashboard/components/DashboardAttentionPanel";
import { DashboardLabourWatchLive } from "@/features/dashboard/components/DashboardLabourWatchLive";
import { DashboardLiveReadState } from "@/features/dashboard/components/DashboardLiveReadState";
import { DashboardRotaPublish } from "@/features/dashboard/components/DashboardRotaPublish";
import { DashboardPendingLeave } from "@/features/dashboard/components/DashboardPendingLeave";
import { DashboardTertiaryRow } from "@/features/dashboard/components/DashboardTertiaryRow";
import { DashboardAlertDrawer } from "@/features/dashboard/components/DashboardAlertDrawer";
import { DashboardKpiDetailDrawer } from "@/features/dashboard/components/DashboardKpiDetailDrawer";
import type { KpiItem } from "@/features/dashboard/types";
import { announcementItems, quickActionItems } from "@/features/dashboard/data/dashboardDemoData";
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { useTimePulse } from "@/features/dashboard/hooks/useTimePulse";
import { useGreeting } from "@/features/dashboard/hooks/useGreeting";
import { requireManagerAccess } from "@/features/auth";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { useWorkspaceLabourSettings } from "@/features/settings/hooks/useWorkspaceLabourSettings";
import { useWorkspaceProfile } from "@/features/settings/hooks/useWorkspaceProfile";

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
  const { openAiDrawer, openNotifications } = useOverlays();
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
  const dashboard = useDashboardData();
  const timePulse = useTimePulse();
  const { workspaceName, workspaceId } = useManagerIdentity();
  const greeting = useGreeting();
  const labourSettings = useWorkspaceLabourSettings();
  const workspaceProfile = useWorkspaceProfile();
  const isLiveDashboard = dashboard.source === "live";
  const liveReadsPending = isLiveDashboard && (dashboard.isLiveLoading || dashboard.isLiveError);
  // Live-only setup/readiness checklist; demo workspaces are always populated.
  const setupPlan = useDashboardSetupPlan({
    workspaceId,
    isLive: isLiveDashboard,
    liveReady: dashboard.liveReady,
    staffCount: dashboard.staffCount,
    plannedShiftCount: dashboard.plannedShiftCount,
    hasPublishedSnapshot: dashboard.nextPublished,
    hasLabourTargets: labourSettings.isUnset
      ? false
      : labourSettings.settings
        ? labourSettings.settings.weeklyBudgetMinutes !== null ||
          labourSettings.settings.avgHourlyCostPence !== null
        : null,
    hasBusinessBasics:
      !workspaceProfile.enabled || workspaceProfile.isLoading
        ? null
        : workspaceProfile.openWeekdaysMask !== null,
  });
  const showSetupPanel = setupPlan?.show ?? false;
  const visibleQuickActionItems = React.useMemo(
    () => (isLiveDashboard ? quickActionItems.filter((item) => !item.preview) : quickActionItems),
    [isLiveDashboard],
  );

  const runQuickAction = React.useCallback(
    (to: "/" | "/rota" | "/staff" | "/leave" | "/team" | "/ops", intent?: IntentName) => {
      setQuickOpen(false);
      navigate({ to });
      if (intent) requestIntent(intent);
    },
    [navigate, requestIntent],
  );

  useDismissOnOutside(quickRef, quickOpen, () => setQuickOpen(false));
  useDismissOnOutside(moreRef, moreOpen, () => setMoreOpen(false));

  return (
    <AppShell>
      {/* Header — prototype: title + actions row */}
      <div className="page-head flex-col lg:flex-row">
        <div className="min-w-0">
          <h1>{greeting}</h1>
          <p>
            {showSetupPanel && setupPlan?.mode === "workspace" ? (
              <>Let&apos;s get {workspaceName} ready for its first published rota.</>
            ) : showSetupPanel ? (
              <>Time to plan the week ahead for {workspaceName}.</>
            ) : (
              <>
                Here&apos;s what needs your attention across {workspaceName}{" "}
                {filter === "today" ? "today" : "this week"}.
              </>
            )}
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
            Manager support
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
                  Log an incident… (preview)
                </button>
                <div className="menu-sep" />
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/rota", "rota.generate")}
                >
                  Build this week…
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
                    navigate({ to: "/reports" });
                  }}
                >
                  View reports… (preview)
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

      {/* Live workspace with unsettled reads: a distinct loading/error surface
          instead of zeros, demo panels, or a premature "all clear". */}
      {liveReadsPending && (
        <DashboardLiveReadState
          isError={dashboard.isLiveError}
          onRetry={() => dashboard.retryLive()}
        />
      )}

      {/* Setup / weekly-readiness checklist for empty live workspaces */}
      {!liveReadsPending && showSetupPanel && setupPlan && (
        <div className="mb-4">
          <DashboardSetupPanel plan={setupPlan} />
        </div>
      )}

      {/* AI manager summary (dismissible) */}
      {!liveReadsPending && !summaryDismissed && !showSetupPanel && (
        <div className="mb-4">
          <DashboardAISummaryCard
            onDismiss={() => setSummaryDismissed(true)}
            onOpenAssistant={openAiDrawer}
            onOpenRota={() => navigate({ to: "/rota" })}
            onReviewTimesheets={() => navigate({ to: "/time" })}
            openShiftCount={dashboard.openShifts}
            pendingTimeCount={dashboard.pendingTimeCount}
            pendingLeaveCount={dashboard.pendingLeaveCount}
            weekScope={dashboard.attentionWeekScope}
          />
        </div>
      )}

      {/* KPI row + attention rail */}
      {!liveReadsPending && (
        <>
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
              onViewAll={() => openNotifications()}
            />
          </div>

          {/* Secondary row: labour watch · rota countdown · leave queue */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DashboardLabourWatchLive source={dashboard.source} weekShifts={dashboard.weekShifts} />
            <DashboardRotaPublish
              published={dashboard.nextPublished}
              hasUnpublishedChanges={dashboard.nextHasUnpublishedChanges}
              weekCommencing={dashboard.publishWeekLabel}
            />
            <DashboardPendingLeave items={dashboard.leaveItems} />
          </div>

          {/* Tertiary row: time pulse · timesheets · announcements · quick actions */}
          <DashboardTertiaryRow
            isLive={isLiveDashboard}
            timePulse={timePulse}
            timesheetItems={dashboard.timesheetItems}
            announcementItems={announcementItems}
            quickActionItems={visibleQuickActionItems}
          />
        </>
      )}

      <DashboardAlertDrawer
        open={alertOpen}
        onOpenChange={setAlertOpen}
        items={dashboard.attentionItems}
        selectedIndex={selectedAlertIdx}
      />
      <DashboardKpiDetailDrawer
        item={selectedKpi}
        onOpenChange={(open) => !open && setSelectedKpi(null)}
      />
    </AppShell>
  );
}
