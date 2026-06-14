import * as React from "react";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { ActionButton, DrawerShell, FormRow, FormSection } from "@/components/dl";
import { createLeaveRequest } from "@/features/demo/store/leaveActions";
import { useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import {
  buildLeaveManagerNotification,
  buildLeaveRequest,
  type LeaveStaffOption,
} from "@/features/leave/lib/leaveRequests";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { mockProfile } from "../data/mockPortalData";
import { submitLeaveRequestFn } from "../api/portalActions";

const PORTAL_STAFF: LeaveStaffOption = {
  id: mockProfile.staffId,
  name: mockProfile.name,
  role: mockProfile.role,
  dept: "Front of House",
  img: 16,
};

const portalRouteApi = getRouteApi("/portal");

/** UI leave-type labels → the RPC's `leave_type` enum. */
const LEAVE_TYPE_TO_RPC: Record<string, "annual_leave" | "personal" | "sick" | "unpaid" | "other"> =
  {
    "Annual leave": "annual_leave",
    "Sick leave": "sick",
    "Compassionate leave": "personal",
    "Unpaid leave": "unpaid",
  };

export function PortalLeaveRequestDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const store = useWorkspaceStore();
  const { auth } = portalRouteApi.useRouteContext();
  const [startIso, setStartIso] = React.useState("2026-06-19");
  const [endIso, setEndIso] = React.useState("2026-06-21");
  const [leaveType, setLeaveType] = React.useState("Annual leave");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Live submissions persist through the RPC; the demo path mutates the
  // WorkspaceStore so the Harbour View playground keeps working offline.
  const liveWorkspaceId =
    Boolean(getSupabaseEnv()) && auth.status === "member" && auth.role === "staff"
      ? auth.workspaceId
      : null;

  const echoToStore = () => {
    const request = buildLeaveRequest({
      staff: PORTAL_STAFF,
      startIso,
      endIso,
      type: leaveType,
      reason,
      source: "portal",
    });
    createLeaveRequest(store, request, buildLeaveManagerNotification(request));
  };

  const close = () => {
    onOpenChange(false);
    setReason("");
  };

  const submit = async () => {
    if (submitting) return;

    if (!liveWorkspaceId) {
      echoToStore();
      close();
      toast.success("Leave request submitted", {
        description: "Your manager can now review it in Docklist.",
      });
      return;
    }

    if (reason.trim().length === 0) {
      toast.error("Add a note", { description: "A short reason is required for your request." });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitLeaveRequestFn({
        data: {
          workspaceId: liveWorkspaceId,
          leaveType: LEAVE_TYPE_TO_RPC[leaveType] ?? "other",
          startDate: startIso,
          endDate: endIso,
          reason: reason.trim(),
        },
      });

      if (!result.ok) {
        toast.error("Couldn't submit request", { description: result.message });
        return;
      }

      // Reflect the persisted request in the local history list immediately.
      echoToStore();
      close();
      toast.success("Leave request submitted", {
        description: "Your manager can now review it in Docklist.",
      });
    } catch (error) {
      console.error("submitLeaveRequestFn failed:", error);
      toast.error("Couldn't submit request", { description: "Please try again." });
    } finally {
      setSubmitting(false);
    }
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
          <ActionButton onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit request"}
          </ActionButton>
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
