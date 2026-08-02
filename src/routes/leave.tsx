import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton } from "@/components/dl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  Filter,
  Heart,
  Info,
  Loader2,
  Plane,
  Plus,
} from "lucide-react";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import { useLeaveController } from "@/features/leave/hooks/useLeaveController";
import { LeaveMetricCards } from "@/features/leave/components/LeaveMetricCards";
import { LeaveRequestInbox } from "@/features/leave/components/LeaveRequestInbox";
import { LeaveCalendarDrawer } from "@/features/leave/components/LeaveCalendarPanel";
import { LeaveDetailPanel } from "@/features/leave/components/LeaveDetailPanel";
import { LeaveBottomCards } from "@/features/leave/components/LeaveBottomCards";
import { LeaveActionDialogs } from "@/features/leave/components/LeaveActionDialogs";
import { RecordAbsenceDialog } from "@/features/leave/components/RecordAbsenceDialog";
import { LeaveImpactSummaryCard } from "@/features/leave/components/LeaveImpactSummaryCard";
import { LeaveRotaImpactCard } from "@/features/leave/components/LeaveRotaImpactCard";
import { LeaveRiskDrawer } from "@/features/leave/components/LeaveRiskDrawer";
import { toast } from "sonner";
import type { LeaveRequest } from "@/features/leave/types";
import { MAX_ROTA_WEEK_OFFSET } from "@/features/rota/lib/rotaSearch";
import { weekOffsetForDate } from "@/features/leave/lib/leaveRotaImpact";
import { useIntentHandler } from "@/lib/interactionIntents";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/leave")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Leave — Docklist" }] }),
  component: LeavePage,
});

type LeaveFilter = "all" | "annual" | "sick" | "coverage" | "notice";

const LEAVE_FILTER_LABELS: Record<LeaveFilter, string> = {
  all: "All types",
  annual: "Annual leave",
  sick: "Sick leave",
  coverage: "Long requests (5+ days)",
  notice: "High notice (>30d)",
};

function matchesLeaveFilter(request: LeaveRequest, filter: LeaveFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "annual":
      return request.type === "Annual leave";
    case "sick":
      return request.type === "Sick leave";
    case "coverage":
      return request.impact === "High";
    case "notice":
      return request.notice > 30;
  }
}

function LeavePage() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = React.useState("l3");
  const [filter, setFilter] = React.useState<LeaveFilter>("all");
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [newRequestOpen, setNewRequestOpen] = React.useState(false);
  const [decisionRequest, setDecisionRequest] = React.useState<LeaveRequest | null>(null);
  const [decisionType, setDecisionType] = React.useState<"approve" | "decline" | "cancel" | null>(
    null,
  );
  const [riskOpen, setRiskOpen] = React.useState(false);
  const [absenceOpen, setAbsenceOpen] = React.useState(false);
  const { auth } = Route.useRouteContext();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;

  useIntentHandler("leave.new", () => setNewRequestOpen(true));

  const openDecision = (request: LeaveRequest, type: "approve" | "decline" | "cancel") => {
    setDecisionRequest(request);
    setDecisionType(type);
  };

  const closeDecision = () => {
    setDecisionRequest(null);
    setDecisionType(null);
  };

  const actions = useLeaveController({
    decisionRequest,
    onSelectRequest: setActiveId,
    onCloseDecision: closeDecision,
    onCloseNewRequest: () => setNewRequestOpen(false),
    onRecordAbsence: () => setAbsenceOpen(true),
  });
  const requests = actions.requests;
  const source = actions.source;
  // Real workspace date drives live "today"/"this week"; demo pins the demo week.
  const todayIso = source === "live" ? new Date().toISOString().slice(0, 10) : DEMO_WORLD.todayIso;
  const isLiveLoading = actions.state === "live-loading";
  const isLiveError = actions.state === "live-error";

  const visibleRequests = React.useMemo(
    () => requests.filter((request) => matchesLeaveFilter(request, filter)),
    [requests, filter],
  );
  const activeRequest =
    visibleRequests.find((request) => request.id === activeId) ?? visibleRequests[0] ?? null;

  return (
    <AppShell>
      <PageHeader
        title="Leave"
        subtitle="Review requests and plan around upcoming time off."
        actions={
          <>
            {source === "demo" && (
              <span className="badge" title="Showing the offline demo dataset">
                Demo data
              </span>
            )}
            <ActionButton
              variant="secondary"
              icon={CalendarDays}
              onClick={() => setCalendarOpen(true)}
            >
              Calendar
            </ActionButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionButton variant="secondary" icon={Filter}>
                  {filter === "all" ? "Filters" : LEAVE_FILTER_LABELS[filter]}
                </ActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel>Filters</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setFilter("annual")}>
                  <Plane className="h-3.5 w-3.5" aria-hidden /> Annual leave
                  {filter === "annual" && <Check className="ml-auto h-3.5 w-3.5" aria-hidden />}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setFilter("sick")}>
                  <Heart className="h-3.5 w-3.5" aria-hidden /> Sick leave
                  {filter === "sick" && <Check className="ml-auto h-3.5 w-3.5" aria-hidden />}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setFilter("all")}>
                  <Check className="h-3.5 w-3.5" aria-hidden /> All types
                  {filter === "all" && <Check className="ml-auto h-3.5 w-3.5" aria-hidden />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setFilter("coverage")}>
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Long requests (5+ days)
                  {filter === "coverage" && <Check className="ml-auto h-3.5 w-3.5" aria-hidden />}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setFilter("notice")}>
                  <Clock className="h-3.5 w-3.5" aria-hidden /> High notice (&gt;30d)
                  {filter === "notice" && <Check className="ml-auto h-3.5 w-3.5" aria-hidden />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ActionButton
              icon={Plus}
              onClick={() => (source === "live" ? setAbsenceOpen(true) : setNewRequestOpen(true))}
            >
              {source === "live" ? "Record absence" : "New request"}
            </ActionButton>
          </>
        }
      />

      {isLiveLoading ? (
        <div className="empty">
          <div className="ill" aria-hidden>
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <h4>Loading leave requests…</h4>
          <p>Fetching live requests for this workspace.</p>
        </div>
      ) : isLiveError ? (
        <div className="empty">
          <div className="ill" aria-hidden>
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <h4>Couldn&apos;t load live leave requests</h4>
          <p>We didn&apos;t show demo data instead. Refresh to try the live read again.</p>
        </div>
      ) : (
        <>
          <div className="guidance-note mb-4">
            <Info className="h-3 w-3 shrink-0" aria-hidden />
            Check the rota impact before deciding — affected scheduled shifts appear on pending
            requests when available.
          </div>

          <LeaveMetricCards requests={requests} todayIso={todayIso} />

          <div className="grid grid-cols-12 gap-5 items-start">
            <LeaveRequestInbox
              requests={visibleRequests}
              activeId={activeRequest?.id ?? ""}
              onAsk={(request) =>
                toast.info("Reminder prepared", {
                  description: `Draft prepared asking ${request.n} for more details — review before sending.`,
                })
              }
              onApprove={(request) => openDecision(request, "approve")}
              onDecline={(request) => openDecision(request, "decline")}
              onCancel={(request) => openDecision(request, "cancel")}
              onReopen={actions.reopen}
              onSelect={setActiveId}
            />
            {activeRequest && (
              <div className="col-span-12 space-y-3 self-start lg:sticky lg:top-[88px] lg:col-span-5">
                <LeaveDetailPanel
                  request={activeRequest}
                  requests={requests}
                  source={source}
                  onApprove={(request) => openDecision(request, "approve")}
                  onDecline={(request) => openDecision(request, "decline")}
                  onCancel={(request) => openDecision(request, "cancel")}
                  onReopen={actions.reopen}
                  onOpenRisk={() => setRiskOpen(true)}
                />
                {activeRequest.state === "pending" && (
                  <LeaveImpactSummaryCard
                    request={activeRequest}
                    onCheckRota={() => {
                      const weekOffset = weekOffsetForDate(todayIso, activeRequest.startIso);
                      const inRange = Math.abs(weekOffset) <= MAX_ROTA_WEEK_OFFSET;
                      navigate({
                        to: "/rota",
                        search: inRange ? { week: weekOffset } : undefined,
                      });
                      toast.info("Rota opened", {
                        description: inRange
                          ? "Opened the rota week for this leave request."
                          : "These leave dates are outside the supported rota week range.",
                      });
                    }}
                  />
                )}
                {activeRequest.state === "pending" && source === "live" && (
                  <LeaveRotaImpactCard request={activeRequest} todayIso={todayIso} />
                )}
              </div>
            )}
          </div>

          <LeaveBottomCards requests={requests} source={source} todayIso={todayIso} />
        </>
      )}

      <LeaveCalendarDrawer
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        onNewRequest={() => setNewRequestOpen(true)}
        requests={requests}
      />
      <LeaveRiskDrawer open={riskOpen} onOpenChange={setRiskOpen} request={activeRequest} />
      <LeaveActionDialogs
        source={source}
        decisionRequest={decisionRequest}
        decisionType={decisionType}
        decisionPending={actions.decisionPending}
        newRequestOpen={newRequestOpen}
        onDecisionOpenChange={(open) => {
          if (!open) closeDecision();
        }}
        onNewRequestOpenChange={setNewRequestOpen}
        onApprove={actions.approve}
        onDecline={actions.decline}
        onCancel={actions.cancel}
        onCreateRequest={actions.createRequest}
      />
      <RecordAbsenceDialog
        open={absenceOpen}
        onOpenChange={setAbsenceOpen}
        workspaceId={workspaceId}
      />
    </AppShell>
  );
}
