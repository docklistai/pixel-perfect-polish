import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, IconButton } from "@/components/dl";
import { AlertTriangle, MoreHorizontal, UserCheck } from "lucide-react";
import { requests } from "@/features/leave/data/leaveDemoData";
import { LeaveMetricCards } from "@/features/leave/components/LeaveMetricCards";
import { LeaveRequestInbox } from "@/features/leave/components/LeaveRequestInbox";
import { LeaveCalendarPanel } from "@/features/leave/components/LeaveCalendarPanel";
import { LeaveRightRail } from "@/features/leave/components/LeaveRightRail";
import { LeaveCoverSummary } from "@/features/leave/components/LeaveCoverSummary";
import { LeaveReviewDrawer } from "@/features/leave/components/LeaveReviewDrawer";
import { LeaveRiskDrawer } from "@/features/leave/components/LeaveRiskDrawer";
import type { LeaveRequest } from "@/features/leave/types";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave — Docklist" }] }),
  component: LeavePage,
});

function LeavePage() {
  const [reviewRow, setReviewRow] = React.useState<LeaveRequest | null>(null);
  const [approved, setApproved] = React.useState<Set<string>>(new Set());
  const [declined, setDeclined] = React.useState<Set<string>>(new Set());
  const [riskOpen, setRiskOpen] = React.useState(false);

  const handleApprove = (id: string) => setApproved((prev) => new Set([...prev, id]));
  const handleDecline = (id: string) => setDeclined((prev) => new Set([...prev, id]));

  return (
    <AppShell>
      <PageHeader
        title="Leave"
        subtitle="Review leave requests and ensure shifts are covered."
        actions={
          <>
            <ActionButton icon={UserCheck} onClick={() => setReviewRow(requests[0])}>
              Review requests
            </ActionButton>
            <ActionButton
              variant="secondary"
              icon={AlertTriangle}
              onClick={() => setRiskOpen(true)}
            >
              Coverage risks
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <LeaveMetricCards />

      <div className="grid grid-cols-12 gap-5">
        <LeaveRequestInbox
          requests={requests}
          approved={approved}
          declined={declined}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onReview={setReviewRow}
        />
        <LeaveCalendarPanel />
        <LeaveRightRail />
        <LeaveCoverSummary />
      </div>

      <LeaveReviewDrawer
        row={reviewRow}
        approved={approved}
        declined={declined}
        onApprove={handleApprove}
        onDecline={handleDecline}
        onClose={() => setReviewRow(null)}
      />
      <LeaveRiskDrawer open={riskOpen} onOpenChange={setRiskOpen} />
    </AppShell>
  );
}
