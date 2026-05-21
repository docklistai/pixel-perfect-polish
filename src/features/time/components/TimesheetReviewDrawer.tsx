import {
  DrawerShell,
  FormSection,
  FormRow,
  DetailRow,
  StatusBadge,
  ActionButton,
} from "@/components/dl";
import type { TimesheetRow } from "../types";

interface Props {
  row: TimesheetRow | null;
  approved: Set<string>;
  declined: Set<string>;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onClose: () => void;
}

export function TimesheetReviewDrawer({
  row,
  approved,
  declined,
  onApprove,
  onDecline,
  onClose,
}: Props) {
  if (!row) return null;

  const isApproved = approved.has(row.id);
  const isDeclined = declined.has(row.id);
  const isPending = !isApproved && !isDeclined;

  const latenessFlags = row.exc !== "—" ? "1" : "0";
  const badgeTone = isApproved
    ? ("success" as const)
    : isDeclined
      ? ("danger" as const)
      : ("warning" as const);
  const badgeLabel = isApproved ? "Approved" : isDeclined ? "Declined" : "Needs review";

  return (
    <DrawerShell
      open={!!row}
      onOpenChange={(o) => !o && onClose()}
      title={`${row.n} — Week of 18 May 2026`}
      description={`${row.role} · Harbour View Hotel`}
      meta={<StatusBadge tone={badgeTone}>{badgeLabel}</StatusBadge>}
      width="lg"
      footer={
        isPending ? (
          <>
            <ActionButton
              variant="secondary"
              onClick={() => {
                onDecline(row.id);
                onClose();
              }}
            >
              Decline
            </ActionButton>
            <ActionButton
              onClick={() => {
                onApprove(row.id);
                onClose();
              }}
            >
              Approve hours
            </ActionButton>
          </>
        ) : (
          <ActionButton onClick={onClose}>Close</ActionButton>
        )
      }
    >
      <FormSection title="Summary">
        <dl className="divide-y divide-border">
          <DetailRow label="Scheduled" value={row.sched} />
          <DetailRow label="Paid hours" value={row.paid} />
          <DetailRow label="Exceptions" value={row.exc} />
          <DetailRow label="Lateness flags" value={latenessFlags} />
        </dl>
      </FormSection>
      <FormSection title="Manager note" description="Notes are not saved yet in this preview.">
        <FormRow label="Add a note" htmlFor="time-manager-note">
          <textarea
            id="time-manager-note"
            className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Optional note..."
          />
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
