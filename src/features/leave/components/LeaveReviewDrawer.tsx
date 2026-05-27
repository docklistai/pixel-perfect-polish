import {
  DrawerShell,
  FormSection,
  FormRow,
  DetailRow,
  StatusBadge,
  ActionButton,
} from "@/components/dl";
import type { LeaveRequest } from "../types";

interface Props {
  row: LeaveRequest | null;
  approved: Set<string>;
  declined: Set<string>;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onClose: () => void;
}

export function LeaveReviewDrawer({ row, onApprove, onDecline, onClose }: Props) {
  if (!row) return null;
  const isApproved = row.state === "approved";
  const isDeclined = row.state === "declined";

  return (
    <DrawerShell
      open={!!row}
      onOpenChange={(o) => !o && onClose()}
      title="Review leave request"
      description={`${row.n} · ${row.dept}`}
      meta={
        isApproved ? (
          <StatusBadge tone="success">Approved</StatusBadge>
        ) : isDeclined ? (
          <StatusBadge tone="danger">Declined</StatusBadge>
        ) : (
          <StatusBadge tone="warning">Pending</StatusBadge>
        )
      }
      footer={
        isApproved || isDeclined ? (
          <ActionButton onClick={onClose}>Close</ActionButton>
        ) : (
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
              Approve
            </ActionButton>
          </>
        )
      }
    >
      <FormSection title="Request">
        <dl className="divide-y divide-border">
          <DetailRow label="Type" value={row.type} />
          <DetailRow label="Dates" value={`${row.date} (${row.days} days)`} />
          <DetailRow label="Remaining balance" value={row.balance} />
          <DetailRow label="Submitted" value={row.submitted} />
        </dl>
      </FormSection>
      <FormSection title="Cover impact">
        <p className="text-xs text-muted-foreground">{row.coverNote}</p>
      </FormSection>
      <FormSection title="Manager note">
        <FormRow label="Reply to staff member" htmlFor="leave-manager-note">
          <textarea
            id="leave-manager-note"
            className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Optional message..."
          />
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
