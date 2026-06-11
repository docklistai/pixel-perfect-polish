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
import { requests as initialRequests } from "@/features/leave/data/leaveDemoData";
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

function LeavePage() {
  const navigate = useNavigate();
  const { askAssistant } = useOverlays();
  const [requests, setRequests] = React.useState<LeaveRequest[]>(initialRequests);
  const [activeId, setActiveId] = React.useState("l3");
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [newRequestOpen, setNewRequestOpen] = React.useState(false);
  const [decisionRequest, setDecisionRequest] = React.useState<LeaveRequest | null>(null);
  const [decisionType, setDecisionType] = React.useState<"approve" | "decline" | null>(null);
  const [riskOpen, setRiskOpen] = React.useState(false);

  useIntentHandler("leave.new", () => setNewRequestOpen(true));

  const activeRequest = requests.find((request) => request.id === activeId) ?? requests[0] ?? null;
  const pendingCount = requests.filter((request) => request.state === "pending").length;

  const openDecision = (request: LeaveRequest, type: "approve" | "decline") => {
    setDecisionRequest(request);
    setDecisionType(type);
  };

  const closeDecision = () => {
    setDecisionRequest(null);
    setDecisionType(null);
  };

  const updateState = (id: string, state: LeaveRequest["state"]) => {
    setRequests((items) => items.map((item) => (item.id === id ? { ...item, state } : item)));
    setActiveId(id);
  };

  const handleApprove = (id: string) => {
    updateState(id, "approved");
    closeDecision();
    toast.success("Leave approved", {
      description: `${decisionRequest?.n ?? "The team member"}'s request is approved — visible in their staff app preview.`,
      action: {
        label: "Undo",
        onClick: () => {
          updateState(id, "pending");
          toast.info("Reverted", { description: "Request returned to pending." });
        },
      },
    });
  };

  const handleDecline = (id: string) => {
    updateState(id, "declined");
    closeDecision();
    toast.warning("Request declined", {
      description: `${decisionRequest?.n ?? "The team member"}'s request is declined — your reason is saved to the record.`,
      action: {
        label: "Undo",
        onClick: () => {
          updateState(id, "pending");
          toast.info("Reverted", { description: "Request returned to pending review." });
        },
      },
    });
  };

  const handleReopen = (id: string) => {
    updateState(id, "pending");
    toast.info("Reopened", { description: "Request returned to review queue" });
  };

  const handleCreateRequest = (request: LeaveRequest) => {
    setRequests((items) => [request, ...items]);
    setActiveId(request.id);
    setNewRequestOpen(false);
    toast.success("Request created", {
      description: "Added to the pending review queue",
    });
  };

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
                  Filters
                </ActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel>Filters</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Plane className="h-3.5 w-3.5" aria-hidden /> Annual leave
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Heart className="h-3.5 w-3.5" aria-hidden /> Sick leave
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Check className="h-3.5 w-3.5" aria-hidden /> All types
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Coverage at risk
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Clock className="h-3.5 w-3.5" aria-hidden /> High notice (&gt;30d)
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

      <LeaveMetricCards pendingCount={pendingCount} />

      <div className="grid grid-cols-12 gap-5 items-start">
        <LeaveRequestInbox
          requests={requests}
          activeId={activeRequest?.id ?? ""}
          onAsk={(request) =>
            toast.info("Reminder prepared", {
              description: `Draft prepared asking ${request.n} for more details — review before sending.`,
            })
          }
          onApprove={(request) => openDecision(request, "approve")}
          onDecline={(request) => openDecision(request, "decline")}
          onReopen={handleReopen}
          onSelect={setActiveId}
        />
        {activeRequest && (
          <div className="col-span-12 space-y-3 self-start lg:sticky lg:top-[88px] lg:col-span-5">
            <LeaveDetailPanel
              request={activeRequest}
              onApprove={(request) => openDecision(request, "approve")}
              onDecline={(request) => openDecision(request, "decline")}
              onReopen={handleReopen}
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

      <LeaveBottomCards />

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
        onApprove={handleApprove}
        onDecline={handleDecline}
        onCreateRequest={handleCreateRequest}
      />
    </AppShell>
  );
}
