import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, IconButton } from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import { CalendarDays, MoreHorizontal, Sparkles } from "lucide-react";
import { requests } from "@/features/leave/data/leaveDemoData";
import { LeaveMetricCards } from "@/features/leave/components/LeaveMetricCards";
import { LeaveRequestInbox } from "@/features/leave/components/LeaveRequestInbox";
import { LeaveCalendarDrawer } from "@/features/leave/components/LeaveCalendarPanel";
import { LeaveDetailPanel } from "@/features/leave/components/LeaveDetailPanel";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave — Docklist" }] }),
  component: LeavePage,
});

function LeavePage() {
  const { openAiDrawer } = useOverlays();
  const [activeId, setActiveId] = React.useState(requests[0]?.id ?? "");
  const [approved, setApproved] = React.useState<Set<string>>(new Set());
  const [declined, setDeclined] = React.useState<Set<string>>(new Set());
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const activeRequest = requests.find((request) => request.id === activeId) ?? requests[0] ?? null;

  const handleApprove = (id: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setDeclined((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  const handleDecline = (id: string) => {
    setDeclined((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setApproved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  const handleReopen = (id: string) => {
    setApproved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDeclined((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Leave"
        subtitle="Review leave requests and ensure shifts are covered."
        actions={
          <>
            <ActionButton
              variant="secondary"
              icon={CalendarDays}
              onClick={() => setCalendarOpen(true)}
            >
              Calendar
            </ActionButton>
            <ActionButton variant="outline" icon={Sparkles} onClick={openAiDrawer}>
              Ask assistant
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <LeaveMetricCards />

      <div className="grid grid-cols-12 gap-5 items-start">
        <LeaveRequestInbox
          requests={requests}
          approved={approved}
          declined={declined}
          activeId={activeRequest?.id ?? ""}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onSelect={setActiveId}
        />
        {activeRequest && (
          <LeaveDetailPanel
            request={activeRequest}
            approved={approved}
            declined={declined}
            onApprove={(id) => {
              handleApprove(id);
              setActiveId(id);
            }}
            onDecline={(id) => {
              handleDecline(id);
              setActiveId(id);
            }}
            onReopen={handleReopen}
          />
        )}
      </div>

      <LeaveCalendarDrawer open={calendarOpen} onOpenChange={setCalendarOpen} />
    </AppShell>
  );
}
