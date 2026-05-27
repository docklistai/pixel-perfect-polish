import { createFileRoute } from "@tanstack/react-router";
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
import { LeaveRiskDrawer } from "@/features/leave/components/LeaveRiskDrawer";
import { toast } from "sonner";
import type { LeaveRequest } from "@/features/leave/types";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave — Docklist" }] }),
  component: LeavePage,
});

function LeavePage() {
  const [requests, setRequests] = React.useState<LeaveRequest[]>(initialRequests);
  const [activeId, setActiveId] = React.useState("l3");
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [newRequestOpen, setNewRequestOpen] = React.useState(false);
  const [decisionRequest, setDecisionRequest] = React.useState<LeaveRequest | null>(null);
  const [decisionType, setDecisionType] = React.useState<"approve" | "decline" | null>(null);
  const [riskOpen, setRiskOpen] = React.useState(false);

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
      description: `${decisionRequest?.n ?? "Team member"} has been notified`,
    });
  };

  const handleDecline = (id: string) => {
    updateState(id, "declined");
    closeDecision();
    toast.warning("Request declined", {
      description: `${decisionRequest?.n ?? "Team member"} has been notified with your reason`,
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
      description: "Added to the queue · automatically approved by manager",
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

      <LeaveMetricCards pendingCount={pendingCount} />

      <div className="grid grid-cols-12 gap-5 items-start">
        <LeaveRequestInbox
          requests={requests}
          activeId={activeRequest?.id ?? ""}
          onAsk={(request) =>
            toast.info("Message sent", { description: `Asked ${request.n} for more details` })
          }
          onApprove={(request) => openDecision(request, "approve")}
          onDecline={(request) => openDecision(request, "decline")}
          onReopen={handleReopen}
          onSelect={setActiveId}
        />
        {activeRequest && (
          <LeaveDetailPanel
            request={activeRequest}
            onApprove={(request) => openDecision(request, "approve")}
            onDecline={(request) => openDecision(request, "decline")}
            onReopen={handleReopen}
            onOpenRisk={() => setRiskOpen(true)}
          />
        )}
      </div>

      <LeaveBottomCards />

      <LeaveCalendarDrawer
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        onNewRequest={() => setNewRequestOpen(true)}
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
