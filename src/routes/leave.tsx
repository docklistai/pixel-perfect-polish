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
  Plane,
  Plus,
} from "lucide-react";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { useLeaveActions } from "@/features/leave/hooks/useLeaveActions";
import { LeaveMetricCards } from "@/features/leave/components/LeaveMetricCards";
import { LeaveRequestInbox } from "@/features/leave/components/LeaveRequestInbox";
import { LeaveCalendarDrawer } from "@/features/leave/components/LeaveCalendarPanel";
import { LeaveDetailPanel } from "@/features/leave/components/LeaveDetailPanel";
import { LeaveBottomCards } from "@/features/leave/components/LeaveBottomCards";
import { LeaveActionDialogs } from "@/features/leave/components/LeaveActionDialogs";
import { LeaveImpactSummaryCard } from "@/features/leave/components/LeaveImpactSummaryCard";
import { LeaveRiskDrawer } from "@/features/leave/components/LeaveRiskDrawer";
import { useOverlays } from "@/components/AppShortcuts";
import { toast } from "sonner";
import type { LeaveRequest } from "@/features/leave/types";
import { useIntentHandler } from "@/lib/interactionIntents";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave — Docklist" }] }),
  component: LeavePage,
});

type LeaveFilter = "all" | "annual" | "sick" | "coverage" | "notice";

const LEAVE_FILTER_LABELS: Record<LeaveFilter, string> = {
  all: "All types",
  annual: "Annual leave",
  sick: "Sick leave",
  coverage: "Coverage at risk",
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
  const { askAssistant } = useOverlays();
  const requests = useWorkspaceSelector((state) => state.leaveRequests);
  const [activeId, setActiveId] = React.useState("l3");
  const [filter, setFilter] = React.useState<LeaveFilter>("all");
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [newRequestOpen, setNewRequestOpen] = React.useState(false);
  const [decisionRequest, setDecisionRequest] = React.useState<LeaveRequest | null>(null);
  const [decisionType, setDecisionType] = React.useState<"approve" | "decline" | null>(null);
  const [riskOpen, setRiskOpen] = React.useState(false);

  useIntentHandler("leave.new", () => setNewRequestOpen(true));

  const visibleRequests = React.useMemo(
    () => requests.filter((request) => matchesLeaveFilter(request, filter)),
    [requests, filter],
  );
  const activeRequest =
    visibleRequests.find((request) => request.id === activeId) ?? visibleRequests[0] ?? null;
  const openDecision = (request: LeaveRequest, type: "approve" | "decline") => {
    setDecisionRequest(request);
    setDecisionType(type);
  };

  const closeDecision = () => {
    setDecisionRequest(null);
    setDecisionType(null);
  };

  const actions = useLeaveActions({
    decisionRequest,
    onSelectRequest: setActiveId,
    onCloseDecision: closeDecision,
    onCloseNewRequest: () => setNewRequestOpen(false),
  });

  return (
    <AppShell>
      <PageHeader
        title="Leave"
        subtitle="Review requests, see balances, and plan around upcoming time off."
        actions={
          <>
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
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Coverage at risk
                  {filter === "coverage" && <Check className="ml-auto h-3.5 w-3.5" aria-hidden />}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setFilter("notice")}>
                  <Clock className="h-3.5 w-3.5" aria-hidden /> High notice (&gt;30d)
                  {filter === "notice" && <Check className="ml-auto h-3.5 w-3.5" aria-hidden />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ActionButton icon={Plus} onClick={() => setNewRequestOpen(true)}>
              New request
            </ActionButton>
          </>
        }
      />

      <div className="guidance-note mb-4">
        <Info className="h-3 w-3 shrink-0" aria-hidden />
        Check coverage impact before deciding — high-impact requests are highlighted.
      </div>

      <LeaveMetricCards requests={requests} />

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
          onReopen={actions.reopen}
          onSelect={setActiveId}
        />
        {activeRequest && (
          <div className="col-span-12 space-y-3 self-start lg:sticky lg:top-[88px] lg:col-span-5">
            <LeaveDetailPanel
              request={activeRequest}
              requests={requests}
              onApprove={(request) => openDecision(request, "approve")}
              onDecline={(request) => openDecision(request, "decline")}
              onReopen={actions.reopen}
              onOpenRisk={() => setRiskOpen(true)}
            />
            {activeRequest.state === "pending" && (
              <LeaveImpactSummaryCard
                request={activeRequest}
                onAskAssistant={askAssistant}
                onCheckRota={() => {
                  navigate({ to: "/rota" });
                  toast.info("Rota opened", {
                    description: "Checking coverage for these dates.",
                  });
                }}
              />
            )}
          </div>
        )}
      </div>

      <LeaveBottomCards requests={requests} />

      <LeaveCalendarDrawer
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        onNewRequest={() => setNewRequestOpen(true)}
        requests={requests}
      />
      <LeaveRiskDrawer open={riskOpen} onOpenChange={setRiskOpen} />
      <LeaveActionDialogs
        decisionRequest={decisionRequest}
        decisionType={decisionType}
        newRequestOpen={newRequestOpen}
        onDecisionOpenChange={(open) => {
          if (!open) closeDecision();
        }}
        onNewRequestOpenChange={setNewRequestOpen}
        onApprove={actions.approve}
        onDecline={actions.decline}
        onCreateRequest={actions.createRequest}
      />
    </AppShell>
  );
}
