import * as React from "react";
import { toast } from "sonner";
import { ActionButton, DrawerShell, FormRow, FormSection } from "@/components/dl";
import { createLeaveRequest } from "@/features/demo/store/leaveActions";
import { useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import {
  buildLeaveManagerNotification,
  buildLeaveRequest,
  type LeaveStaffOption,
} from "@/features/leave/lib/leaveRequests";
import { mockProfile } from "../data/mockPortalData";

const PORTAL_STAFF: LeaveStaffOption = {
  id: mockProfile.staffId,
  name: mockProfile.name,
  role: mockProfile.role,
  dept: "Front of House",
  img: 16,
};

export function PortalLeaveRequestDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const store = useWorkspaceStore();
  const [startIso, setStartIso] = React.useState("2026-06-19");
  const [endIso, setEndIso] = React.useState("2026-06-21");
  const [leaveType, setLeaveType] = React.useState("Annual leave");
  const [reason, setReason] = React.useState("");

  const submit = () => {
    const request = buildLeaveRequest({
      staff: PORTAL_STAFF,
      startIso,
      endIso,
      type: leaveType,
      reason,
      source: "portal",
    });
    createLeaveRequest(store, request, buildLeaveManagerNotification(request));
    onOpenChange(false);
    setReason("");
    toast.success("Leave request submitted", {
      description: "Your manager can now review it in Docklist.",
    });
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="New time-off request"
      description="Your request stays pending until a manager reviews it."
      width="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton onClick={submit}>Submit request</ActionButton>
        </>
      }
    >
      <FormSection title="Details">
        <FormRow label="Type">
          <select
            value={leaveType}
            onChange={(event) => setLeaveType(event.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option>Annual leave</option>
            <option>Sick leave</option>
            <option>Compassionate leave</option>
            <option>Unpaid leave</option>
          </select>
        </FormRow>
        <FormRow label="From">
          <input
            type="date"
            value={startIso}
            onChange={(event) => setStartIso(event.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </FormRow>
        <FormRow label="To">
          <input
            type="date"
            value={endIso}
            onChange={(event) => setEndIso(event.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </FormRow>
        <FormRow label="Note">
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Add a short note about your request"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
