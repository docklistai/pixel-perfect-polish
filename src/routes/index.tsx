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
  const { openAiDrawer } = useOverlays();
  const { requestIntent } = useIntents();
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [summaryDismissed, setSummaryDismissed] = React.useState(false);
  const [filter, setFilter] = React.useState<"today" | "week">("week");
  const [quickOpen, setQuickOpen] = React.useState(false);
  const quickRef = React.useRef<HTMLDivElement>(null);

  const runQuickAction = React.useCallback(
    (to: "/" | "/rota" | "/staff" | "/leave" | "/team", intent?: IntentName) => {
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

  return (
    <AppShell>
      {/* Header — prototype: title + actions row */}
      <div className="page-head flex-col lg:flex-row">
        <div className="min-w-0">
          <h1>
            Good morning, Alex <span aria-hidden>👋</span>
          </h1>
          <p>
            Here&apos;s what&apos;s happening across Harbour View Hotel{" "}
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
              Quick action
            </ActionButton>
            {quickOpen && (
              <div className="popover absolute top-[44px] right-0 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/rota", "rota.addShift")}
                >
                  Add a shift
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/rota", "rota.publish")}
                >
                  Publish rota
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/rota", "rota.generate")}
                >
                  Generate rota draft
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/leave", "leave.new")}
                >
                  New leave request
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => runQuickAction("/staff", "staff.add")}
                >
                  Add a team member
                </button>
              </div>
            )}
          </div>
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
          <DashboardAISummaryCard
            onDismiss={() => setSummaryDismissed(true)}
            onOpenAssistant={openAiDrawer}
            onOpenRota={() => navigate({ to: "/rota" })}
            onReviewTimesheets={() => navigate({ to: "/time" })}
          />
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
        <DashboardLabourWatch labourCost="£18,420" projectedSales="£64,420" labourPct={28.6} />
        <DashboardRotaPublish />
        <DashboardPendingLeave items={leaveItems} />
      </div>

      {/* Tertiary row: timesheets · staff board · announcements · quick actions */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStaffOnShift items={staffDeptItems} total={28} />
        <DashboardTimesheets items={timesheetItems} />
        <DashboardAnnouncements items={announcementItems} />
        <DashboardQuickActions items={quickActionItems} />
      </div>

      <DashboardAlertDrawer open={alertOpen} onOpenChange={setAlertOpen} />
    </AppShell>
  );
}
