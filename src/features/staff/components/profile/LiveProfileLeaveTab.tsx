import * as React from "react";
import { Plus } from "lucide-react";
import { ActionButton } from "@/components/dl";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { RecordAbsenceDialog } from "@/features/leave/components/RecordAbsenceDialog";
import { LiveLeaveList } from "./LiveLeaveList";
import { StaffRecurringDaysOffCard } from "./StaffRecurringDaysOffCard";
import { StaffOneOffUnavailabilityCard } from "./StaffOneOffUnavailabilityCard";
import type { useLiveStaffProfileOps } from "../../hooks/useLiveStaffProfileOps";

interface Props {
  staffMemberId: string;
  firstName: string;
  ops: ReturnType<typeof useLiveStaffProfileOps>;
}

/**
 * Leave tab for a live staff member: real leave history, availability cards, and
 * the shared record-absence action preselected to this person.
 */
export function LiveProfileLeaveTab({ staffMemberId, firstName, ops }: Props) {
  const [absenceOpen, setAbsenceOpen] = React.useState(false);
  const { workspaceId } = useManagerIdentity();

  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <ActionButton size="sm" icon={Plus} onClick={() => setAbsenceOpen(true)}>
          Record absence
        </ActionButton>
      </div>
      <LiveLeaveList ops={ops} firstName={firstName} />
      <StaffRecurringDaysOffCard staffMemberId={staffMemberId} firstName={firstName} />
      <StaffOneOffUnavailabilityCard staffMemberId={staffMemberId} firstName={firstName} />

      <RecordAbsenceDialog
        open={absenceOpen}
        onOpenChange={setAbsenceOpen}
        workspaceId={workspaceId}
        defaultStaffMemberId={staffMemberId}
      />
    </div>
  );
}
