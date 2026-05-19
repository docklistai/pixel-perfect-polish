import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, IconButton } from "@/components/dl";
import { Download, MoreHorizontal, Calendar, Users } from "lucide-react";
import { rows } from "@/features/time/data/timeDemoData";
import { TimeMetricCards } from "@/features/time/components/TimeMetricCards";
import { TimesheetTable } from "@/features/time/components/TimesheetTable";
import { TimeRightRail } from "@/features/time/components/TimeRightRail";
import { TimesheetReviewDrawer } from "@/features/time/components/TimesheetReviewDrawer";
import { TimeExportDialog } from "@/features/time/components/TimeExportDialog";
import type { TimesheetRow } from "@/features/time/types";

export const Route = createFileRoute("/time")({
  head: () => ({ meta: [{ title: "Time & Attendance — Docklist" }] }),
  component: TimePage,
});

function TimePage() {
  const [reviewRow, setReviewRow] = React.useState<TimesheetRow | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [approved, setApproved] = React.useState<Set<string>>(new Set());
  const [declined, setDeclined] = React.useState<Set<string>>(new Set());

  const handleApprove = (id: string) => setApproved((prev) => new Set([...prev, id]));
  const handleDecline = (id: string) => setDeclined((prev) => new Set([...prev, id]));

  const openFirstPending = () => {
    const pending = rows.find((r) => !approved.has(r.id) && !declined.has(r.id)) ?? rows[0];
    setReviewRow(pending);
  };

  return (
    <AppShell>
      <PageHeader
        title="Time & Attendance"
        subtitle="Review and approve hours for the week."
        actions={
          <>
            <ActionButton onClick={openFirstPending}>Review timesheet</ActionButton>
            <ActionButton variant="secondary" icon={Download} onClick={() => setExportOpen(true)}>
              Preview hours export
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-9 space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-card px-3 py-2 flex items-center gap-2 shadow-[var(--shadow-card)]">
              <Calendar className="h-4 w-4 text-brand" aria-hidden="true" /> 18 – 24 May 2026
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2 flex items-center gap-2 shadow-[var(--shadow-card)]">
              <Users className="h-4 w-4" aria-hidden="true" /> All Teams
            </div>
          </div>

          <TimeMetricCards />
          <TimesheetTable
            rows={rows}
            approved={approved}
            declined={declined}
            onReview={setReviewRow}
          />
        </div>

        <TimeRightRail />
      </div>

      <TimesheetReviewDrawer
        row={reviewRow}
        approved={approved}
        declined={declined}
        onApprove={handleApprove}
        onDecline={handleDecline}
        onClose={() => setReviewRow(null)}
      />
      <TimeExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </AppShell>
  );
}
